# ADR-0013 — D02 tạo visual từ nguồn ảnh thật và semantic retrieval theo client

**Ngày:** 2026-08-08
**Trạng thái:** Accepted
**Liên quan:** Spec 0017, Spec 0007, Spec 0008, MVP Scope v3.5

## Quyết định

1. Mỗi bài `visual_required` bắt buộc có một final visual do D02 tạo/chỉnh bằng image-capable LLM. Ảnh thật phù hợp nhất của client là nguồn ưu tiên, không phải final output không chỉnh sửa.
2. D01 là nơi quyết định `visual_required` hoặc `text_only`. `text_only` đi thẳng tới E01 và không nhận visual score hoặc visual retry.
3. Media Library được bổ sung semantic image retrieval theo từng client để tìm ảnh gần nghĩa với Visual Intent của D01. Đây không phải ChromaDB, RAG tài liệu, hay tìm kiếm chéo client.
4. Embedding chỉ phục vụ retrieval/ranking. E01 phải đánh giá final image thật bằng vision cùng caption, Visual Intent và provenance của D02.
5. Ảnh gốc của client là bất biến. Mọi output của D02 là derivative có lineage rõ ràng về ảnh gốc, hoặc là new generation nếu không có ảnh gốc đủ phù hợp.

## Lý do

Tag đơn lẻ không đủ để phân biệt một ảnh “có cà phê” với ảnh thực sự phù hợp về sản phẩm, bối cảnh, khoảng trống đặt chữ và khả năng chỉnh sửa. Đồng thời, bắt D02 chờ Asset Request khi thiếu exact match đi ngược mục tiêu tạo creative tự động.

## Hệ quả

- Thay thế nhánh `allow_ai_images=false` và placeholder AI generation hiện có bằng final visual generation/editing thật cho bài `visual_required`.
- D02 và E01 cần bổ sung provenance/semantic data, backlog index ảnh cũ và test tách text-only khỏi missing-image failure.
- Cần giữ RLS và tenant isolation cho mọi asset, semantic record và selection decision.
- Các criterion E01 hiện có không đổi; chỉ `text_only` được đánh dấu visual `not_applicable`.

## Luồng upload và Semantic Asset Record

1. Client upload ảnh trong Portal. Hệ thống kiểm tra file, lưu một source asset bất biến theo đúng `client_id`, sau đó hiển thị trạng thái `processing`.
2. Một tiến trình nền tạo hoặc cập nhật Semantic Asset Record cho source asset đó. Record gồm: content fingerprint, phiên bản phân tích/embedding, mô tả ngữ nghĩa dễ đọc, sản phẩm/chủ thể chính-phụ, bối cảnh, hành động, bố cục, mood/ánh sáng, khoảng trống đặt chữ, OCR, tag gợi ý, chất lượng/khả năng chỉnh sửa, an toàn, confidence và timestamps.
3. Record có lifecycle `processing` -> `ready`, hoặc `needs_attention`/`failed`; source chỉ được D02 tìm khi record `ready` **và** asset đã approved, đủ usage rights. Ảnh cũ chưa backfill được phép fallback metadata theo Spec 0017; ảnh upload mới fail indexing thì không được fallback.
4. Embedding là multimodal, versioned: embedding của source image kèm semantic description, và query embedding tương thích từ Visual Intent của D01. D02 hybrid-search trong **cùng client**: semantic similarity + exact product/tag + hard filters. Embedding không bao giờ thay thế approval, rights, fact verification hay E01 vision review.
5. Sử dụng fingerprint để dedupe exact bytes trong cùng client. Upload thực sự thay ảnh tạo immutable source và record mới; record cũ `superseded` chỉ bị loại từ candidate mới, vẫn giữ để provenance.
6. Không dùng face identity/biometric; không tìm ảnh chéo client. Embedding, candidate list, fingerprint và audit record đều bắt buộc tenant-isolated.

## Ngoài phạm vi

- ChromaDB, document RAG, semantic search giữa các client, tự đăng bài và client-side image editor.
