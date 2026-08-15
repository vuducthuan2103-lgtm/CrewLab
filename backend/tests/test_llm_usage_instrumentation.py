import base64
import sys
import types
import uuid

import pytest
from pydantic import BaseModel

from app.core import llm
from app.services.usage_ledger import (
    BillingClassification,
    FinalizeUsageEventCommand,
    UsageCategory,
    UsageEventStatus,
    UsageLedgerUnavailable,
)


class StructuredResult(BaseModel):
    value: str


class RoutingSession:
    def __init__(self, *results):
        self._results = iter(results)

    async def scalar(self, _statement):
        return next(self._results)


def _config(*, provider="openai", model="gpt-5-mini"):
    return types.SimpleNamespace(
        provider=provider,
        model=model,
        is_active=True,
    )


def _credential(*, provider="openai"):
    return types.SimpleNamespace(
        provider=provider,
        encrypted_api_key="encrypted-test-key",
        is_enabled=True,
        validation_status="valid",
    )


def _install_ledger_spies(monkeypatch):
    admissions = []
    finalizations = []

    async def fake_admit(**kwargs):
        event_id = uuid.uuid4()
        admissions.append({**kwargs, "usage_event_id": event_id})
        return types.SimpleNamespace(
            usage_event_id=event_id,
            should_call_provider=True,
        )

    async def fake_finalize(**kwargs):
        finalizations.append(kwargs)

    async def ignore_workflow_log(*_args, **_kwargs):
        return None

    monkeypatch.setattr(llm, "_admit_usage_request", fake_admit)
    monkeypatch.setattr(llm, "_finalize_usage_request", fake_finalize)
    monkeypatch.setattr(llm, "_log_workflow_task", ignore_workflow_log)
    monkeypatch.setattr(
        llm,
        "get_credential_cipher",
        lambda: types.SimpleNamespace(decrypt=lambda _value: "provider-test-key"),
    )
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    return admissions, finalizations


def _text_response(content: str, request_id: str):
    return types.SimpleNamespace(
        id=request_id,
        choices=[types.SimpleNamespace(message=types.SimpleNamespace(content=content))],
        usage=types.SimpleNamespace(prompt_tokens=11, completion_tokens=7),
        response_cost="0.001",
    )


def _assert_operational_reconciliation_signal(error, event_id):
    assert getattr(error, "reconciliation_required", False) is True
    assert getattr(error, "usage_event_id", None) == event_id


@pytest.mark.asyncio
async def test_mock_admission_helper_forces_internal_nonproduction_in_production_env(
    monkeypatch,
):
    """Post-fix regression: helper boundary cannot classify mock as production."""
    captured = {}

    async def fake_begin(command, *, session_factory=None):
        captured["command"] = command
        captured["session_factory"] = session_factory
        return types.SimpleNamespace(
            usage_event_id=uuid.uuid4(),
            should_call_provider=True,
        )

    monkeypatch.setattr(llm, "begin_usage_event", fake_begin)
    monkeypatch.setenv("CREWLAB_ENVIRONMENT", "production")
    await llm._admit_usage_request(
        event_key="mock:direct-helper",
        session_factory=None,
        client_id=uuid.uuid4(),
        content_item_id=None,
        parent_event_id=None,
        trace_id=None,
        agent_code="D01",
        task_type="llm_call",
        wake_reason="test",
        provider="mock",
        model="mock-model",
        usage_category=UsageCategory.TEXT,
    )

    command = captured["command"]
    assert command.environment == "production"
    assert command.is_production is False
    assert command.billing_classification == BillingClassification.INTERNAL_NON_BILLABLE


