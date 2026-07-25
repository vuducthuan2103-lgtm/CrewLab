# CREWLAB UI BRAND IDENTITY & DESIGN SYSTEM (AI INSTRUCTION GUIDE)

> **Dành cho AI Assistant (Cursor, Copilot, ChatGPT, Claude, Gemini...):**  
> Khi được yêu cầu xây dựng hoặc chỉnh sửa bất kỳ giao diện nào của hệ thống **CrewLab** (Client Portal hoặc Agency Internal App), bạn **BẮT BUỘC** phải tuân thủ nghiêm ngặt bộ nhận diện thương hiệu, màu sắc, phông chữ và cấu hình dưới đây. Không tự ý sáng tạo màu sắc hoặc phông chữ khác.

---

## 1. Nguyên Tắc Thẩm Mỹ & Triết Lý Thiết Kế (Brand Essence)
- **Phong cách chủ đạo:** High-Tech AI Cybernetic, chuyên nghiệp, hiện đại, tối giản nhưng có điểm nhấn mạnh mẽ.
- **Tông màu chủ đạo (Primary Accent):** **Electric Lime (`#D4FF00`)**. Đây là màu nhận diện thương hiệu của CrewLab, luôn được dùng cho các nút CTA chính (Call-to-Action như "Duyệt bài", "Kích hoạt AI", "Lưu cấu hình") và các hiệu ứng phát sáng (glow effects).
- **Hỗ trợ 2 chế độ hiển thị:**
  - **Dark Mode (Mặc định cho Admin/Agency):** Nền tối sâu Deep Obsidian (`#09090B`), thẻ Card Dark Charcoal (`#141417`), viền mỏng màu `zinc-800`.
  - **Light Mode (Dành cho Chủ quán F&B sử dụng ban ngày):** Nền sáng sạch `zinc-50` (`#FAFAFA`), thẻ Card trắng tinh `#FFFFFF`, viền `zinc-200`. Nút CTA chính vẫn bắt buộc giữ màu **Electric Lime (`#D4FF00`)** với chữ màu đen đậm (`#09090B`).

---

## 2. Phông Chữ (Typography)
- **Phông chữ chính (UI, Menu, Headings, Body):** `Montserrat` (Google Fonts). Mang lại nét chữ hình học hiện đại, cực kỳ thoáng mắt, dễ đọc và hỗ trợ tiếng Việt tuyệt đối.
- **Phông chữ phụ (AI Agent Logs, Terminal, Dữ liệu thô):** `JetBrains Mono` (Google Fonts).

### Thẻ `<link>` hoặc `@import` Google Fonts:
```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;500;700&display=swap');
```

---

## 3. Mã Nguồn Mẫu 1: `globals.css` (Tuỳ chỉnh CSS Variables & Glow Effect)

Hãy copy toàn bộ nội dung dưới đây vào file `globals.css` (hoặc `app/globals.css`) khi bắt đầu dự án Next.js / Tailwind mới:

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;500;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light Mode Theme (Zinc 50 / White) */
    --background: 0 0% 98%;
    --foreground: 240 10% 3.9%;

    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;

    /* CrewLab Electric Lime Accent */
    --primary: 72 100% 45%;
    --primary-foreground: 240 10% 3.9%;

    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;

    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;

    --accent: 72 100% 45%;
    --accent-foreground: 240 5.9% 10%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;

    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 72 100% 45%;

    --radius: 0.75rem;
  }

  .dark {
    /* Dark Obsidian Theme (#09090B) */
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;

    --card: 240 6% 8%;
    --card-foreground: 0 0% 98%;

    --popover: 240 6% 8%;
    --popover-foreground: 0 0% 98%;

    /* CrewLab Electric Lime: #D4FF00 -> HSL 72 100% 50% */
    --primary: 72 100% 50%;
    --primary-foreground: 240 10% 3.9%;

    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;

    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;

    --accent: 72 100% 50%;
    --accent-foreground: 240 10% 3.9%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;

    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 72 100% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased transition-colors duration-300;
  }
}

/* Custom CrewLab Glow Effects */
.btn-lime-glow {
  background-color: #D4FF00;
  color: #09090B;
  font-weight: 600;
  box-shadow: 0 0 20px rgba(212, 255, 0, 0.35);
  transition: all 0.2s ease-in-out;
}
.btn-lime-glow:hover {
  background-color: #E5FF55;
  box-shadow: 0 0 30px rgba(212, 255, 0, 0.55);
  transform: translateY(-1px);
}

.border-lime-glow {
  border-color: #D4FF00;
  box-shadow: 0 0 15px rgba(212, 255, 0, 0.2);
}
```

---

## 4. Mã Nguồn Mẫu 2: `tailwind.config.js` (Cấu hình Tailwind chuẩn)

Hãy sử dụng cấu hình này để tích hợp màu `lime-400`, bóng đổ `glow-lime` và phông chữ `Montserrat`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        lime: {
          400: "#D4FF00",
          500: "#C2F000",
          glow: "#E5FF55",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'glow-lime': '0 0 25px rgba(212, 255, 0, 0.35)',
        'glow-lime-sm': '0 0 12px rgba(212, 255, 0, 0.25)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
      },
      fontFamily: {
        sans: ['Montserrat', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px rgba(212, 255, 0, 0.4)" },
          "50%": { opacity: "0.6", boxShadow: "0 0 8px rgba(212, 255, 0, 0.15)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

---

## 5. Hướng Dẫn Dành Cho AI Khi Tạo Components

Khi AI viết code JSX / TSX cho các component của CrewLab, cần tuân theo các quy luật sau:

1. **Nút Hành Động Chính (Primary CTA Button):**
   - Luôn sử dụng màu nền `bg-[#D4FF00]` (hoặc `bg-primary`), chữ màu đen đậm `text-[#09090B] font-semibold`, kèm hiệu ứng phát sáng nhẹ `shadow-glow-lime-sm hover:shadow-glow-lime`.
   - Example Tailwind classes: `bg-[#D4FF00] text-black font-semibold px-4 py-2 rounded-lg shadow-glow-lime-sm hover:bg-[#E5FF55] hover:shadow-glow-lime hover:-translate-y-[1px] transition-all duration-200`.

2. **Thẻ Card & Container (Panels):**
   - Không dùng màu nền đen xỉn hoặc xám nhạt tự chế. Hãy dùng class chuẩn của shadcn/ui: `bg-card text-card-foreground border border-border rounded-xl`.
   - Trong Dark Mode, màu card sẽ tự động là Dark Charcoal (`#141417`), nền màn hình là Deep Obsidian (`#09090B`).

3. **Màu Sắc Trạng Thái FSM (6 Trạng thái Pipeline MVP của CrewLab):**
   - `planned` (Đã lên kế hoạch): `bg-zinc-500/10 text-zinc-400 border-zinc-500/20`
   - `evaluating` (Đang thẩm định): `bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse`
   - `eval_failed` (Thẩm định lại/Thất bại): `bg-amber-500/10 text-amber-400 border-amber-500/20`
   - `pending_content_approval` (Chờ khách duyệt): `bg-[#D4FF00]/15 text-[#D4FF00] border-[#D4FF00]/30 font-semibold shadow-glow-lime-sm`
   - `approved_ready_to_post` (Đã duyệt - Chờ đăng): `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
   - `posted` (Đã đăng): `bg-blue-500/10 text-blue-400 border-blue-500/20`
