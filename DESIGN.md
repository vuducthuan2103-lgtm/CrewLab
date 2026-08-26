---
version: 1.0.0
name: CrewLab Design System
description: Accessible dark-only design system for the CrewLab Portal and Internal App.
colors:
  primary: "#D4FF00"
  primary-hover: "#E5FF55"
  on-primary-dark: "#09090B"
  admin-accent-dark: "#22D3EE"
  on-admin-accent-dark: "#09090B"
  background-dark: "#09090B"
  on-background-dark: "#FAFAFA"
  surface-dark: "#131316"
  on-surface-dark: "#FAFAFA"
  surface-dark-muted: "#27272A"
  on-surface-dark-muted: "#A1A1AA"
  border-dark: "#27272A"
  success-dark-container: "#166534"
  on-success-dark-container: "#DCFCE7"
  warning-dark-container: "#F59E0B"
  on-warning-dark-container: "#09090B"
  error-dark-container: "#7F1D1D"
  on-error-dark-container: "#FFFFFF"
  info-dark-container: "#164E63"
  on-info-dark-container: "#ECFEFF"
typography:
  headline-display:
    fontFamily: Montserrat
    fontSize: 56px
    fontWeight: 700
    lineHeight: "1.1"
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: 700
    lineHeight: "1.15"
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: 600
    lineHeight: "1.2"
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: 600
    lineHeight: "1.3"
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: 600
    lineHeight: "1.3"
  body-lg:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: 400
    lineHeight: "1.6"
  body-md:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: 400
    lineHeight: "1.5"
  body-sm:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: 400
    lineHeight: "1.5"
  label-lg:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: 600
    lineHeight: "1.2"
  label-md:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: 600
    lineHeight: "1.2"
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: "1.2"
    letterSpacing: 0.05em
rounded:
  sm: 8px
  md: 10px
  lg: 12px
  xl: 12px
  2xl: 16px
  3xl: 24px
  full: 9999px
spacing:
  2xs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  container-padding: 32px
  container-padding-mobile: 16px
  container-max: 1400px
components:
  page-dark:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.on-background-dark}"
    typography: "{typography.body-md}"
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-surface-dark}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
  muted-surface-dark:
    backgroundColor: "{colors.surface-dark-muted}"
    textColor: "{colors.on-surface-dark-muted}"
    rounded: "{rounded.lg}"
  divider-dark:
    backgroundColor: "{colors.border-dark}"
    textColor: "{colors.on-surface-dark}"
    height: 1px
  button-primary-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary-dark}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    height: 44px
    padding: "{spacing.md}"
  button-primary-dark-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary-dark}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    height: 44px
    padding: "{spacing.md}"
  admin-accent-dark:
    backgroundColor: "{colors.admin-accent-dark}"
    textColor: "{colors.on-admin-accent-dark}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  status-success-dark:
    backgroundColor: "{colors.success-dark-container}"
    textColor: "{colors.on-success-dark-container}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-warning-dark:
    backgroundColor: "{colors.warning-dark-container}"
    textColor: "{colors.on-warning-dark-container}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-error-dark:
    backgroundColor: "{colors.error-dark-container}"
    textColor: "{colors.on-error-dark-container}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  status-info-dark:
    backgroundColor: "{colors.info-dark-container}"
    textColor: "{colors.on-info-dark-container}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
---

# CrewLab Design System

## Overview

CrewLab là nền tảng multi-agent marketing automation cho doanh nghiệp F&B vừa và nhỏ tại Việt Nam. Visual language phải truyền đạt ba thuộc tính: **tốc độ**, **kiểm soát** và **độ tin cậy**. Giao diện trẻ, sắc và thiên về công nghệ, nhưng không được trở thành dashboard quá phô trương hoặc khó đọc với người dùng không chuyên kỹ thuật.

Phase 1 chỉ bao gồm sáu agent: **A01, B02, B03, D01, D02 và E01**. Không dùng hình ảnh, nhãn hoặc ví dụ khiến B01, F01 hay G01–G04 trông như tính năng đang hoạt động.

Hệ thống gồm hai bề mặt sản phẩm:

- **Portal:** giao diện khách hàng, ưu tiên sự rõ ràng, ngôn ngữ gần gũi và hành động có hướng dẫn.
- **Internal App:** giao diện vận hành nội bộ, mật độ thông tin cao hơn và được phép dùng cyan cho metadata kỹ thuật.

CrewLab dùng giao diện dark-only cho cả Portal và Internal App. Không hiển thị theme toggle, không tự chuyển theo operating system và không duy trì semantic token cho light mode. Mọi giao diện phải đạt tối thiểu **WCAG 2.2 Level AA**.