@pytest.mark.asyncio
async def test_structured_repair_creates_two_linked_usage_events(monkeypatch):
    """AC-02: the repair provider request owns a distinct child ledger event."""
    admissions, finalizations = _install_ledger_spies(monkeypatch)
    provider_calls = []
    responses = iter(
        [
            _text_response("not valid json", "provider-initial"),
            _text_response('{"value":"repaired"}', "provider-repair"),
        ]
    )

    async def fake_acompletion(**kwargs):
        provider_calls.append(kwargs)
        return next(responses)

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(acompletion=fake_acompletion),
    )
    trace_id = "trace:structured-repair"
    response = await llm.call_llm(
        client_id=uuid.uuid4(),
        agent_code="D01",
        messages=[{"role": "user", "content": "return structured data"}],
        session=RoutingSession(_config(), _credential()),
        response_format=StructuredResult,
        usage_event_key="llm:structured-initial",
        trace_id=trace_id,
    )

    assert len(provider_calls) == 2
    assert len(admissions) == 2
    assert admissions[0]["event_key"] == "llm:structured-initial"
    assert admissions[0]["parent_event_id"] is None
    assert admissions[1]["event_key"].startswith("llm-repair:")
    assert admissions[1]["parent_event_id"] == admissions[0]["usage_event_id"]
    assert admissions[1]["request_mode"] == "structured_repair"
    assert {admission["trace_id"] for admission in admissions} == {trace_id}
    assert [item["status"] for item in finalizations] == [
        UsageEventStatus.SUCCEEDED,
        UsageEventStatus.SUCCEEDED,
    ]
    assert {item["usage_event_id"] for item in finalizations} == {
        admission["usage_event_id"] for admission in admissions
    }
    assert StructuredResult.model_validate_json(response.content).value == "repaired"


@pytest.mark.asyncio
async def test_structured_repair_failure_and_ledger_failure_mark_repair_event(
    monkeypatch,
):
    """Pass-2 regression: reconciliation identity belongs to the repair request."""
    initial_event_id = uuid.uuid4()
    repair_event_id = uuid.uuid4()
    admitted_ids = iter([initial_event_id, repair_event_id])
    finalized_ids = []
    provider_calls = 0

    class RepairProviderFailure(RuntimeError):
        pass

    async def fake_admit(**_kwargs):
        return types.SimpleNamespace(
            usage_event_id=next(admitted_ids),
            should_call_provider=True,
        )

    async def fake_finalize(**kwargs):
        finalized_ids.append(kwargs["usage_event_id"])
        if kwargs["usage_event_id"] == repair_event_id:
            raise UsageLedgerUnavailable("repair finalization unavailable")

    async def fake_acompletion(**_kwargs):
        nonlocal provider_calls
        provider_calls += 1
        if provider_calls == 1:
            return _text_response("not valid json", "provider-initial-invalid")
        raise RepairProviderFailure("structured repair provider failed")

    monkeypatch.setattr(llm, "_admit_usage_request", fake_admit)
    monkeypatch.setattr(llm, "_finalize_usage_request", fake_finalize)
    monkeypatch.setattr(
        llm,
        "get_credential_cipher",
        lambda: types.SimpleNamespace(decrypt=lambda _value: "provider-test-key"),
    )
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(acompletion=fake_acompletion),
    )

    with pytest.raises(RepairProviderFailure) as caught:
        await llm.call_llm(
            client_id=uuid.uuid4(),
            agent_code="D01",
            messages=[{"role": "user", "content": "return structured data"}],
            session=RoutingSession(_config(), _credential()),
            response_format=StructuredResult,
            usage_event_key="llm:repair-ledger-failure",
        )

    assert provider_calls == 2
    assert finalized_ids == [initial_event_id, repair_event_id]
    _assert_operational_reconciliation_signal(caught.value, repair_event_id)


@pytest.mark.asyncio
async def test_vision_request_is_classified_on_its_own_provider_event(monkeypatch):
    """FR-001/003: multimodal chat is classified as vision, not plain text."""
    admissions, finalizations = _install_ledger_spies(monkeypatch)

    async def fake_acompletion(**_kwargs):
        return _text_response("vision result", "provider-vision")

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(acompletion=fake_acompletion),
    )
    await llm.call_llm(
        client_id=uuid.uuid4(),
        agent_code="D02",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "inspect this image"},
                    {"type": "image_url", "image_url": {"url": "https://test.invalid/a.png"}},
                ],
            }
        ],
        session=RoutingSession(_config(), _credential()),
        usage_event_key="vision:one-request",
    )

    assert len(admissions) == 1
    assert admissions[0]["usage_category"] == UsageCategory.VISION
    assert len(finalizations) == 1
    assert finalizations[0]["usage_units"] == {
        "input_tokens": 11,
        "output_tokens": 7,
    }


