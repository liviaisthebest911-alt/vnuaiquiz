/** @type {import('tailwindcss').Config} */
export default {
    // Bật dark mode theo class 'dark' trên thẻ <html>
    // (JS sẽ toggle class này + lưu lựa chọn vào localStorage — xem src/hooks/useTheme.js)
    darkMode: 'class',

    content: ['./index.html', './src/**/*.{js,jsx}'],

    theme: {
        extend: {
            fontFamily: {
                sans: [
                    '"DM Sans"',
                    'Inter',
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif',
                ],
            },

            colors: {
                blossom: {
                    bg: '#f5f5ee',
                    card: '#fffef8',
                    'card-soft': '#e7efde',
                    border: '#dce1d5',
                    text: '#202920',
                    muted: '#556254',
                    'bg-dark': '#151d17',
                    'card-dark': '#202a21',
                    'card-soft-dark': '#293e2d',
                    'border-dark': '#39483a',
                    'text-dark': '#e9efe5',
                    'muted-dark': '#b6c3b4',
                    accent: '#25563b',
                    'accent-hover': '#1e4731',
                    'accent-dark': '#a7cd8f',
                    'accent-dark-hover': '#c3e5a6',
                    gold: '#825f2d',
                    'gold-soft': '#eee2cc',
                    'gold-dark': '#e6c58e',
                },
            },
            borderRadius: { DEFAULT: '7px', lg: '9px', xl: '12px', '2xl': '15px', '3xl': '16px' },
            boxShadow: {
                soft: '0 8px 24px -14px rgba(27, 49, 35, .3)',
                'soft-dark': '0 8px 24px -14px rgba(0, 0, 0, .45)',
            },

            keyframes: {
                pop: {
                    '0%': { transform: 'scale(0.98)', opacity: '0.4' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                // Hiệu ứng hiện dần khi phần tử xuất hiện trong viewport (scroll reveal)
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },

            animation: {
                pop: 'pop 180ms ease-out',
                'fade-in-up': 'fadeInUp 0.7s ease-in-out forwards',
            },
        },
    },

    plugins: [],
}