## Colors

- **Electric Lime (`primary`, `#D4FF00`):** màu nhận diện chính. Dùng cho CTA chính, trạng thái active và tiến trình đang chạy. Trên nền lime luôn dùng `on-primary-dark` (`#09090B`).
- **Admin Cyan:** chỉ dùng cho metadata kỹ thuật, log, debug và thông tin hệ thống trong Internal App. Không cạnh tranh với CTA lime.
- **Dark surfaces:** dùng `background-dark` → `surface-dark` → `surface-dark-muted` để tạo chiều sâu bằng tonal layering.
- **Semantic colors:** success, warning, error và info luôn dùng theo cặp container/on-container đã định nghĩa. Không dùng màu đơn lẻ để truyền đạt trạng thái.

Không hardcode màu trong component mới. Dùng shadcn semantic variables, Tailwind theme tokens hoặc token reference trong tài liệu này.

## Typography

- **Primary sans:** `Inter, sans-serif`. Inter là font hiển thị thực tế của cả Portal và Internal App.
- **Monospace:** `JetBrains Mono, monospace`, chỉ dùng cho mã agent, trạng thái kỹ thuật, timestamp, model name và log.
- **Headlines:** weight 600–700; letter-spacing âm nhẹ chỉ ở size từ 40px trở lên.
- **Body:** dùng `body-lg` 16px cho nội dung đọc dài; `body-md` 14px cho dashboard và bảng dữ liệu; không dùng 12px cho paragraph chính.
- **Labels:** không dùng uppercase toàn bộ cho chuỗi dài. Nếu dùng uppercase cho mã hoặc eyebrow, giữ letter-spacing tối đa 0.05em.

## Layout & Spacing

- Dùng grid cơ sở 4px; mọi padding, gap và margin phải lấy từ spacing scale.
- Container lớn nhất 1400px, căn giữa; padding desktop 32px, mobile 16px.
- Gutter mặc định 24px; có thể giảm còn 16px ở viewport hẹp.
- Thiết kế mobile-first. Bố cục một cột là mặc định; nâng lên hai hoặc nhiều cột từ breakpoint phù hợp với nội dung, không chỉ theo kích thước thiết bị.
- Bảng và Kanban phải hỗ trợ overflow có chủ đích; không ép nội dung xuống dưới kích thước đọc được.
- Content Approval và Asset Upload phải thao tác được bằng một tay trên mobile.

## Elevation & Depth

Trong dark mode, chiều sâu đến từ **tonal layering, border và focus ring**, không từ shadow đen nặng. Card dùng `surface-dark`; panel lồng dùng `surface-dark-muted`; border 1px tạo ranh giới.

Glow lime hoặc cyan chỉ dành cho focus, trạng thái đang chạy hoặc CTA ưu tiên cao; không phủ glow lên toàn bộ dashboard.

Focus ring phải có độ tương phản tối thiểu 3:1 so với màu xung quanh và không được bị `overflow: hidden` cắt mất.

## Shapes

- Button, input và control tiêu chuẩn: radius 12px (`rounded.lg`).
- Card và panel: radius 16px (`rounded.2xl`).
- Modal và container lớn: radius 24px (`rounded.3xl`).
- Badge và status pill: `rounded.full`.
- Vùng tương tác tối thiểu: 44×44px trên màn hình cảm ứng; icon-only control phải có accessible name.
- Chỉ dùng **Lucide** cho icon giao diện. Stroke mặc định 1.5–2px, kích thước phổ biến 16px, 20px và 24px.

## Components

Mọi component tiêu chuẩn phải dùng shadcn/ui primitive từ `components/ui`. Không tạo Button, Dialog, DropdownMenu, Tabs, Form hoặc Table thay thế nếu shadcn đã có primitive tương ứng.

### Buttons

- Mỗi vùng nội dung chỉ có một primary CTA nổi bật.
- Portal và Internal App dùng `button-primary-dark`. Tất cả primary CTA dùng nền lime và chữ obsidian.
- Secondary dùng nền trong suốt hoặc surface muted, border 1px và text semantic.
- Ghost chỉ dùng cho điều hướng hoặc hành động mức ưu tiên thấp.
- Tất cả variant phải có default, hover, focus-visible, active, disabled và loading state.
- Disabled state phải thay đổi cả opacity lẫn cursor/behavior; không chỉ đổi màu.

### Cards

- Card dùng radius 16px, padding mặc định 24px và một border rõ ràng.
- Không lồng quá ba cấp surface. Khi cần nhóm sâu hơn, dùng heading, divider hoặc spacing thay vì thêm card.
- Card có thể click phải có hover/focus nhất quán và toàn bộ vùng tương tác phải truy cập được bằng bàn phím.