@pytest.mark.asyncio
async def test_image_generation_and_edit_each_create_one_usage_event(monkeypatch):
    """AC-01/02: generation and edit are separate provider requests and events."""
    admissions, finalizations = _install_ledger_spies(monkeypatch)
    provider_calls = []
    encoded_image = base64.b64encode(b"isolated-image-result").decode("ascii")

    async def fake_generation(**kwargs):
        provider_calls.append(("generation", kwargs))
        return types.SimpleNamespace(
            id="provider-image-generation",
            data=[types.SimpleNamespace(url=None, b64_json=encoded_image)],
            response_cost="0.04",
        )

    async def fake_edit(**kwargs):
        provider_calls.append(("edit", kwargs))
        return types.SimpleNamespace(
            id="provider-image-edit",
            data=[types.SimpleNamespace(url=None, b64_json=encoded_image)],
            response_cost="0.05",
        )

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(
            aimage_generation=fake_generation,
            aimage_edit=fake_edit,
        ),
    )
    client_id = uuid.uuid4()

    await llm.generate_image(
        session=RoutingSession(
            _config(model="gpt-image-1"),
            _credential(),
        ),
        client_id=client_id,
        prompt="create a product image",
        generation_mode="new_generation",
        usage_event_key="image:new-generation",
    )
    await llm.generate_image(
        session=RoutingSession(
            _config(model="gpt-image-1"),
            _credential(),
        ),
        client_id=client_id,
        prompt="edit the product image",
        source_image_bytes=b"immutable-source-pixels",
        generation_mode="minimal_edit",
        usage_event_key="image:minimal-edit",
    )

    assert [call[0] for call in provider_calls] == ["generation", "edit"]
    assert [item["event_key"] for item in admissions] == [
        "image:new-generation",
        "image:minimal-edit",
    ]
    assert all(item["usage_category"] == UsageCategory.IMAGE for item in admissions)
    assert [item["request_mode"] for item in admissions] == [
        "new_generation",
        "minimal_edit",
    ]
    assert len(finalizations) == 2
    assert finalizations[0]["usage_units"] == {
        "images": 1,
        "source_images": 0,
        "image_edits": 0,
        "image_generations": 1,
    }
    assert finalizations[1]["usage_units"] == {
        "images": 1,
        "source_images": 1,
        "image_edits": 1,
        "image_generations": 0,
    }


@pytest.mark.asyncio
async def test_embedding_request_has_one_event_with_service_specific_units(monkeypatch):
    """AC-01: each embedding provider request owns one measured usage event."""
    admissions, finalizations = _install_ledger_spies(monkeypatch)
    provider_calls = []

    async def fake_embedding(**kwargs):
        provider_calls.append(kwargs)
        return types.SimpleNamespace(
            id="provider-embedding-001",
            data=[types.SimpleNamespace(embedding=[1.0] * 1536)],
            usage=types.SimpleNamespace(prompt_tokens=23),
            response_cost="0.0002",
        )

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aembedding=fake_embedding),
    )
    response = await llm.create_asset_embedding(
        session=RoutingSession(_credential()),
        client_id=uuid.uuid4(),
        text_value="Bardinh cold brew product photo",
        usage_event_key="embedding:asset-001",
    )

    assert len(provider_calls) == 1
    assert len(admissions) == 1
    assert admissions[0]["event_key"] == "embedding:asset-001"
    assert admissions[0]["usage_category"] == UsageCategory.EMBEDDING
    assert len(finalizations) == 1
    assert finalizations[0]["usage_units"] == {
        "input_tokens": 23,
        "dimensions": 1536,
    }
    assert len(response.embedding) == 1536


@pytest.mark.asyncio
async def test_image_pre_dispatch_validation_failure_records_zero_billable_units(
    monkeypatch,
):
    """R-001 RED: local validation before dispatch cannot fabricate one image."""
    _admissions, finalizations = _install_ledger_spies(monkeypatch)
    provider_calls = []

    async def fake_generation(**kwargs):
        provider_calls.append(kwargs)
        raise AssertionError("provider must not be called")

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aimage_generation=fake_generation),
    )
    with pytest.raises(ValueError, match="requires immutable source pixels"):
        await llm.generate_image(
            session=RoutingSession(
                _config(model="gpt-image-1"),
                _credential(),
            ),
            client_id=uuid.uuid4(),
            prompt="invalid edit without source pixels",
            generation_mode="minimal_edit",
            usage_event_key="image:pre-dispatch-failure",
        )

    assert provider_calls == []
    assert len(finalizations) == 1
    assert finalizations[0]["status"] == UsageEventStatus.FAILED
    assert finalizations[0]["usage_units"] == {
        "images": 0,
        "source_images": 0,
        "image_edits": 0,
        "image_generations": 0,
    }


