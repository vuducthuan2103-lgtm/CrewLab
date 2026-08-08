import re
import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, SecretStr, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.api.schemas import ApiResponse, ErrorDetail
from app.core.auth import AuthContext, require_agency_admin
from app.core.db import engine
from app.core.model_catalog import MODEL_CATALOG, SUPPORTED_PROVIDERS
from app.models.clients import BrandSetting, Client
from app.services.portal_accounts import PortalAccountError, create_portal_admin
from app.services.provider_credentials import (
    ProviderConfigurationError,
    activate_client,
    list_provider_credentials,
    provider_public_dict,
    retest_credential,
    save_validated_credential,
    set_provider_enabled,
)


router = APIRouter(prefix="/api/v1/internal", tags=["internal"])
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def get_internal_db():
    async with AsyncSessionLocal() as session:
        yield session


class ClientCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    brand_name: str = Field(min_length=1, max_length=200)
    industry: str | None = Field(default=None, max_length=100)
    timezone: str = Field(default="Asia/Ho_Chi_Minh", max_length=100)
    platforms: list[Literal["facebook", "instagram"]] = Field(
        default_factory=lambda: ["facebook"], min_length=1, max_length=2
    )


class CredentialSaveRequest(BaseModel):
    api_key: SecretStr
    idempotency_key: uuid.UUID


class ProviderEnabledRequest(BaseModel):
    is_enabled: bool
    confirm_affected_agents: bool = False
    idempotency_key: uuid.UUID


class ClientActivationRequest(BaseModel):
    is_active: bool
    idempotency_key: uuid.UUID


class PortalAdminCreateRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: SecretStr

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("A valid email address is required")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: SecretStr) -> SecretStr:
        password = value.get_secret_value()
        if len(password) < 12:
            raise ValueError("Password must be at least 12 characters")
        if not any(char.islower() for char in password):
            raise ValueError("Password must include a lowercase letter")
        if not any(char.isupper() for char in password):
            raise ValueError("Password must include an uppercase letter")
        if not any(char.isdigit() for char in password):
            raise ValueError("Password must include a number")
        return value


def _domain_error(error: ProviderConfigurationError | PortalAccountError) -> JSONResponse:
    status = 404 if error.code in {"CLIENT_NOT_FOUND", "CREDENTIAL_NOT_FOUND"} else 409
    payload = ApiResponse(
        success=False,
        error=ErrorDetail(
            error_code=error.code, message=str(error), details=error.details or None
        ),
    )
    return JSONResponse(status_code=status, content=payload.model_dump(mode="json"))


def _client_dict(client: Client) -> dict:
    return {
        "id": str(client.id),
        "name": client.name,
        "brand_name": client.brand_name,
        "industry": client.industry,
        "timezone": client.timezone,
        "platforms": client.platforms or [],
        "is_active": client.is_active,
        "created_at": client.created_at.isoformat(),
    }


def _provider_config_dict(item: dict) -> dict:
    """Return the complete provider shape expected by Internal App after mutations."""
    result = dict(item)
    result["models"] = [
        {
            "id": model.id,
            "label": model.label,
            "tier": model.tier,
            "capabilities": sorted(model.capabilities),
            "eligible_agents": sorted(model.eligible_agents),
        }
        for model in MODEL_CATALOG
        if model.provider == result["provider"]
    ]
    return result


@router.get("/clients")
async def list_clients(
    _auth: AuthContext = Depends(require_agency_admin),
    db: AsyncSession = Depends(get_internal_db),
):
    clients = (
        await db.scalars(select(Client).order_by(Client.created_at.desc()))
    ).all()
    return ApiResponse(success=True, data=[_client_dict(client) for client in clients])


@router.post("/clients", status_code=201)
async def create_client(
    req: ClientCreateRequest,
    _auth: AuthContext = Depends(require_agency_admin),
    db: AsyncSession = Depends(get_internal_db),
):
    client = Client(
        name=req.name.strip(),
        brand_name=req.brand_name.strip(),
        industry=req.industry.strip() if req.industry else None,
        timezone=req.timezone,
        platforms=req.platforms,
        is_active=False,
    )
    db.add(client)
    await db.flush()
    # Every client needs one current Brand Settings version before its Portal
    # becomes usable. The client can complete the optional voice fields later.
    db.add(
        BrandSetting(
            client_id=client.id,
            is_current=True,
            brand_voice_short=client.brand_name,
            avoid_phrases=[],
            personality_keywords=[],
        )
    )
    await db.commit()
    await db.refresh(client)
    return ApiResponse(success=True, data=_client_dict(client))


