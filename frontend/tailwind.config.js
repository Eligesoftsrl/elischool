/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ['Outfit', 'sans-serif'],
                sans: ['Manrope', 'system-ui', 'sans-serif'],
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                brand: {
                    DEFAULT: '#2F7D6D',
                    hover: '#276A5C',
                    pressed: '#1F5549',
                    light: '#E3F0EC',
                },
                accent2: {
                    DEFAULT: '#F2A65A',
                    dark: '#D88B40',
                },
                cat: {
                    pappa: '#FCE3C7',
                    nanna: '#DCD6F5',
                    igiene: '#D3E8F6',
                    attivita: '#FBEBA8',
                    presenze: '#D5EDE5',
                },
                semantic: {
                    success: '#237A4B',
                    warning: '#E0A100',
                    critical: '#C8443A',
                    info: '#2F6BC0',
                },
                stone: {
                    50: '#F7F5F0',
                    100: '#F0ECE4',
                    200: '#E2DED6',
                    300: '#CFCAC0',
                    400: '#8A8F93',
                    500: '#5E6469',
                    600: '#4A4F53',
                    700: '#3A3E42',
                    800: '#2B2F33',
                    900: '#1E2124',
                },
                act: {
                    didattica: '#FBEBA8',
                    motoria: '#FCE3C7',
                    pranzo: '#FCE3C7',
                    riposo: '#DCD6F5',
                    bagno: '#D3E8F6',
                },
            },
            borderRadius: {
                lg: '1rem',
                xl: '1.25rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
                '4xl': '2.5rem',
            },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
            },
        },
    },
    plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
