# ADR-0005 — E01 Evaluation Criteria: Align với MVP-Scope §1a, không tạo vocabulary mới

**Ngày:** 2026-08-01  
**Trạng thái:** Accepted  
**Liên quan:** Spec 0008 (E01 Evaluator), MVP-Scope-v3.5 §1a, §5

---

## Bối cảnh

Trong quá trình soạn Spec 0008, E01 Evaluator được thiết kế với rubric riêng dùng các criterion tên như `tone`, `cta_quality`, `grammar`, `brand_consistency` — các tên này không có trong bảng retry-routing của MVP-Scope §1a.

MVP-Scope §1a (bảng retry-routing) định nghĩa:
- Route về D01: `brand_voice`, `content_accuracy`, `platform_fit`, `pillar_relevance`, `originality`
- Route về D02: `visual_asset_fit`, `image_design_quality`, `mobile_readability`

Nếu E01 output `failed_criteria = ["tone", "cta_quality"]` mà dispatcher chỉ biết route theo `brand_voice | content_accuracy | ...`, item sẽ rơi vào fallback (`determine_retry_route` trả D01 vì không nhận ra criterion) — không gây crash nhưng route sai semantic.

Hai tài liệu vênh nhau âm thầm vi phạm nguyên tắc "file là chân lý" của working agreement.

---

## Quyết định

**Dùng đúng 8 criterion names từ MVP-Scope §1a làm vocabulary chuẩn cho `failed_criteria` field** trong E01Output — không tạo tên mới.

### Caption criteria (route về D01):
| Criterion | Ý nghĩa chấm điểm E01 |
|---|---|
| `brand_voice` | Giọng điệu có phản ánh brand personality keywords, avoid_phrases không? |
| `content_accuracy` | Thông tin sản phẩm/giá/tên có đúng với brand_settings không? |
| `platform_fit` | Độ dài, hashtag count, emoji, format phù hợp platform (FB vs IG) không? |
| `pillar_relevance` | Caption có bám sát pillar + image_brief gốc D01 không? |
| `originality` | Cấu trúc câu/hook có lặp so với episodic memory 5 bài gần nhất không? |

### Visual criteria (route về D02):
| Criterion | Ý nghĩa chấm điểm E01 |
|---|---|
| `visual_asset_fit` | Ảnh có khớp với nội dung caption + image_brief không? |
| `image_design_quality` | Ảnh có đủ rõ nét, ánh sáng tốt, không bị crop lỗi, watermark, text overlay kém? |
| `mobile_readability` | Ảnh hiển thị rõ trên màn hình 5"? Text nếu có không bị mờ/bị che? |

---

## Hệ quả

1. **E01 SYSTEM_PROMPT** phải hướng dẫn LLM dùng đúng 8 tên này khi output `failed_criteria`.
2. **`retry_routing.py`** chỉ cần giữ 8 criterion chuẩn — không cần expand vocabulary mới.
3. **`brand_consistency`** (được đề xuất trong Spec 0008 draft) bị loại — nếu cần thêm criterion visual mới trong tương lai, phải làm ADR riêng và cập nhật routing table.
4. **Rubric điểm số** (0–10 caption, 0–5 visual) trong E01 vẫn giữ nguyên theo MVP-Scope §5 (`≥7.0 pass`, `≥3.5 pass`). Criterion fail khi điểm sub-dimension < ngưỡng tương ứng.

---

## Các phương án đã bác bỏ

**Phương án A — Giữ criterion mới (tone, cta_quality, grammar, brand_consistency) + extend routing table:**  
Bị bác vì thay đổi business rule đã chốt trong MVP-Scope mà không có quyết định rõ ràng. Làm routing phức tạp hơn không cần thiết.

**Phương án B — Hai vocabulary song song (rubric E01 dùng tên riêng, routing map về criterion gốc):**  
Bị bác vì tạo tầng dịch thêm, khó maintain khi E01 output sai tên, và vẫn vi phạm "file là chân lý".
