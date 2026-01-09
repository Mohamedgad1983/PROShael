/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f1ff',
          100: '#e0e4ff',
          200: '#c7cdfe',
          300: '#a4abfc',
          400: '#8182f8',
          500: '#667eea',
          600: '#5a5edf',
          700: '#4c4bc4',
          800: '#3f409e',
          900: '#373a7d',
        },
        purple: {
          500: '#764ba2',
          600: '#6a4190',
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 15px rgba(0,0,0,0.1)',
        'card-sm': '0 2px 8px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'card': '16px',
        'card-sm': '12px',
      }
    },
  },
  plugins: [],
}
