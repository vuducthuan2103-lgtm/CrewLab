"""Acceptance coverage for Spec 0015 storage and Spec 0017 semantic assets."""
from io import BytesIO
from pathlib import Path
import base64
import hashlib
import sys
import types
import uuid

import pytest
from fastapi import HTTPException
from PIL import Image
from sqlalchemy import select
from starlette.requests import Request

from app.agents.d02 import tools as d02_tools
from app.agents.d02.executor import execute_d02
from app.api import portal_router
from app.core import llm
from app.core.auth import AuthContext
from app.core.llm import ImageGenerationResponse
from app.models.assets import BrandAsset, SemanticAssetRecord, VisualSelectionDecision
from app.models.clients import Client
from app.models.content import ContentItem
from app.services import asset_semantics, storage
from app.services.context_packet import build_context_packet
from app.services.asset_service import (
    ImageUploadValidationError,
    find_duplicate_source,
    inspect_image_upload,
)
from scripts.seed_bardinh import seed_bardinh


def _png_bytes(
    size: tuple[int, int] = (640, 640), color: tuple[int, int, int] = (120, 80, 40)
) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def _raw_image_request(body: bytes, *, rights_attested: bool = True) -> Request:
    delivered = False

    async def receive():
        nonlocal delivered
        if delivered:
            return {"type": "http.disconnect"}
        delivered = True
        return {"type": "http.request", "body": body, "more_body": False}

    headers = [(b"content-type", b"image/png"), (b"x-file-name", b"replacement.png")]
    if rights_attested:
        headers.append((b"x-asset-rights-attested", b"true"))
    return Request({"type": "http", "method": "POST", "path": "/", "headers": headers}, receive)


def test_upload_validation_decodes_bytes_and_rejects_spoofed_content_type():
    inspection = inspect_image_upload(_png_bytes(), "image/png")
    assert inspection.dimensions == "640x640"
    assert inspection.is_d02_resolution is True

    with pytest.raises(ImageUploadValidationError) as corrupt:
        inspect_image_upload(b"not-an-image", "image/jpeg")
    assert corrupt.value.code == "invalid_image_data"

    with pytest.raises(ImageUploadValidationError) as mismatch:
        inspect_image_upload(_png_bytes(), "image/jpeg")
    assert mismatch.value.code == "image_type_mismatch"


def test_delete_files_calls_exact_bucket_objects(monkeypatch):
    removed: list[str] = []

    class FakeBucket:
        def remove(self, paths):
            removed.extend(paths)

    class FakeStorage:
        def from_(self, bucket_name):
            assert bucket_name == "brand-assets"
            return FakeBucket()

    class FakeClient:
        storage = FakeStorage()

    monkeypatch.setattr(storage, "supabase_client", FakeClient())
    assert storage.delete_files("brand-assets", ["client/originals/a.png"]) is True
    assert removed == ["client/originals/a.png"]


@pytest.mark.asyncio
async def test_same_client_duplicate_reuses_source_only(db_session):
    client, _ = await seed_bardinh(db_session)
    fingerprint = "a" * 64
    source = BrandAsset(
        client_id=client.id,
        url="source.png",
        storage_path="client/originals/source.png",
        source="client_uploaded",
        status="approved",
        usage_rights="client_owned",
        content_sha256=fingerprint,
    )
    derivative = BrandAsset(
        client_id=client.id,
        url="derivative.png",
        source="d02_ai_derivative",
        status="approved",
        usage_rights="client_derivative",
        content_sha256=fingerprint,
    )
    db_session.add_all([source, derivative])
    await db_session.commit()

    duplicate = await find_duplicate_source(
        db_session, client_id=client.id, content_sha256=fingerprint
    )
    assert duplicate is not None
    assert duplicate.id == source.id


