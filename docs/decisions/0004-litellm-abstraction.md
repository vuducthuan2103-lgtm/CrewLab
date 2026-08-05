# Decision 0004 — Dùng litellm làm LLM abstraction layer

**Ngày:** 2026-08-01
**Trạng thái:** Đã chốt

## Bối cảnh

Theo PRD §7.4.2.5 (B5), mỗi client có thể cấu hình provider/model khác nhau cho từng agent (vd A01→Anthropic, D01→OpenAI). Agency Admin chốt provider lúc onboarding; client tự đổi model/tier qua Portal, hiệu lực ≤5 phút (NFR-T3-05).

Nếu hardcode SDK 1 hãng trong từng agent → mỗi agent cần sửa code riêng khi đổi model; không thể cùng lúc gọi nhiều hãng cho nhiều agent khác nhau trong cùng 1 client.

## Quyết định

Dùng **litellm** (`pip install litellm`, MIT license) làm lớp trung gian gọi LLM:
- Không fork, không qua dịch vụ bên thứ 3 (loại OpenRouter — markup chi phí + latency + điểm lỗi ngoài tầm kiểm soát)
- Đúng nguyên tắc CONSUME không OWN (PRD §3, §7.6)

## Interface

Mọi agent gọi LLM qua **1 hàm chung duy nhất**:

```python
# backend/app/core/llm.py
async def call_llm(
    client_id: UUID,
    agent_code: str,
    messages: list[dict],
    response_format: type | None = None,  # Pydantic model cho structured output
) -> LLMResponse
```

Hàm này tự đọc `client_config.llm_config` (per-agent: provider + model + budget) rồi route qua litellm tới đúng hãng. Đổi model cho 1 agent = update config trong DB, không đụng code agent.

## Áp dụng

- **Tất cả 6 agent MVP** (A01, B02, B03, D01, D02, E01) đều gọi qua `call_llm()`.
- A01 cũng gọi LLM (tier Power) — PRD mục 1a dòng 100 ghi rõ.
- Ban đầu có thể mock response trong `call_llm()` để test luồng DB trước. Chữ ký hàm và cách gọi phải đúng interface ngay từ đầu.
