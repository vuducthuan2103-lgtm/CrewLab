# Decision: 0017 — Virtual 3D Marketing Office Scope & Tooling

**Trạng thái:** Chấp thuận (Founder Authorized)  
**Ngày:** 16-08-2026  
**Tham chiếu:** `3D crew.txt`, `AGENTS.md`, `docs/prd/CrewLab-MVP-Scope-v3.5.md`

## Ngữ cảnh
Nhà sáng lập CrewLab đã phê duyệt mở rộng phạm vi sản phẩm để triển khai tính năng **Virtual 3D Marketing Office** cho CrewLab Client Portal.

Mục tiêu là chuyển đổi trải nghiệm AI marketing trừu tượng thành một văn phòng ảo 3D trực quan, nơi chủ quán (CEO) có thể tương tác với 6 agent AI (A01, B02, B03, D01, D02, E01) đang làm việc trong thời gian thực.

## Quyết định kiến trúc & Tooling

1. **Phạm vi V1 (Scope Boundary):**
   - Chỉ áp dụng cho tầng hiển thị và tương tác 3D (Visualization & Interaction Layer).
   - Tuyệt đối **KHÔNG** can thiệp hoặc thay đổi workflow engine backend hiện tại.
   - Giữ nguyên 6 agent MVP: A01, B02, B03, D01, D02, E01. Không đưa vào B01, F01, G01-G04, ChromaDB, Hindsight hay Meta publishing tự động.
   - Mọi thao tác hành động (CTA) của người dùng sẽ điều hướng đến các màn hình/tính năng có sẵn trong Portal.

2. **Vị trí & Routing:**
   - Triển khai trong `portal/` (Client Portal) tại route `/office`.
   - Lazy load bằng dynamic import (`ssr: false`) để không làm tăng bundle size của các trang khác trong Portal.

3. **Công nghệ 3D & Dependencies:**
   - **Core 3D:** Three.js + React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`).
   - **Vật lý & Va chạm:** `@react-three/rapier`.
   - **Character Controller:** `ecctrl` (điều khiển CEO góc nhìn thứ 3 bằng phím WASD / joystick mobile).
   - **Avatar & Animation:** `@pixiv/three-vrm`.
   - **State cục bộ:** `zustand`.
   - **Utility Asset:** `gltfjsx` (dev).
   - **UI Overlay:** shadcn/ui (Sheet detail cho từng Agent, HUD overlay).

4. **Công cụ Agent & MCP:**
   - Giữ nguyên 2 MCP chính: `codebase-memory-mcp` và `supabase` (read-only).
   - Bổ sung Skill `react-three-fiber` và `playwright`.
   - Không cài thêm các MCP phức tạp như Blender MCP hay Meshy MCP cho V1.

5. **Fallback tiếp cận (Accessibility):**
   - Cung cấp nút `[Team]` hiển thị danh sách Agent dạng DOM thuần (Sheet/Drawer) cho các thiết bị không hỗ trợ WebGL hoặc người dùng sử dụng bàn phím.