@pytest.mark.asyncio
async def test_semantic_index_persists_versioned_vector(monkeypatch, db_session):
    client, _ = await seed_bardinh(db_session)
    asset = BrandAsset(
        client_id=client.id,
        url="original.png",
        storage_path=f"{client.id}/originals/original.png",
        source="client_uploaded",
        status="approved",
        usage_rights="client_owned",
        content_sha256="b" * 64,
    )
    db_session.add(asset)
    await db_session.commit()
    monkeypatch.setattr(asset_semantics, "get_signed_url", lambda *_args, **_kwargs: "https://example.test/source.png")
    monkeypatch.setattr(
        asset_semantics, "download_file", lambda *_args, **_kwargs: _png_bytes()
    )

    record = await asset_semantics.index_asset_semantics(
        db_session, client_id=client.id, asset_id=asset.id
    )
    assert record.status == "ready"
    assert record.embedding_version == "mock-feature-hash:1536:semantic-visual-composite-v2"
    assert record.search_text and "primary_subjects" in record.search_text
    assert len(record.embedding) == 1536


@pytest.mark.asyncio
async def test_multimodal_composite_changes_with_pixels_and_matches_query_version(db_session):
    client, _ = await seed_bardinh(db_session)
    description = "cold brew product on a clean cafe table"

    query = await llm.create_asset_embedding(
        session=db_session,
        client_id=client.id,
        text_value=description,
    )
    red_asset = await llm.create_asset_embedding(
        session=db_session,
        client_id=client.id,
        text_value=description,
        source_image_bytes=_png_bytes(color=(220, 30, 30)),
    )
    blue_asset = await llm.create_asset_embedding(
        session=db_session,
        client_id=client.id,
        text_value=description,
        source_image_bytes=_png_bytes(color=(30, 30, 220)),
    )

    assert query.version == red_asset.version == blue_asset.version
    assert "semantic-visual-composite-v2" in query.version
    assert len(query.embedding) == len(red_asset.embedding) == len(blue_asset.embedding) == 1536
    assert red_asset.embedding != blue_asset.embedding
    query_similarity = sum(
        query_value * asset_value
        for query_value, asset_value in zip(query.embedding, red_asset.embedding)
    )
    assert query_similarity > 0.95


