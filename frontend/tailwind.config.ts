import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#050507',
          secondary: '#080816',
          tertiary: '#0D0B22',
        },
        primary: {
          DEFAULT: '#7B3EFF',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#4C6FFF',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#6BCBFF',
          foreground: '#050507',
        },
        highlight: {
          DEFAULT: '#B388FF',
        },
        foreground: {
          DEFAULT: '#FFFFFF',
          secondary: '#C8CBD6',
          muted: '#8B8FA8',
        },
        success: {
          DEFAULT: '#22C55E',
          muted: '#166534',
          bg: 'rgba(34, 197, 94, 0.1)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: '#92400E',
          bg: 'rgba(245, 158, 11, 0.1)',
        },
        danger: {
          DEFAULT: '#EF4444',
          muted: '#991B1B',
          bg: 'rgba(239, 68, 68, 0.1)',
        },
        pending: {
          DEFAULT: '#94A3B8',
          bg: 'rgba(148, 163, 184, 0.1)',
        },
        'in-progress': {
          DEFAULT: '#4C6FFF',
          bg: 'rgba(76, 111, 255, 0.1)',
        },
        blocked: {
          DEFAULT: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.1)',
        },
        overdue: {
          DEFAULT: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.1)',
        },
        completed: {
          DEFAULT: '#22C55E',
          bg: 'rgba(34, 197, 94, 0.1)',
        },
        escalated: {
          DEFAULT: '#FF6B6B',
          bg: 'rgba(255, 107, 107, 0.1)',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.04)',
          elevated: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.15)',
          focus: '#7B3EFF',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        hero: ['clamp(3rem, 8vw, 7.5rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        display: ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        headline: ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        title: ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        label: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.12em' }],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7B3EFF 0%, #4C6FFF 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4C6FFF 0%, #6BCBFF 100%)',
        'gradient-full': 'linear-gradient(135deg, #7B3EFF 0%, #4C6FFF 50%, #6BCBFF 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-nebula':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(123,62,255,0.3) 0%, transparent 60%)',
        'gradient-glow':
          'radial-gradient(ellipse at center, rgba(123,62,255,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        glow: '0 0 20px rgba(123, 62, 255, 0.4)',
        'glow-sm': '0 0 10px rgba(123, 62, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(123, 62, 255, 0.5)',
        'glow-accent': '0 0 20px rgba(107, 203, 255, 0.4)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-elevated': '0 16px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        card: '0 4px 16px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}

export default config
