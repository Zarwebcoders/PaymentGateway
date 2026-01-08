/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    black: '#0a0a0a',
                    dark: '#111111',
                    gray: '#1f1f1f',
                    accent: '#00f3ff', // Cyan Neon
                    primary: '#7000ff', // Purple Neon
                    success: '#00ff9d',
                    danger: '#ff0055'
                }
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'], // Tech feel
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
