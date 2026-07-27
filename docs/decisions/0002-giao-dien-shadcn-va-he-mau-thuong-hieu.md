# 0002 — Hệ thống Giao diện shadcn/ui & Chế độ Sáng/Tối (Dark/Light Theme)

**Ngày:** 2026-07-25  
**Người quyết:** Founders (Thuận / Trường) / Antigravity  

## Bối cảnh
Dự án CrewLab có 2 ứng dụng frontend độc lập trong monorepo:
1. `portal/`: Client Portal dành cho Chủ quán F&B SME (duyệt bài AI, theo dõi trạng thái FSM).
2. `internal-app/`: Agency Admin Portal dành cho đội ngũ vận hành (giám sát 6 AI Agents A01-E01, xem log FSM).

Cần thống nhất hệ thống thiết kế (Design System) và nhận diện thương hiệu cho frontend để đảm bảo tính đồng bộ, thẩm mỹ hiện đại và phù hợp với cả người dùng kỹ thuật (Agency) lẫn phi kỹ thuật (Chủ quán F&B).

## Quyết định
1. **Sử dụng thư viện shadcn/ui + Tailwind CSS**:
   - Mang lại quyền sở hữu 100% mã nguồn UI (`components/ui`).
   - Tối ưu hóa trải nghiệm với các component chuẩn mực: Dialog, Sheet, Badge (cho 5 trạng thái FSM), Card, Table.
2. **Hệ màu nhận diện theo Logo chính thức**:
   - **Màu điểm nhấn chủ đạo (Primary Accent): Electric Lime (`#D4FF00`)**. Dùng cho các nút hành động quan trọng (CTA như "Duyệt bài đăng", "Trigger Pipeline") tạo độ tương phản cao và hiệu ứng phát sáng (glow).
   - **Hỗ trợ Song song 2 Chế độ (Dark Mode & Light Mode)**:
     - **Dark Mode (Chế độ tối - Mặc định cho Agency Admin)**: Nền Deep Obsidian (`#09090B`), thẻ Card Dark Charcoal (`#141417`), viền `zinc-800`. Mang lại phong cách High-Tech AI Cybernetic, chuyên nghiệp.
     - **Light Mode (Chế độ sáng - Mở rộng cho Chủ quán F&B sử dụng ban ngày)**: Nền Trắng/Xám sáng (`#FAFAFA`), thẻ Card Trắng tinh (`#FFFFFF`), viền `zinc-200`, chữ Đen/Obsidian (`#09090B`). Nút Primary vẫn giữ màu **Electric Lime (`#D4FF00`)** chữ đen đậm để tạo điểm nhấn nhận diện thương hiệu mạnh mẽ.
3. **Phông chữ (Typography)**:
   - UI & Tiêu đề: `Montserrat` (phông geometric hiện đại, đậm chất thương hiệu & dễ nhìn).
   - Agent Log & Terminal: `JetBrains Mono` (dành cho hiển thị dữ liệu bảng `agent_memory` và log pipeline).

## Trạng thái
**Đã duyệt (Approved)** và triển khai vào `portal/` cùng `internal-app/` theo `SPEC-0001`.
