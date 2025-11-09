/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';
import forms from '@tailwindcss/forms';

const config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#A16AE8',
          secondary: '#8096FD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 2px rgba(161,106,232,0.4), 0 0 24px -4px rgba(161,106,232,0.6)',
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease both',
        slideUp: 'slideUp 0.5s cubic-bezier(.25,.8,.25,1) both',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [
    typography,
    forms,
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* Firefox */
          'scrollbar-width': 'none',
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Chrome, Safari, Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
};

export default config;
