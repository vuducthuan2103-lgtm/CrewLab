const designTokens = require('./design.tokens.json');

const designTheme = designTokens.theme.extend;

function toRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createCrewLabTheme({ admin = false } = {}) {
  const colors = designTheme.colors;
  const primary = colors.primary;
  const primaryHover = colors['primary-hover'];
  const adminAccentDark = colors['admin-accent-dark'];

  return {
    ...designTheme,
    colors: {
      ...colors,
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))',
      },
      popover: {
        DEFAULT: 'hsl(var(--popover))',
        foreground: 'hsl(var(--popover-foreground))',
      },
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))',
      },
      lime: {
        400: primary,
        500: primary,
        glow: primaryHover,
      },
      ...(admin
        ? {
            cyan: {
              admin: adminAccentDark,
              deep: adminAccentDark,
            },
          }
        : {}),
    },
    fontFamily: {
      ...designTheme.fontFamily,
      sans: [designTheme.fontFamily['body-md'][0], 'Inter', 'sans-serif'],
      mono: [designTheme.fontFamily['label-mono'][0], 'monospace'],
    },
    boxShadow: {
      'glow-lime': `0 0 25px ${toRgba(primary, 0.35)}`,
      'glow-lime-sm': `0 0 12px ${toRgba(primary, 0.25)}`,
      'glow-cyan': `0 0 20px ${toRgba(adminAccentDark, 0.3)}`,
      'glow-cyan-sm': `0 0 10px ${toRgba(adminAccentDark, 0.15)}`,
    },
    keyframes: {
      'pulse-glow': {
        '0%, 100%': { opacity: '1', boxShadow: `0 0 20px ${toRgba(primary, 0.4)}` },
        '50%': { opacity: '0.6', boxShadow: `0 0 8px ${toRgba(primary, 0.15)}` },
      },
      ...(admin
        ? {
            'pulse-cyan': {
              '0%, 100%': { opacity: '1', boxShadow: `0 0 15px ${toRgba(adminAccentDark, 0.3)}` },
              '50%': { opacity: '0.5', boxShadow: `0 0 5px ${toRgba(adminAccentDark, 0.1)}` },
            },
          }
        : {}),
    },
    animation: {
      'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      ...(admin ? { 'pulse-cyan': 'pulse-cyan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : {}),
    },
  };
}

const crewLabContainer = {
  center: true,
  padding: designTheme.spacing['container-padding'],
  screens: {
    '2xl': designTheme.spacing['container-max'],
  },
};

module.exports = { createCrewLabTheme, crewLabContainer };
