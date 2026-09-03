import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: ['class'],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: '',
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },

                // --- NOVAS CORES (ELEGANT SAAS) ---
                'navy-deep': {
                    DEFAULT: '#0B1120', // Fundo principal escuro
                    light: '#151E32',   // Fundo dos cards
                    lighter: '#1E293B',
                },
                'teal-vibrant': {
                    DEFAULT: '#14B8A6', // Teal principal
                    dark: '#0F766E',
                    light: '#2DD4BF',
                    glow: '#4FD1C5',
                },
                'green-gradient': {
                    start: '#10B981',
                    end: '#14B8A6',
                },

                // Mantendo compatibilidade com Brutalism (opcional)
                'medical-dark': '#0A4D3C',
                'medical-teal': '#14B8A6',
                'medical-emerald': '#10B981',
                'slate-deep': '#0F172A',
            },
            fontFamily: {
                'display': ['var(--font-satoshi)', 'Inter', 'system-ui', 'sans-serif'],
                'sans': ['var(--font-general-sans)', 'Inter', 'system-ui', 'sans-serif'],
                'body': ['var(--font-cabinet-grotesk)', 'Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                none: '0',
                xs: '2px',
                sm: '2px',
                DEFAULT: '2px',
                md: '2px',
                lg: '2px',
                xl: '2px',
                '2xl': '2px',
                '3xl': '2px',
                full: '2px',
                brutal: '2px',
            },
            boxShadow: {
                none: 'none',
                xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                md: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                lg: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                xl: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                '2xl': '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                premium: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'glow-teal': 'none',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
}

export default config
