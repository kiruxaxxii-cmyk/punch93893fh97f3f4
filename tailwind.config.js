/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        punch: {
          bg: '#070310',
          panel: 'rgba(12, 10, 18, 0.55)',
          accent: '#a855f7',
          accentSoft: '#c084fc',
          glow: 'rgba(168, 85, 247, 0.5)',
          title: '#f5f3ff',
          muted: 'rgba(233, 213, 255, 0.82)',
          dim: 'rgba(196, 181, 253, 0.88)',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(168, 85, 247, 0.25)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