@pytest.mark.asyncio
async def test_asset_replacement_preserves_old_until_new_semantics_are_ready(
    monkeypatch, db_session
):
    client, _ = await seed_bardinh(db_session)
    old_bytes = _png_bytes(color=(100, 60, 20))
    new_bytes = _png_bytes(color=(20, 100, 160))
    old = BrandAsset(
        client_id=client.id,
        url="old.png",
        storage_path=f"{client.id}/originals/old.png",
        source="client_uploaded",
        status="approved",
        usage_rights="client_owned",
        content_sha256=hashlib.sha256(old_bytes).hexdigest(),
    )
    db_session.add(old)
    await db_session.flush()
    old_semantic = SemanticAssetRecord(
        client_id=client.id,
        source_asset_id=old.id,
        status="ready",
        analysis_version=asset_semantics.ANALYSIS_VERSION,
        embedding_version="old:v1",
        embedding=[0.0] * 1536,
    )
    db_session.add(old_semantic)
    await db_session.commit()
    monkeypatch.setattr(portal_router, "upload_file", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(portal_router, "get_signed_url", lambda *_args, **_kwargs: "signed")
    monkeypatch.setattr(portal_router.celery_app, "send_task", lambda *_args, **_kwargs: None)

    response = await portal_router.replace_portal_asset(
        old.id,
        _raw_image_request(new_bytes),
        AuthContext(uuid.uuid4(), client.id, "client_admin"),
        db_session,
    )
    replacement = await db_session.get(BrandAsset, response.data.id)
    assert replacement.replaces_asset_id == old.id
    assert await db_session.get(BrandAsset, old.id) is not None
    await db_session.refresh(old_semantic)
    assert old_semantic.status == "ready"

    monkeypatch.setattr(asset_semantics, "download_file", lambda *_args, **_kwargs: new_bytes)
    monkeypatch.setattr(asset_semantics, "get_signed_url", lambda *_args, **_kwargs: "https://example.test/new.png")
    new_semantic = await asset_semantics.index_asset_semantics(
        db_session, client_id=client.id, asset_id=replacement.id
    )
    await db_session.refresh(old_semantic)
    assert new_semantic.status == "ready"
    assert old_semantic.status == "superseded"
    assert old_semantic.failure_reason == f"superseded_by:{replacement.id}"


@pytest.mark.asyncio
async def test_asset_replacement_is_tenant_scoped_and_dispatch_failure_keeps_old_ready(
    monkeypatch, db_session
):
    owner, _ = await seed_bardinh(db_session)
    other = Client(name="Other", brand_name="Other", is_active=True)
    old = BrandAsset(
        client_id=owner.id,
        url="old.png",
        storage_path=f"{owner.id}/originals/old.png",
        source="client_uploaded",
        status="approved",
        usage_rights="client_owned",
        content_sha256="a" * 64,
    )
    db_session.add_all([other, old])
    await db_session.flush()
    old_semantic = SemanticAssetRecord(
        client_id=owner.id,
        source_asset_id=old.id,
        status="ready",
        embedding_version="old:v1",
        embedding=[0.0] * 1536,
    )
    db_session.add(old_semantic)
    await db_session.commit()

    with pytest.raises(HTTPException) as cross_tenant:
        await portal_router.replace_portal_asset(
            old.id,
            _raw_image_request(_png_bytes(color=(1, 2, 3))),
            AuthContext(uuid.uuid4(), other.id, "client_admin"),
            db_session,
        )
    assert cross_tenant.value.status_code == 404

    monkeypatch.setattr(portal_router, "upload_file", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(portal_router, "get_signed_url", lambda *_args, **_kwargs: "signed")
    monkeypatch.setattr(
        portal_router.celery_app,
        "send_task",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(ConnectionError("broker down")),
    )
    response = await portal_router.replace_portal_asset(
        old.id,
        _raw_image_request(_png_bytes(color=(4, 5, 6))),
        AuthContext(uuid.uuid4(), owner.id, "client_admin"),
        db_session,
    )
    await db_session.refresh(old_semantic)
    assert response.data.indexing_status == "failed"
    assert old_semantic.status == "ready"


@pytest.mark.asyncio
async def test_d02_retry_appends_visual_selection_decision_history(db_session):
    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Keep both visual decisions",
        platform="facebook",
        status="visual_matching",
        image_brief={
            "description": "A coffee product",
            "mood": "warm",
            "suggested_tags": ["unique-no-match"],
            "composition_notes": "square product shot",
            "avoid": [],
            "visual_mode": "visual_required",
        },
    )
    db_session.add(item)
    await db_session.commit()
    packet = (await build_context_packet(db_session, client.id)).model_dump()
    first = await execute_d02(
        db_session, client.id, cycle.id, item.id, packet, "task_assigned"
    )
    first_derivative = first.image_brief["d02_provenance"]["derivative_asset_id"]
    await execute_d02(
        db_session,
        client.id,
        cycle.id,
        item.id,
        {**packet, "failed_criteria": ["visual_asset_fit"], "fix_instructions": "Use a different visual"},
        "retry",
    )
    decisions = (
        await db_session.scalars(
            select(VisualSelectionDecision)
            .where(
                VisualSelectionDecision.client_id == client.id,
                VisualSelectionDecision.content_item_id == item.id,
            )
            .order_by(VisualSelectionDecision.run_number)
        )
    ).all()
    assert [decision.run_number for decision in decisions] == [1, 2]
    assert str(decisions[0].derivative_asset_id) == first_derivative
    assert decisions[1].derivative_asset_id != decisions[0].derivative_asset_id
    assert decisions[1].wake_reason == "retry"
    output = await portal_router._content_item_out(db_session, item)
    assert [entry["run_number"] for entry in output.image_provenance_history] == [1, 2]


@pytest.mark.asyncio
async def test_hybrid_retrieval_requires_ready_rights_and_same_client(db_session):
    client, _ = await seed_bardinh(db_session)
    query = "cold brew cafe natural light"
    from app.core.llm import create_asset_embedding

    embedding = await create_asset_embedding(
        session=db_session,
        client_id=client.id,
        text_value=query,
    )
    eligible = BrandAsset(
        client_id=client.id,
        url="eligible.png",
        storage_path="client/originals/eligible.png",
        tags=["cold brew", "cafe"],
        source="client_uploaded",
        status="approved",
        usage_rights="client_owned",
    )
    unknown_rights = BrandAsset(
        client_id=client.id,
        url="unknown.png",
        tags=["cold brew"],
        source="client_uploaded",
        status="approved",
        usage_rights="unknown",
    )
    db_session.add_all([eligible, unknown_rights])
    await db_session.flush()
    db_session.add_all([
        SemanticAssetRecord(
            client_id=client.id,
            source_asset_id=eligible.id,
            status="ready",
            embedding_version=embedding.version,
            embedding=embedding.embedding,
            semantic_summary=query,
            suggested_tags=["cold brew", "cafe"],
            technical_quality={"usable": True},
            editability={"score": 0.9},
            safety={"safe": True},
        ),
        SemanticAssetRecord(
            client_id=client.id,
            source_asset_id=unknown_rights.id,
            status="ready",
            embedding_version=embedding.version,
            embedding=embedding.embedding,
            semantic_summary=query,
            suggested_tags=["cold brew"],
        ),
    ])
    await db_session.commit()

    exclusions = []
    results = await d02_tools.query_media_library(
        db_session,
        client.id,
        ["cold brew"],
        visual_intent_text=query,
        exclusion_audit=exclusions,
    )
    assert [asset.id for asset in results] == [eligible.id]
    assert {entry["asset_id"]: entry["reason"] for entry in exclusions}[
        str(unknown_rights.id)
    ] == "usage_rights_ineligible"


@pytest.mark.asyncio
async def test_derivative_uses_source_pixels_and_persists_private_object(monkeypatch, db_session):
    client, _ = await seed_bardinh(db_session)
    source_bytes = _png_bytes()
    generated_bytes = _png_bytes((1024, 1024))
    source = BrandAsset(
        client_id=client.id,
        url="source.png",
        storage_path=f"{client.id}/originals/source.png",
        file_name="source.png",
        format="image/png",
        source="client_uploaded",
        status="approved",
        usage_rights="client_owned",
    )
    db_session.add(source)
    await db_session.commit()
    captured = {}

    monkeypatch.setattr(d02_tools, "download_file", lambda *_args: source_bytes)

    async def fake_generate_image(**kwargs):
        captured.update(kwargs)
        return ImageGenerationResponse(
            image_url="provider-binary://generated",
            image_bytes=generated_bytes,
            model_used="image-model",
            provider="openai",
        )

    def fake_upload(bucket, path, payload, content_type):
        captured.update(bucket=bucket, path=path, payload=payload, content_type=content_type)
        return True

    monkeypatch.setattr(d02_tools, "generate_image", fake_generate_image)
    monkeypatch.setattr(d02_tools, "upload_file", fake_upload)
    derivative = await d02_tools.generate_image_ai(
        db_session,
        client.id,
        "Brighten the supplied product image",
        source_asset_id=source.id,
        generation_mode="minimal_edit",
    )

    assert captured["source_image_bytes"] == source_bytes
    assert captured["generation_mode"] == "minimal_edit"
    assert captured["bucket"] == "brand-assets"
    assert f"{client.id}/derivatives/" in captured["path"]
    assert derivative.storage_path == captured["path"]
    assert derivative.url == derivative.storage_path
    assert derivative.source_asset_id == source.id
    assert derivative.file_name.endswith(".png")


@pytest.mark.asyncio
async def test_content_api_signs_derivative_without_persisting_signed_url(monkeypatch, db_session):
    client, cycle = await seed_bardinh(db_session)
    derivative = BrandAsset(
        client_id=client.id,
        url=f"{client.id}/derivatives/final.png",
        storage_path=f"{client.id}/derivatives/final.png",
        source="d02_ai_derivative",
        status="approved",
        usage_rights="client_derivative",
    )
    db_session.add(derivative)
    await db_session.flush()
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Cold brew",
        platform="facebook",
        status="pending_content_approval",
        image_url=derivative.storage_path,
        image_brief={
            "visual_mode": "visual_required",
            "d02_provenance": {"derivative_asset_id": str(derivative.id)},
        },
    )
    db_session.add(item)
    await db_session.commit()
    monkeypatch.setattr(
        portal_router,
        "get_signed_url",
        lambda *_args, **_kwargs: "https://signed.example.test/final.png",
    )

    output = await portal_router._content_item_out(db_session, item)
    assert output.image_url == "https://signed.example.test/final.png"
    assert item.image_url == derivative.storage_path


