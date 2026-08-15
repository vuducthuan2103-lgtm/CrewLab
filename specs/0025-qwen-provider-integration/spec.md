# Spec 0025: Qwen Provider Integration

## 1. Context & Motivation
Add Qwen (Alibaba Cloud DashScope / Model Studio) as a supported LLM provider in CrewLab across both text and image generation agents, allowing Agency Admins to configure and enable Qwen credentials per client.

## 2. Scope & Catalog
### Supported Models
- **Text Models**:
  - `qwen-3.7-turbo` (Tier: `fast`) - Eligible agents: `A01, B02, B03, D01, E01`
  - `qwen-3.7-plus` (Tier: `standard`) - Eligible agents: `A01, B02, B03, D01, E01`
  - `qwen-3.8-max` (Tier: `power`) - Eligible agents: `A01, B02, B03, D01, E01`
- **Image Models**:
  - `qwen-image-2` (Tier: `fast`) - Eligible agent: `D02` (Chat companion: `qwen-3.7-plus`)
  - `qwen-image-3` (Tier: `power`) - Eligible agent: `D02` (Chat companion: `qwen-3.8-max`)

### Routing & Validation
- Provider code: `qwen`
- Endpoint base: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (International / Singapore) with multi-region fallback (`dashscope.aliyuncs.com`, `dashscope-us.aliyuncs.com`).
- Validation: Async validation against Alibaba Cloud `/v1/models` endpoint.
- Database: Alembic migration `0018_add_qwen_provider.py` adds `'qwen'` to `client_provider_credentials` check constraint.

## 3. Acceptance Criteria
- [x] `SUPPORTED_PROVIDERS` contains `"qwen"`.
- [x] `MODEL_CATALOG` contains 5 approved Qwen entries (3 text + 2 image).
- [x] Internal App shows Qwen in provider slots for both new and existing clients.
- [x] Client cards link to `/onboarding?clientId=<uuid>` via "Quản lý Provider".
- [x] API key normalization handles quotes, `Bearer `, `.env` prefixes, and invisible whitespace.
- [x] All 251 test cases pass.
