/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                vnu: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    500: '#2563eb',
                    600: '#1d4ed8',
                    700: '#1e40af',
                    900: '#1e3a8a',
                },
            },

            boxShadow: {
                soft: '0 10px 35px rgba(15, 23, 42, 0.08)',
            },

            keyframes: {
                pop: {
                    '0%': {
                        transform: 'scale(0.98)',
                        opacity: '0.4',
                    },
                    '100%': {
                        transform: 'scale(1)',
                        opacity: '1',
                    },
                },
            },

            animation: {
                pop: 'pop 180ms ease-out',
            },
        },
    },

    plugins: [],
}