@pytest.mark.asyncio
async def test_image_provider_returned_evidence_may_record_one_billed_image(monkeypatch):
    """R-001 GREEN guard: provider-returned evidence remains eligible for units."""
    _admissions, finalizations = _install_ledger_spies(monkeypatch)
    provider_result = types.SimpleNamespace(
        id="provider-image-before-local-decode-failure",
        data=[types.SimpleNamespace(url=None, b64_json="not-valid-base64")],
        response_cost="0.04",
    )

    async def fake_generation(**_kwargs):
        return provider_result

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aimage_generation=fake_generation),
    )
    with pytest.raises(Exception):
        await llm.generate_image(
            session=RoutingSession(
                _config(model="gpt-image-1"),
                _credential(),
            ),
            client_id=uuid.uuid4(),
            prompt="provider returns evidence before local decode fails",
            generation_mode="new_generation",
            usage_event_key="image:provider-evidence-failure",
        )

    assert len(finalizations) == 1
    assert finalizations[0]["evidence"] is provider_result
    assert finalizations[0]["usage_units"]["images"] == 1
    assert finalizations[0]["usage_units"]["image_generations"] == 1


@pytest.mark.asyncio
async def test_image_edit_failure_without_provider_result_records_zero_edit_units(
    monkeypatch,
):
    """Pass-2 regression: source pixels alone are not provider billing evidence."""
    _admissions, finalizations = _install_ledger_spies(monkeypatch)

    class ImageEditPreDispatchFailure(RuntimeError):
        pass

    async def fake_edit(**_kwargs):
        raise ImageEditPreDispatchFailure("adapter rejected edit before dispatch")

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aimage_edit=fake_edit),
    )
    with pytest.raises(ImageEditPreDispatchFailure):
        await llm.generate_image(
            session=RoutingSession(
                _config(model="gpt-image-1"),
                _credential(),
            ),
            client_id=uuid.uuid4(),
            prompt="edit supplied source pixels",
            source_image_bytes=b"source-pixels",
            generation_mode="minimal_edit",
            usage_event_key="image-edit:no-provider-result",
        )

    assert len(finalizations) == 1
    assert finalizations[0]["status"] == UsageEventStatus.FAILED
    assert finalizations[0]["usage_units"] == {
        "images": 0,
        "source_images": 0,
        "image_edits": 0,
        "image_generations": 0,
    }


@pytest.mark.asyncio
async def test_image_edit_provider_result_preserves_billed_edit_units(monkeypatch):
    """Pass-2 guard: returned edit evidence remains billed after local decode failure."""
    _admissions, finalizations = _install_ledger_spies(monkeypatch)
    provider_result = types.SimpleNamespace(
        id="provider-image-edit-before-local-decode-failure",
        data=[types.SimpleNamespace(url=None, b64_json="not-valid-base64")],
        response_cost="0.05",
    )

    async def fake_edit(**_kwargs):
        return provider_result

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aimage_edit=fake_edit),
    )
    with pytest.raises(Exception):
        await llm.generate_image(
            session=RoutingSession(
                _config(model="gpt-image-1"),
                _credential(),
            ),
            client_id=uuid.uuid4(),
            prompt="provider returns edit evidence before local decode fails",
            source_image_bytes=b"source-pixels",
            generation_mode="minimal_edit",
            usage_event_key="image-edit:provider-result",
        )

    assert len(finalizations) == 1
    assert finalizations[0]["evidence"] is provider_result
    assert finalizations[0]["usage_units"] == {
        "images": 1,
        "source_images": 1,
        "image_edits": 1,
        "image_generations": 0,
    }


