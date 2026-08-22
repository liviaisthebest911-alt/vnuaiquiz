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
                    '"Plus Jakarta Sans"',
                    'Inter',
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif',
                ],
            },

            colors: {
                // ------------------------------------------------------------------
                // Bảng màu "Minimalist & Luxurious" — Rose Water pastel + Champagne
                // Gold. Giữ nguyên tên token `blossom.*` để không phải sửa lại
                // className ở từng component — chỉ đổi GIÁ TRỊ màu bên dưới.
                // ------------------------------------------------------------------
                blossom: {
                    // Light mode
                    bg: '#FAF9F9',            // Trắng sữa / xám cực nhạt
                    card: '#FFFFFF',           // Nền card (dùng kèm /60 + backdrop-blur ở component để glass)
                    'card-soft': '#FDF2F4',    // Card phụ — hồng phấn rất nhạt (rose-50)
                    border: '#F1E4E7',         // Viền tinh tế, gần như vô hình
                    text: '#334155',           // Charcoal (slate-700) — không dùng đen tuyền
                    muted: '#6B7280',          // Xám nhạt (gray-500) cho văn bản phụ

                    // Dark mode — giữ tinh thần sang trọng, nền than nhẹ ánh hồng
                    'bg-dark': '#221A1D',
                    'card-dark': '#2A2023',
                    'card-soft-dark': '#332528',
                    'border-dark': '#3D2E32',
                    'text-dark': '#F4E9EC',
                    'muted-dark': '#B9A5AB',

                    // Primary — hồng pastel thanh lịch (rose-200 → rose-300)
                    accent: '#FDA4AF',
                    'accent-hover': '#FB7185',
                    'accent-dark': '#FDA4AF',
                    'accent-dark-hover': '#FECDD3',

                    // Điểm nhấn sang trọng — vàng đồng nhạt (Champagne Gold)
                    gold: '#C9A66B',
                    'gold-soft': '#E8D9BC',
                    'gold-dark': '#D8BE8C',
                },
            },

            // Bo góc sâu hơn — cảm giác cao cấp, "thở" hơn
            borderRadius: {
                DEFAULT: '12px',
                lg: '16px',
                xl: '20px',
                '2xl': '28px',
                '3xl': '32px',
            },

            // Đổ bóng như ánh sáng mờ lan toả, không phải bóng đen thô
            boxShadow: {
                soft: '0 10px 40px -8px rgba(31, 41, 55, 0.10)',
                'soft-dark': '0 10px 40px -8px rgba(0, 0, 0, 0.5)',
                glow: '0 0 0 1px rgba(255,255,255,0.4), 0 12px 30px -10px rgba(201, 166, 107, 0.25)',
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