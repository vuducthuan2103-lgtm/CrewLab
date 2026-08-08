import pytest

from app.core.model_catalog import (
    MVP_AGENT_CODES,
    catalog_entry,
    eligible_models,
    validate_model_selection,
)


def test_catalog_covers_exact_mvp_agent_scope():
    assert MVP_AGENT_CODES == {"A01", "B02", "B03", "D01", "D02", "E01"}


def test_eligible_models_include_only_enabled_providers():
    models = eligible_models({"anthropic"})

    assert models
    assert {model.provider for model in models} == {"anthropic"}


def test_d02_only_receives_image_capable_models():
    models = eligible_models({"openai", "google"}, agent_code="D02")

    assert models
    assert all("image_generation" in model.capabilities for model in models)


def test_deepseek_models_are_available_for_text_agents_only():
    models = eligible_models({"deepseek"})

    assert {model.id for model in models} == {"deepseek-v4-flash", "deepseek-v4-pro"}
    assert all("D02" not in model.eligible_agents for model in models)


def test_validate_model_selection_derives_provider_server_side():
    entry = validate_model_selection(
        model_id="gpt-5-mini",
        tier="standard",
        agent_code="D01",
        enabled_providers={"openai"},
    )

    assert entry.provider == "openai"


def test_validate_model_selection_rejects_disabled_provider():
    with pytest.raises(ValueError, match="not enabled"):
        validate_model_selection(
            model_id="gpt-5-mini",
            tier="standard",
            agent_code="D01",
            enabled_providers={"anthropic"},
        )


def test_catalog_lookup_rejects_unknown_model():
    with pytest.raises(ValueError, match="not approved"):
        catalog_entry("made-up-model")