@router.get("/clients/{client_id}/providers")
async def get_client_providers(
    client_id: uuid.UUID,
    _auth: AuthContext = Depends(require_agency_admin),
    db: AsyncSession = Depends(get_internal_db),
):
    try:
        configured = {
            row.provider: provider_public_dict(row)
            for row in await list_provider_credentials(db, client_id)
        }
    except ProviderConfigurationError as error:
        return _domain_error(error)
    providers = []
    for provider in sorted(SUPPORTED_PROVIDERS):
        item = configured.get(
            provider,
            {
                "provider": provider,
                "key_hint": None,
                "is_enabled": False,
                "validation_status": "missing",
                "last_tested_at": None,
                "last_test_error": None,
            },
        )
        providers.append(_provider_config_dict(item))
    return ApiResponse(success=True, data={"providers": providers})


@router.put("/clients/{client_id}/providers/{provider}")
async def put_client_provider(
    client_id: uuid.UUID,
    provider: str,
    req: CredentialSaveRequest,
    auth: AuthContext = Depends(require_agency_admin),
    db: AsyncSession = Depends(get_internal_db),
):
    try:
        row = await save_validated_credential(
            db,
            client_id,
            provider,
            req.api_key.get_secret_value(),
            auth.user_id,
        )
    except ProviderConfigurationError as error:
        return _domain_error(error)
    return ApiResponse(success=True, data=_provider_config_dict(provider_public_dict(row)))


@router.post("/clients/{client_id}/providers/{provider}/test")
async def test_client_provider(
    client_id: uuid.UUID,
    provider: str,
    auth: AuthContext = Depends(require_agency_admin),
    db: AsyncSession = Depends(get_internal_db),
):
    try:
        row = await retest_credential(db, client_id, provider, auth.user_id)
    except ProviderConfigurationError as error:
        return _domain_error(error)
    return ApiResponse(success=True, data=_provider_config_dict(provider_public_dict(row)))


@router.patch("/clients/{client_id}/providers/{provider}")
async def patch_client_provider(
    client_id: uuid.UUID,
    provider: str,
    req: ProviderEnabledRequest,
    auth: AuthContext = Depends(require_agency_admin),
    db: AsyncSession = Depends(get_internal_db),
):
    try:
        row = await set_provider_enabled(
            db,
            client_id,
            provider,
            req.is_enabled,
            auth.user_id,
            confirm_affected_agents=req.confirm_affected_agents,
        )
    except ProviderConfigurationError as error:
        return _domain_error(error)
    return ApiResponse(success=True, data=_provider_config_dict(provider_public_dict(row)))


@router.patch("/clients/{client_id}/activation")
async def patch_client_activation(
    client_id: uuid.UUID,
    req: ClientActivationRequest,
    auth: AuthContext = Depends(require_agency_admin),
    db: AsyncSession = Depends(get_internal_db),
):
    if not req.is_active:
        client = await db.get(Client, client_id)
        if client is None:
            return _domain_error(
                ProviderConfigurationError("Client not found", code="CLIENT_NOT_FOUND")
            )
        client.is_active = False
        await db.commit()
        return ApiResponse(success=True, data=_client_dict(client))
    try:
        client = await activate_client(db, client_id, auth.user_id)
    except ProviderConfigurationError as error:
        return _domain_error(error)
    return ApiResponse(success=True, data=_client_dict(client))


@router.post("/clients/{client_id}/portal-admin", status_code=201)
async def create_client_portal_admin(
    client_id: uuid.UUID,
    req: PortalAdminCreateRequest,
    auth: AuthContext = Depends(require_agency_admin),
    db: AsyncSession = Depends(get_internal_db),
):
    try:
        account = await create_portal_admin(
            db,
            client_id=client_id,
            email=req.email,
            password=req.password.get_secret_value(),
            actor_id=auth.user_id,
        )
    except PortalAccountError as error:
        return _domain_error(error)
    return ApiResponse(
        success=True,
        data={"auth_user_id": str(account.auth_user_id), "email": account.email},
    )
