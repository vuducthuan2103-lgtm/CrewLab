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
        },
        cyan: {
          admin: "#22d3ee",
          deep: "#0891b2",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'glow-lime': '0 0 25px rgba(212, 255, 0, 0.35)',
        'glow-lime-sm': '0 0 12px rgba(212, 255, 0, 0.25)',
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.3)',
        'glow-cyan-sm': '0 0 10px rgba(34, 211, 238, 0.15)',
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
        "pulse-cyan": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 15px rgba(34, 211, 238, 0.3)" },
          "50%": { opacity: "0.5", boxShadow: "0 0 5px rgba(34, 211, 238, 0.1)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-cyan": "pulse-cyan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