@pytest.mark.asyncio
async def test_embedding_pre_dispatch_failure_records_zero_billable_tokens(monkeypatch):
    """R-001: an exception without provider evidence cannot fabricate token usage."""
    _admissions, finalizations = _install_ledger_spies(monkeypatch)

    class ProviderPreDispatchError(RuntimeError):
        pass

    async def fake_embedding(**_kwargs):
        raise ProviderPreDispatchError("adapter rejected request before dispatch")

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aembedding=fake_embedding),
    )
    with pytest.raises(ProviderPreDispatchError):
        await llm.create_asset_embedding(
            session=RoutingSession(_credential()),
            client_id=uuid.uuid4(),
            text_value="embedding pre-dispatch failure",
            usage_event_key="embedding:pre-dispatch-failure",
        )

    assert len(finalizations) == 1
    assert finalizations[0]["status"] == UsageEventStatus.FAILED
    assert finalizations[0]["usage_units"]["input_tokens"] == 0


@pytest.mark.asyncio
async def test_embedding_provider_returned_evidence_preserves_reported_tokens(monkeypatch):
    """R-001: post-response validation failure keeps provider usage evidence."""
    _admissions, finalizations = _install_ledger_spies(monkeypatch)
    provider_result = types.SimpleNamespace(
        id="provider-embedding-before-local-validation-failure",
        data=[types.SimpleNamespace(embedding=[1.0])],
        usage=types.SimpleNamespace(prompt_tokens=17),
        response_cost="0.0002",
    )

    async def fake_embedding(**_kwargs):
        return provider_result

    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aembedding=fake_embedding),
    )
    with pytest.raises(ValueError, match="returned 1 dimensions"):
        await llm.create_asset_embedding(
            session=RoutingSession(_credential()),
            client_id=uuid.uuid4(),
            text_value="embedding evidence before local validation failure",
            usage_event_key="embedding:provider-evidence-failure",
        )

    assert len(finalizations) == 1
    assert finalizations[0]["evidence"] is provider_result
    assert finalizations[0]["usage_units"]["input_tokens"] == 17


@pytest.mark.asyncio
async def test_text_provider_failure_plus_ledger_failure_raises_reconciliation_signal(
    monkeypatch,
):
    """R-002 RED: text failure cannot hide a failed financial finalization."""
    event_id = uuid.uuid4()

    class ProviderFailure(RuntimeError):
        pass

    async def fake_admit(**_kwargs):
        return types.SimpleNamespace(usage_event_id=event_id, should_call_provider=True)

    async def failed_finalize(**_kwargs):
        raise UsageLedgerUnavailable("ledger unavailable after provider failure")

    async def provider_failure(**_kwargs):
        raise ProviderFailure("provider request failed")

    monkeypatch.setattr(llm, "_admit_usage_request", fake_admit)
    monkeypatch.setattr(llm, "_finalize_usage_request", failed_finalize)
    monkeypatch.setattr(
        llm,
        "get_credential_cipher",
        lambda: types.SimpleNamespace(decrypt=lambda _value: "provider-test-key"),
    )
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(acompletion=provider_failure),
    )

    with pytest.raises(Exception) as caught:
        await llm.call_llm(
            client_id=uuid.uuid4(),
            agent_code="D01",
            messages=[{"role": "user", "content": "provider failure"}],
            session=RoutingSession(_config(), _credential()),
            usage_event_key="llm:provider-and-ledger-failure",
        )

    _assert_operational_reconciliation_signal(caught.value, event_id)