def test_semantic_rls_is_client_read_only():
    root = Path(__file__).resolve().parents[1]
    migration = (root / "alembic/versions/0014_remove_asset_requests_add_semantic_assets.py").read_text(encoding="utf-8")
    deploy_sql = (root / "full_deploy.sql").read_text(encoding="utf-8")
    assert "ON semantic_asset_records FOR SELECT TO authenticated" in migration
    client_policy = migration.split("Clients can view their own semantic_asset_records", 1)[1]
    assert "ON semantic_asset_records FOR ALL TO authenticated" not in client_policy
    assert 'CREATE POLICY "Clients can view their own semantic_asset_records"' in deploy_sql
    assert "FOR SELECT TO authenticated" in deploy_sql


def test_asset_semantic_schema_is_openai_strict_compatible():
    schema = asset_semantics.AssetSemanticOutput.model_json_schema()
    for field in ("technical_quality", "editability", "safety", "confidence"):
        definition_name = schema["properties"][field]["$ref"].rsplit("/", 1)[-1]
        assert schema["$defs"][definition_name]["additionalProperties"] is False


def test_visual_decision_rls_is_tenant_select_only():
    root = Path(__file__).resolve().parents[1]
    migration = (
        root / "alembic/versions/0015_visual_decision_audit_and_asset_replacement.py"
    ).read_text(encoding="utf-8")
    assert "ON visual_selection_decisions FOR SELECT TO authenticated" in migration
    client_policy = migration.split(
        "Clients can view their own visual_selection_decisions", 1
    )[1]
    assert "ON visual_selection_decisions FOR ALL TO authenticated" not in client_policy
    assert "client_id::text" in client_policy


