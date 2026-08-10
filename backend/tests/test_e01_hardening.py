"""Regression tests for E01 validation, isolation, and retry hardening."""
import os
import sys
import types
import uuid

import pytest
from cryptography.fernet import Fernet
from pydantic import ValidationError
from sqlalchemy import select

from app.agents.a01.dispatcher import handle_event
from app.agents.e01.executor import ContentItemNotFoundError, _resolve_image_url, execute_e01
from app.agents.e01.schemas import CaptionEval, E01Output, VisualEval
from app.core.llm import call_llm
from app.core import db as db_module
from app.core.credentials import CredentialCipher
from app.models.clients import BrandSetting, Client
from app.models.content import ContentItem, ContentItemEvalAttempt, ContentPillar, WorkflowCycle
from app.models.system import TaskLog
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential


async def _create_content_item(session, *, name: str = "Test Cafe"):
    client = Client(name=name, brand_name=name, is_active=True)
    session.add(client)
    await session.flush()
    session.add(
        BrandSetting(
            client_id=client.id,
            is_current=True,
            brand_voice_short="Thân thiện",
            tone_of_voice="Ấm áp",
            target_audience="Khách trẻ",
            allow_ai_images=False,
        )
    )
    cycle = WorkflowCycle(client_id=client.id, phase="content_production", status="active")
    session.add(cycle)
    await session.flush()
    pillar = ContentPillar(
        client_id=client.id,
        cycle_id=cycle.id,
        name="Product Spotlight",
        description="Giới thiệu sản phẩm",
    )
    session.add(pillar)
    await session.flush()
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        pillar_id=pillar.id,
        topic="Cold Brew",
        platform="facebook",
        status="visual_generating",
        caption="Cold Brew mát lạnh.",
        image_brief={"description": "Ly cold brew"},
        image_url="https://example.com/coldbrew.jpg",
    )
    session.add(item)
    await session.commit()
    return client, cycle, item


def test_caption_eval_rejects_inconsistent_score_and_passed_flag():
    with pytest.raises(ValidationError):
        CaptionEval(score=9.0, passed=False)


def test_e01_output_rejects_unknown_criterion_and_inconsistent_overall_status():
    with pytest.raises(ValidationError):
        CaptionEval(score=5.0, passed=False, failed_criteria=["made_up"], fix_instructions="Sửa lại")

    with pytest.raises(ValidationError):
        E01Output(
            caption_eval=CaptionEval(score=8.0, passed=True),
            visual_eval=VisualEval(
                score=2.0,
                passed=False,
                failed_criteria=["visual_asset_fit"],
                fix_instructions="Cần ảnh phù hợp hơn",
            ),
            overall_passed=True,
        )


@pytest.mark.asyncio
async def test_execute_e01_forces_visual_failure_when_no_image(db_session):
    client, cycle, item = await _create_content_item(db_session)
    item.image_url = None
    await db_session.commit()

    result = await execute_e01(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet={"identity": {}, "episodic": []},
    )

    assert result.status == "eval_failed"
    assert result.eval_score_visual == 0.0
    assert set(result.failed_criteria) >= {
        "visual_asset_fit",
        "image_design_quality",
        "mobile_readability",
    }


@pytest.mark.asyncio
async def test_resolve_image_url_signs_storage_paths(monkeypatch):
    captured = {}

    def fake_get_signed_url(bucket, path, expires_in):
        captured.update(bucket=bucket, path=path, expires_in=expires_in)
        return "https://signed.example/image.jpg"

    monkeypatch.setattr("app.agents.e01.executor.get_signed_url", fake_get_signed_url)

    assert await _resolve_image_url("/client-1/image.jpg") == "https://signed.example/image.jpg"
    assert captured == {
        "bucket": "brand-assets",
        "path": "client-1/image.jpg",
        "expires_in": 300,
    }


@pytest.mark.asyncio
async def test_execute_e01_rejects_content_item_from_another_client(db_session):
    owner, cycle, item = await _create_content_item(db_session, name="Owner")
    other_client, _, _ = await _create_content_item(db_session, name="Other")

    with pytest.raises(ContentItemNotFoundError):
        await execute_e01(
            session=db_session,
            client_id=other_client.id,
            cycle_id=cycle.id,
            content_item_id=item.id,
            context_packet={"identity": {}, "episodic": []},
        )

    await db_session.refresh(item)
    assert item.status == "visual_generating"


@pytest.mark.asyncio
async def test_dispatcher_does_not_route_another_clients_item(db_session):
    owner, cycle, item = await _create_content_item(db_session, name="Owner")
    other_client, _, _ = await _create_content_item(db_session, name="Other")
    item.status = "eval_failed"
    item.eval_retry_count = 1
    item.failed_criteria = ["brand_voice"]
    await db_session.commit()

    instructions = await handle_event(
        session=db_session,
        client_id=other_client.id,
        event_type="eval_failed",
        cycle_id=cycle.id,
        content_item_id=item.id,
    )

    assert instructions == []


@pytest.mark.asyncio
async def test_call_llm_forwards_structured_response_format(monkeypatch, db_session):
    monkeypatch.delenv("CREWLAB_LLM_MOCK", raising=False)
    master_key = Fernet.generate_key().decode()
    monkeypatch.setattr(
        db_module.settings, "CREWLAB_CREDENTIAL_ENCRYPTION_KEY", master_key
    )
    client = Client(name="Structured", brand_name="Structured", is_active=True)
    db_session.add(client)
    await db_session.flush()
    db_session.add_all(
        [
            ClientLLMConfig(
                client_id=client.id,
                agent_code="E01",
                provider="openai",
                model="gpt-5-mini",
                tier="standard",
                is_active=True,
            ),
            ClientProviderCredential(
                client_id=client.id,
                provider="openai",
                encrypted_api_key=CredentialCipher(master_key).encrypt("test-key"),
                key_hint="••••-key",
                is_enabled=True,
                validation_status="valid",
                created_by=uuid.uuid4(),
                updated_by=uuid.uuid4(),
            ),
        ]
    )
    await db_session.commit()
    calls = []
    responses = iter([
        '{"caption_eval":{"score":8',
        '{"caption_eval":{"score":8,"passed":true,"failed_criteria":[],"fix_instructions":""},"visual_eval":{"score":4,"passed":true,"failed_criteria":[],"fix_instructions":""},"overall_passed":true}',
    ])

    async def fake_acompletion(**kwargs):
        calls.append(kwargs)
        message = types.SimpleNamespace(content=next(responses))
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=message)],
            usage=None,
        )

    monkeypatch.setitem(sys.modules, "litellm", types.SimpleNamespace(acompletion=fake_acompletion))

    await call_llm(
        client_id=client.id,
        agent_code="E01",
        messages=[{"role": "user", "content": "test"}],
        session=db_session,
        response_format=E01Output,
    )

    assert calls[0]["response_format"] is E01Output
    assert "temperature" not in calls[0]
    assert len(calls) == 2
    assert calls[1]["max_tokens"] >= 2048
    assert "incomplete or invalid" in calls[1]["messages"][-1]["content"]


@pytest.mark.asyncio
async def test_eval_attempt_is_tenant_scoped(db_session):
    client, cycle, item = await _create_content_item(db_session)
    await execute_e01(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet={"identity": {}, "episodic": []},
    )

    attempt = (await db_session.execute(
        select(ContentItemEvalAttempt).where(ContentItemEvalAttempt.content_item_id == item.id)
    )).scalar_one()

    assert attempt.client_id == client.id
