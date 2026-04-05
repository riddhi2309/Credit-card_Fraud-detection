/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#040d1a',
          900: '#071428',
          800: '#0d2045',
          700: '#122a5c',
          600: '#1a3a7a',
        },
        electric: {
          400: '#00ff88',
          500: '#00e67a',
          600: '#00cc6a',
        },
        amber: {
          400: '#ffb347',
          500: '#ff9500',
        },
        danger: {
          400: '#ff4757',
          500: '#ff2d3f',
        },
        slate: {
          850: '#131c2e',
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(0,255,136,0.15)',
        'glow-red': '0 0 20px rgba(255,71,87,0.2)',
        'glow-amber': '0 0 20px rgba(255,179,71,0.15)',
        'card': '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
