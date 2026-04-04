import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#22c55e',
          dim:    '#16a34a',
          dark:   '#15803d',
        },
        slate: {
          950: '#0a1224',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50:  '#f8fafc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '8px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.4,0,.2,1)',
      },
      transitionDuration: {
        DEFAULT: '160ms',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04)',
        glow:  '0 0 24px rgba(34,197,94,.2), 0 0 48px rgba(34,197,94,.08)',
        modal: '0 24px 80px rgba(0,0,0,.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(.4,0,.6,1) infinite',
        'spin-slow':  'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
