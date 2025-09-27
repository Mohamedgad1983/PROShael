/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        'arabic': ['Cairo', 'Tajawal', 'sans-serif'],
        'tajawal': ['Tajawal', 'sans-serif'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
        'apple': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        secondary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },
        // Apple Design System Colors
        apple: {
          blue: {
            primary: '#007AFF',
            secondary: '#5AC8FA',
            tertiary: '#0051D5',
          },
          purple: {
            primary: '#5856D6',
            secondary: '#AF52DE',
          },
          green: '#34C759',
          yellow: '#FFCC00',
          red: '#FF3B30',
          gray: {
            900: '#1D1D1F',
            600: '#86868B',
            300: '#C7C7CC',
            100: '#F5F5F7',
          }
        }
      },
      // Apple-inspired spacing and sizing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      // Smooth animations for Apple feel
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      // Enhanced shadows for glassmorphism
      boxShadow: {
        'glass': '0 8px 32px rgba(31, 38, 135, 0.15)',
        'apple': '0 10px 40px rgba(0, 0, 0, 0.08)',
        'floating': '0 15px 50px rgba(0, 0, 0, 0.12)',
      },
      // Backdrop blur support
      backdropBlur: {
        'apple': '40px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};