/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#dce5f2',
          200: '#b9cce6',
          300: '#8aaad5',
          400: '#5982be',
          500: '#3561a3',
          600: '#254a86',
          700: '#1d3a6c',
          800: '#162c54',
          900: '#0f1e3d',
          950: '#091226',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 30, 61, 0.06), 0 1px 2px -1px rgba(15, 30, 61, 0.04)',
        'card-lg': '0 10px 30px -5px rgba(15, 30, 61, 0.08), 0 4px 12px -4px rgba(15, 30, 61, 0.04)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.35s ease-out forwards',
        'slide-in-right': 'slideInRight 0.25s ease-out forwards',
      },
    },
  },
  plugins: [],
};