@pytest.mark.asyncio
async def test_generate_image_routes_source_pixels_to_aimage_edit(monkeypatch):
    calls = {}
    config = types.SimpleNamespace(
        provider="openai", model="gpt-image-1", is_active=True
    )
    credential = types.SimpleNamespace(encrypted_api_key="encrypted")

    class FakeSession:
        def __init__(self):
            self.results = iter([config, credential])

        async def scalar(self, _statement):
            return next(self.results)

    async def fake_edit(**kwargs):
        calls.update(kwargs)
        return types.SimpleNamespace(
            data=[types.SimpleNamespace(
                url=None,
                b64_json=base64.b64encode(_png_bytes()).decode("ascii"),
            )]
        )

    async def fail_generation(**_kwargs):
        raise AssertionError("source-guided mode must not use aimage_generation")

    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    monkeypatch.setattr(
        llm,
        "get_credential_cipher",
        lambda: types.SimpleNamespace(decrypt=lambda _value: "secret"),
    )
    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aimage_edit=fake_edit, aimage_generation=fail_generation),
    )
    response = await llm.generate_image(
        session=FakeSession(),
        client_id=uuid.uuid4(),
        prompt="Keep the product, brighten the background",
        source_image_bytes=_png_bytes(),
        source_file_name="source.png",
        source_content_type="image/png",
        generation_mode="minimal_edit",
    )
    assert calls["image"].name == "source.png"
    assert calls["image"].read() == _png_bytes()
    assert "response_format" not in calls
    assert response.image_bytes == _png_bytes()
