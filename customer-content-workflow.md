# Customer Content Workflow

## Goal

Tạo một hành trình rõ ràng để khách hàng lên lịch tuần hoặc giao một bài phát sinh mà không tạo trùng item, không gọi thẳng agent con và không có hai nơi cùng sửa một state.

## Workflow đã đề xuất

1. **Thiết lập một lần:** khách hàng hoàn tất Brand Voice, kênh, `posting_frequency` và Media Library.
2. **Luồng lịch tuần:** scheduler gọi A01 -> B02 đề xuất 2-5 Content Pillar + Content Angle -> khách hàng xác nhận Gate S2 -> A01 gọi B03 tạo đúng số bài theo `posting_frequency` -> khách hàng duyệt cả tuần tại Gate S3.
3. **Luồng sản xuất từng bài:** sau Gate S3, A01 dispatch D01 -> D02 -> E01; E01 tự retry tối đa 3 lần theo lỗi caption/visual -> bài đạt mới sang Gate 2.
4. **Luồng bài phát sinh:** khách hàng chat A01 cho đúng một bài; A01 làm rõ brief, kiểm tra trùng lịch/chủ đề, hiển thị bản tóm tắt để khách hàng xác nhận rồi mới tạo `content_item` và dispatch D01. Luồng này không chạy lại B02/B03 và không sửa plan đã duyệt.
5. **Đầu việc của khách hàng:** nộp ảnh khi D02 yêu cầu; tại Gate 2 chọn Approve, Approve with edit hoặc Reject; tự đăng bài rồi bấm Mark as posted.

## Quy tắc chống xung đột cần chốt

- Portal chỉ gửi message cho A01; không gọi trực tiếp B02/B03/D01/D02/E01.
- Content Hub là nơi duy nhất sửa/xác nhận Pillar, Angle và lịch tuần; chat A01 chỉ tạo bài phát sinh.
- Gate S2 khóa một version Pillar; Gate S3 khóa một version Content Plan. Sau khi khóa, không ghi đè version cũ.
- Bài phát sinh mặc định là **add-on**; không tự thay/xóa bài trong lịch. Nếu trùng platform + khung giờ hoặc gần trùng chủ đề, A01 phải cảnh báo và yêu cầu chọn giờ/chủ đề khác.
- A01 chỉ đọc state và dispatch; agent vừa hoàn thành bước nào thì agent đó sở hữu transition của bước đó.
- Mọi action có side effect phải idempotent để double-click/double-send không tạo bài hoặc task trùng.
- Retry chất lượng chỉ do E01 tự động kích hoạt. Reject của người dùng đi thẳng `rejected` trong Phase 1 và không có nút retry/reopen thủ công.

## Mẫu giao việc cho A01

`Tạo 1 bài phát sinh về [chủ đề/sản phẩm], mục tiêu [mục tiêu], đăng trên [FB/IG] lúc [ngày giờ], thuộc pillar [tên] và angle [góc khai thác nếu biết], thông điệp/ưu đãi [nội dung], CTA [CTA], dùng [ảnh thật/ảnh trong thư viện]. Hãy hỏi lại phần còn thiếu và chỉ tạo bài sau khi tôi xác nhận bản tóm tắt.`

Không nhắn A01 để duyệt Pillar, duyệt tuần, nộp ảnh, approve/reject bài hoặc Mark as posted; dùng đúng màn hình tương ứng.

## Tasks

- [ ] Chốt rule bài phát sinh là add-on và tiêu chí cảnh báo trùng -> Verify: có ADR/spec được founder duyệt.
- [ ] Chuẩn hoá thuật ngữ Pillar -> Angle -> Content Item trên Portal -> Verify: cùng một nhãn ở Chat, Content Hub, Calendar và Gate 2.
- [ ] Đặc tả A01 theo 4 trạng thái hội thoại `exploring -> clarifying -> confirmation -> assigned` -> Verify: câu hỏi ý tưởng không tạo item; chỉ `assigned` mới tạo đúng một item.
- [ ] Thêm Assignment Summary trước khi giao việc -> Verify: có topic, goal, platform, schedule, pillar/angle, CTA và asset preference.
- [ ] Thêm kiểm tra xung đột trước khi tạo item -> Verify: trùng thời gian/chủ đề bị cảnh báo và không tự ghi đè plan.
- [ ] Đồng bộ Kanban, Calendar và notification theo cùng `content_item_id` -> Verify: một bài hiển thị nhất quán, không sinh card bài trùng.
- [ ] Viết test cho cả luồng tuần và luồng chat phát sinh -> Verify: S2/S3, D01-D02-E01, Gate 2, asset request, idempotency và reject terminal đều pass.
- [ ] Verification cuối: walkthrough trên mobile/desktop với một khách hàng pilot -> Verify: khách hàng biết khi nào chat A01 và hoàn thành hai kịch bản mà không cần hướng dẫn miệng.

## Done When

- [ ] Mỗi ý định của khách hàng chỉ có một cửa thao tác và một owner.
- [ ] Lịch tuần và bài phát sinh cùng đi vào pipeline D01-D02-E01 nhưng không ghi đè nhau.
- [ ] Tài liệu không còn mô tả Human Reject là automatic retry.

## Notes

Trước khi code, chuyển kế hoạch này thành một `specs/<NNNN>-<name>/spec.md` được duyệt. Spec 0009b hiện còn ở trạng thái Draft; mâu thuẫn giữa mô tả Reject trong MVP Scope và Spec 0009a/0014 phải được sửa theo nguồn ưu tiên mới hơn.