@pytest.mark.asyncio
async def test_reconciliation_finalization_command_excludes_sensitive_payload_fields(
    monkeypatch,
):
    """Pass-2 security regression: reconciliation metadata stays content-free."""
    event_id = uuid.uuid4()
    captured_commands = []
    secret_prompt = "private customer prompt"
    secret_response = "private provider response"
    secret_api_key = "sk-private-provider-key"
    secret_raw_exception = "raw provider stack body"

    class SensitiveProviderFailure(RuntimeError):
        pass

    async def fake_admit(**_kwargs):
        return types.SimpleNamespace(usage_event_id=event_id, should_call_provider=True)

    async def capture_then_fail_finalize(command, *, session_factory=None):
        captured_commands.append(command)
        raise UsageLedgerUnavailable("ledger unavailable after provider failure")

    async def provider_failure(**kwargs):
        assert kwargs["api_key"] == secret_api_key
        raise SensitiveProviderFailure(
            f"prompt={secret_prompt}; response={secret_response}; "
            f"api_key={kwargs['api_key']}; raw_exception={secret_raw_exception}"
        )

    monkeypatch.setattr(llm, "_admit_usage_request", fake_admit)
    monkeypatch.setattr(llm, "finalize_usage_event", capture_then_fail_finalize)
    monkeypatch.setattr(
        llm,
        "get_credential_cipher",
        lambda: types.SimpleNamespace(decrypt=lambda _value: secret_api_key),
    )
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(acompletion=provider_failure),
    )

    with pytest.raises(SensitiveProviderFailure) as caught:
        await llm.call_llm(
            client_id=uuid.uuid4(),
            agent_code="D01",
            messages=[{"role": "user", "content": secret_prompt}],
            session=RoutingSession(_config(), _credential()),
            usage_event_key="llm:sensitive-reconciliation",
        )

    assert len(captured_commands) == 1
    command = captured_commands[0]
    assert isinstance(command, FinalizeUsageEventCommand)
    assert command.usage_event_id == event_id
    assert command.error_code == "provider_error"
    forbidden_fields = {
        "prompt",
        "messages",
        "response",
        "api_key",
        "authorization",
        "headers",
        "raw_exception",
        "error_message",
    }
    assert forbidden_fields.isdisjoint(vars(command))
    serialized_command = repr(command)
    for secret in (
        secret_prompt,
        secret_response,
        secret_api_key,
        secret_raw_exception,
    ):
        assert secret not in serialized_command
    _assert_operational_reconciliation_signal(caught.value, event_id)


@pytest.mark.asyncio
async def test_image_provider_failure_plus_ledger_failure_raises_reconciliation_signal(
    monkeypatch,
):
    """R-002 RED: image failure cannot hide a failed financial finalization."""
    event_id = uuid.uuid4()

    class ProviderFailure(RuntimeError):
        pass

    async def fake_admit(**_kwargs):
        return types.SimpleNamespace(usage_event_id=event_id, should_call_provider=True)

    async def failed_finalize(**_kwargs):
        raise UsageLedgerUnavailable("ledger unavailable after provider failure")

    async def provider_failure(**_kwargs):
        raise ProviderFailure("provider request failed")

    monkeypatch.setattr(llm, "_admit_usage_request", fake_admit)
    monkeypatch.setattr(llm, "_finalize_usage_request", failed_finalize)
    monkeypatch.setattr(
        llm,
        "get_credential_cipher",
        lambda: types.SimpleNamespace(decrypt=lambda _value: "provider-test-key"),
    )
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aimage_generation=provider_failure),
    )

    with pytest.raises(Exception) as caught:
        await llm.generate_image(
            session=RoutingSession(
                _config(model="gpt-image-1"),
                _credential(),
            ),
            client_id=uuid.uuid4(),
            prompt="provider failure",
            usage_event_key="image:provider-and-ledger-failure",
        )

    _assert_operational_reconciliation_signal(caught.value, event_id)


@pytest.mark.asyncio
async def test_embedding_provider_failure_plus_ledger_failure_raises_reconciliation_signal(
    monkeypatch,
):
    """R-002 RED: embedding failure cannot hide a failed financial finalization."""
    event_id = uuid.uuid4()

    class ProviderFailure(RuntimeError):
        pass

    async def fake_admit(**_kwargs):
        return types.SimpleNamespace(usage_event_id=event_id, should_call_provider=True)

    async def failed_finalize(**_kwargs):
        raise UsageLedgerUnavailable("ledger unavailable after provider failure")

    async def provider_failure(**_kwargs):
        raise ProviderFailure("provider request failed")

    monkeypatch.setattr(llm, "_admit_usage_request", fake_admit)
    monkeypatch.setattr(llm, "_finalize_usage_request", failed_finalize)
    monkeypatch.setattr(
        llm,
        "get_credential_cipher",
        lambda: types.SimpleNamespace(decrypt=lambda _value: "provider-test-key"),
    )
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    monkeypatch.setitem(
        sys.modules,
        "litellm",
        types.SimpleNamespace(aembedding=provider_failure),
    )

    with pytest.raises(Exception) as caught:
        await llm.create_asset_embedding(
            session=RoutingSession(_credential()),
            client_id=uuid.uuid4(),
            text_value="provider failure",
            usage_event_key="embedding:provider-and-ledger-failure",
        )

    _assert_operational_reconciliation_signal(caught.value, event_id)
