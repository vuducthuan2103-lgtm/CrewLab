# ADR 0014 — Bài phát sinh là Add-on, không ghi đè lịch đã duyệt

**Date:** 2026-08-08  
**Status:** Accepted  
**Ref:** Spec 0019 §4, customer-content-workflow.md

---

## Context

CrewLab cho phép khách hàng tạo bài phát sinh (ad-hoc) qua chat với A01 bên cạnh luồng lịch tuần tự động (B02 → B03 → D01 → D02 → E01). Cần chốt rõ mối quan hệ giữa bài phát sinh và lịch đã duyệt (Gate S3), tránh xung đột state và tránh một bài vô tình xóa hoặc thay thế bài khác.

---

## Decision

**Bài phát sinh tạo qua A01 Chat mặc định là add-on:**

1. Bài phát sinh **không thay thế, không xóa** bài nào đã có trong lịch tuần đã duyệt (Gate S3).
2. Bài phát sinh được gắn thẳng vào cycle đang hoạt động hoặc tạo cycle on-demand nếu chưa có — theo hành vi đã chốt trong Spec 0014.
3. A01 phải kiểm tra xung đột **trước khi** chuyển sang state `assigned`:
   - **Trùng platform + khung giờ (±2h):** cảnh báo và yêu cầu chọn giờ khác
   - **Cùng pillar + cùng ngày + ≥2 bài khác trong ngày đó:** cảnh báo chủ đề trùng lặp
4. A01 **không tự giải quyết xung đột** — chỉ cảnh báo và chờ người dùng quyết định.
5. Sau khi người dùng confirm, bài phát sinh đi vào pipeline D01 → D02 → E01 **độc lập** với lịch tuần.

---

## Consequences

**Tích cực:**
- Lịch tuần đã duyệt không bị thay đổi ngoài ý muốn
- Khách hàng không bị mất bài khi thêm bài phát sinh
- State ownership rõ ràng: mỗi `content_item` chỉ có một owner duy nhất

**Tiêu cực / Hạn chế:**
- Một tuần có thể có nhiều bài hơn `posting_frequency` nếu khách hàng tạo nhiều bài phát sinh
- Cần A01 có đủ context để kiểm tra xung đột (đọc danh sách `content_items` trong cycle hiện tại)

---

## Alternatives Considered

| Option | Lý do bác bỏ |
|---|---|
| Cho phép bài phát sinh thay thế bài trong lịch | Rủi ro mất dữ liệu; vi phạm nguyên tắc Gate S3 khóa version |
| A01 tự chọn giờ không xung đột | Che giấu thông tin quan trọng khỏi khách hàng; vi phạm nguyên tắc "human in the loop" |
| Tạo lịch riêng cho bài phát sinh | Phức tạp hoá UI không cần thiết ở Phase 1 |
