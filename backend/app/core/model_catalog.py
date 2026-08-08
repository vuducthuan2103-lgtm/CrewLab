"""Server-owned model catalog for the six MVP agents.

The Portal submits a model ID, never a provider. This module is the single
source of truth that derives provider and enforces agent/tier compatibility.
"""

from dataclasses import asdict, dataclass


MVP_AGENT_CODES = {"A01", "B02", "B03", "D01", "D02", "E01"}
TEXT_AGENTS = frozenset(MVP_AGENT_CODES - {"D02"})
IMAGE_AGENT = frozenset({"D02"})
SUPPORTED_PROVIDERS = frozenset({"openai", "anthropic", "google", "deepseek"})


@dataclass(frozen=True)
class ModelCatalogEntry:
    id: str
    label: str
    provider: str
    tier: str
    capabilities: frozenset[str]
    eligible_agents: frozenset[str]

    def public_dict(self) -> dict:
        data = asdict(self)
        data["capabilities"] = sorted(self.capabilities)
        data["eligible_agents"] = sorted(self.eligible_agents)
        data.pop("provider", None)
        return data


MODEL_CATALOG = (
    ModelCatalogEntry(
        "gpt-5-mini", "GPT-5 mini", "openai", "standard",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "gpt-5", "GPT-5", "openai", "power",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "gpt-image-1-mini", "GPT Image 1 mini", "openai", "fast",
        frozenset({"image_generation"}), IMAGE_AGENT,
    ),
    ModelCatalogEntry(
        "gpt-image-1", "GPT Image 1", "openai", "power",
        frozenset({"image_generation"}), IMAGE_AGENT,
    ),
    ModelCatalogEntry(
        "claude-haiku-4-5-20251001", "Claude Haiku 4.5", "anthropic", "fast",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "claude-sonnet-5", "Claude Sonnet 5", "anthropic", "standard",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "claude-opus-4-8", "Claude Opus 4.8", "anthropic", "power",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite", "google", "fast",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "gemini-3.6-flash", "Gemini 3.6 Flash", "google", "standard",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "gemini-3.1-pro-preview", "Gemini 3.1 Pro", "google", "power",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "gemini-3.1-flash-image", "Gemini 3.1 Flash Image", "google", "standard",
        frozenset({"image_generation"}), IMAGE_AGENT,
    ),
    ModelCatalogEntry(
        "gemini-3-pro-image", "Gemini 3 Pro Image", "google", "power",
        frozenset({"image_generation"}), IMAGE_AGENT,
    ),
    ModelCatalogEntry(
        "deepseek-v4-flash", "DeepSeek V4 Flash", "deepseek", "fast",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
    ModelCatalogEntry(
        "deepseek-v4-pro", "DeepSeek V4 Pro", "deepseek", "power",
        frozenset({"text", "reasoning"}), TEXT_AGENTS,
    ),
)

_CATALOG_BY_ID = {entry.id: entry for entry in MODEL_CATALOG}

_IMAGE_MODEL_CHAT_COMPANIONS = {
    "gpt-image-1-mini": "gpt-5-mini",
    "gpt-image-1": "gpt-5-mini",
    "gemini-3.1-flash-image": "gemini-3.6-flash",
    "gemini-3-pro-image": "gemini-3.6-flash",
}


def catalog_entry(model_id: str) -> ModelCatalogEntry:
    try:
        return _CATALOG_BY_ID[model_id]
    except KeyError as exc:
        raise ValueError(f"Model '{model_id}' is not approved by CrewLab") from exc


def chat_model_for(model_id: str) -> str:
    """Return the text companion used for D02 tagging/asset-selection calls."""
    return _IMAGE_MODEL_CHAT_COMPANIONS.get(model_id, model_id)


def eligible_models(
    enabled_providers: set[str], agent_code: str | None = None
) -> list[ModelCatalogEntry]:
    if agent_code is not None and agent_code not in MVP_AGENT_CODES:
        raise ValueError(f"Agent '{agent_code}' is outside the MVP scope")
    return [
        entry
        for entry in MODEL_CATALOG
        if entry.provider in enabled_providers
        and (agent_code is None or agent_code in entry.eligible_agents)
    ]


def validate_model_selection(
    *,
    model_id: str,
    tier: str,
    agent_code: str,
    enabled_providers: set[str],
) -> ModelCatalogEntry:
    entry = catalog_entry(model_id)
    if agent_code not in MVP_AGENT_CODES:
        raise ValueError(f"Agent '{agent_code}' is outside the MVP scope")
    if entry.provider not in enabled_providers:
        raise ValueError(f"Provider for model '{model_id}' is not enabled for this client")
    if agent_code not in entry.eligible_agents:
        raise ValueError(f"Model '{model_id}' is not compatible with agent '{agent_code}'")
    if entry.tier != tier:
        raise ValueError(f"Model '{model_id}' belongs to tier '{entry.tier}', not '{tier}'")
    return entry
