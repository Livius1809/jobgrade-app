// JobGrade — Tailwind CSS Config (Brand Extension)
// ==================================================
// COA: copiaza continutul sectiunii "theme.extend" in
// tailwind.config.js din jobgrade-app/
//
// Sau importa direct:
//   const brandTokens = require('./tailwind.config.brand.js')
//   module.exports = { ...brandTokens }

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {

      // ── Culori brand ───────────────────────────────────────────────────────
      colors: {
        coral: {
          DEFAULT: '#E85D43',
          light:   '#F08A76',
          dark:    '#C4432B',
        },
        indigo: {
          DEFAULT: '#4F46E5',
          light:   '#7C75ED',
          dark:    '#3730B8',
        },
        brand: {
          primary:   '#E85D43',   // coral
          secondary: '#4F46E5',   // indigo
        },
      },

      // ── Gradiente brand ────────────────────────────────────────────────────
      backgroundImage: {
        'brand-h':  'linear-gradient(90deg,  #E85D43 0%, #4F46E5 100%)',
        'brand-d':  'linear-gradient(135deg, #E85D43 0%, #4F46E5 100%)',
        'brand-v':  'linear-gradient(180deg, #E85D43 0%, #4F46E5 100%)',
      },

      // ── Tipografie ─────────────────────────────────────────────────────────
      fontFamily: {
        sans:  ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'display-lg': ['60px', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '800' }],
        'display':    ['48px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'hero':       ['36px', { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: '700' }],
      },

      // ── Umbre brand ────────────────────────────────────────────────────────
      boxShadow: {
        'brand':    '0 4px 14px 0 rgba(79, 70, 229, 0.25)',
        'coral':    '0 4px 14px 0 rgba(232, 93, 67, 0.25)',
        'card':     '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        'card-lg':  '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      },

      // ── Border radius ──────────────────────────────────────────────────────
      borderRadius: {
        'card':  '12px',
        'card-lg': '24px',
      },

      // ── Animatii ───────────────────────────────────────────────────────────
      transitionDuration: {
        'fast':   '150ms',
        'normal': '250ms',
        'slow':   '400ms',
      },

      // ── Z-index ────────────────────────────────────────────────────────────
      zIndex: {
        'dropdown': '100',
        'sticky':   '200',
        'overlay':  '300',
        'modal':    '400',
        'toast':    '500',
      },

    },
  },
  plugins: [],
};
