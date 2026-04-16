/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel:
          '0 24px 60px -30px rgba(8, 145, 178, 0.55), 0 0 0 1px rgba(148, 163, 184, 0.14)',
      },
      animation: {
        rise: 'rise 560ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translate3d(0, 14px, 0) scale(0.992)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

