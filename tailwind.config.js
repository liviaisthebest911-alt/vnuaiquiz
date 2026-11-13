/** @type {import('tailwindcss').Config} */

// Màu đọc từ biến CSS (kênh RGB) trong src/workspace.css → một lớp token duy nhất cho cả CSS thuần lẫn Tailwind.
// Biến tự đổi giá trị dưới class 'dark' trên <html>, nên các khoá *-dark trỏ cùng biến với khoá sáng:
// class cũ kiểu `bg-blossom-card dark:bg-blossom-card-dark` vẫn đúng ở cả hai chế độ.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`
const pair = (key, name) => ({ [key]: token(name), [`${key}-dark`]: token(name) })

export default {
    darkMode: 'class',

    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],

    theme: {
        extend: {
            fontFamily: {
                sans: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                display: ['Nunito', '"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },

            colors: {
                blossom: {
                    ...pair('bg', 'bg'),
                    ...pair('card', 'surface'),
                    ...pair('card-soft', 'soft'),
                    ...pair('border', 'line'),
                    ...pair('text', 'ink'),
                    ...pair('muted', 'muted'),
                    ...pair('accent', 'cta'),
                    ...pair('accent-hover', 'cta-hover'),
                    ...pair('gold', 'petal-ink'),
                    'gold-soft': token('petal-soft'),
                },
                // Xanh trời: màu chủ đạo, trạng thái "đúng" / "đã làm"
                cloud: { DEFAULT: token('sky'), soft: token('soft'), strong: token('soft-strong'), deep: token('deep'), ink: token('link') },
                // Hồng pastel: điểm nhấn, trạng thái "sai" / "đánh dấu"
                petal: { DEFAULT: token('petal'), soft: token('petal-soft'), line: token('petal-line'), ink: token('petal-ink') },
                // Lavender: flashcard, tag, cảnh báo nhẹ
                lilac: { DEFAULT: token('lilac'), ink: token('lilac-ink') },
            },
            borderRadius: { DEFAULT: '8px', lg: '10px', xl: '14px', '2xl': '20px', '3xl': '24px' },
            boxShadow: {
                soft: '0 14px 34px -22px rgb(var(--c-shadow) / .45)',
                'soft-dark': '0 14px 34px -22px rgb(var(--c-shadow) / .45)',
            },

            keyframes: {
                pop: {
                    '0%': { transform: 'scale(0.98)', opacity: '0.4' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },

            animation: {
                pop: 'pop 180ms ease-out',
                'fade-in-up': 'fadeInUp 240ms ease-out both',
            },
        },
    },

    plugins: [],
}