### Input Fields

- Label luôn hiển thị; placeholder không thay thế label.
- Input cao tối thiểu 44px, có helper/error text và `aria-describedby` khi cần.
- Focus dùng ring 2px có contrast rõ; error dùng cả icon/text, không chỉ border đỏ.

### Status and Progress

- Status chip dùng `label-mono`, rounded full và semantic container/on-container pair.
- Trạng thái FSM phải có text label; màu chỉ là tín hiệu phụ.
- Progress bar phải có accessible name và giá trị hiện tại. Indeterminate progress dùng animation nhẹ và hỗ trợ reduced motion.

### Tables, Dialogs and Navigation

- Table giữ header rõ ràng, keyboard focus và horizontal overflow có chủ đích trên mobile.
- Dialog phải trap focus, đóng bằng Escape và trả focus về trigger.
- Navigation active state dùng ít nhất hai dấu hiệu trong số màu, weight, icon hoặc indicator bar.

## Motion

Motion phải nhanh, dứt khoát và phục vụ phản hồi trạng thái:

- 150ms cho micro-interaction; 200ms cho hover/focus; tối đa 300ms cho dialog, drawer hoặc page transition.
- Dùng `ease-out` cho phần tử xuất hiện và `ease-in-out` cho thay đổi trạng thái liên tục.
- Không dùng bounce/elastic trong workflow nghiệp vụ.
- Chỉ animate `transform` và `opacity` khi có thể; tránh transition `all` trong component mới.
- Với `prefers-reduced-motion: reduce`, tắt chuyển động trang trí và rút animation chức năng xuống gần như tức thời.

## Accessibility

- Text thường phải đạt contrast tối thiểu 4.5:1; text lớn và thành phần UI tối thiểu 3:1.
- Mọi thao tác phải dùng được bằng bàn phím và có focus indicator nhìn thấy rõ.
- Không dùng màu, vị trí hoặc animation làm tín hiệu duy nhất.
- Icon-only action cần `aria-label`; ảnh nội dung cần alt text có ý nghĩa; ảnh trang trí dùng alt rỗng.
- Error message phải mô tả cách khắc phục, không chỉ báo rằng có lỗi.
- Tôn trọng zoom 200%, text reflow và reduced motion.

## Virtual Office

Virtual Office là lớp trực quan hoá read-only trong Portal, không phải một game hoặc dashboard thứ hai. Shell, popup và control DOM vẫn dùng dark token của CrewLab. Bên trong canvas, scene được phép dùng ánh sáng daylight/evening và vật liệu Soft Organic Modern: đá vôi ấm, gỗ sáng, kim loại champagne mờ, kính kiến trúc và cây xanh tự nhiên.

- Electric lime chỉ là selected/focus state hoặc khoảnh khắc hệ thống có dữ liệu thật; không dùng để viền toàn bộ desk, màn hình hoặc kiến trúc.
- Text chính xác, trạng thái, lỗi và CTA nằm trong DOM popup/roster. 3D world chỉ dùng silhouette, thumbnail/shape abstraction và name/code ngắn khi hover hoặc focus.
- Một trạng thái cần chú ý dùng màu semantic **kèm** icon/shape/motion; không đổi đèn toàn cảnh sang đỏ và không dùng lime cho lỗi.
- Không dùng aesthetic cyberpunk: hologram lớn, grid phát sáng, particles, neon wash hoặc confetti không thuộc visual language này.
- `prefers-reduced-motion` phải rút guided camera và artifact path xuống fade/chuyển cảnh ngắn nhưng giữ nguyên khả năng đọc state.

## Do's and Don'ts

- **Do** dùng đúng sáu agent MVP: A01, B02, B03, D01, D02 và E01.
- **Do** dùng electric lime có chọn lọc để giữ thứ bậc thị giác.
- **Do** dùng lime với chữ obsidian cho primary CTA ở cả hai mode và cyan cho metadata Internal App.
- **Do** dùng semantic token và shadcn primitive trước khi thêm CSS tùy chỉnh.
- **Do** kiểm tra cả dark/light, mobile/desktop, keyboard và contrast trước khi merge UI.
- **Don't** dùng B01, F01 hoặc G01–G04 như tính năng đang hoạt động trong Phase 1.
- **Don't** dùng lime làm chữ trên nền sáng hoặc dùng white trên lime.
- **Don't** trộn Lucide với icon library khác.
- **Don't** dùng glow, gradient hoặc animation chỉ để trang trí dashboard.
- **Don't** giảm body text dưới 14px hoặc touch target dưới 44×44px.
