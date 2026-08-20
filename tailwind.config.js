/** @type {import('tailwindcss').Config} */
export default {
    // Bật dark mode theo class 'dark' trên thẻ <html>
    // (JS sẽ toggle class này + lưu lựa chọn vào localStorage — xem src/hooks/useTheme.js)
    darkMode: 'class',

    content: ['./index.html', './src/**/*.{js,jsx}'],

    theme: {
        extend: {
            colors: {
                // ------------------------------------------------------------------
                // Bảng màu "Hồng tối giản" — dùng chung cho cả light & dark mode.
                // Các class thực tế trong component sẽ dùng cặp light/dark, ví dụ:
                //   bg-blossom-bg dark:bg-blossom-bg-dark
                // ------------------------------------------------------------------
                blossom: {
                    // Light mode
                    bg: '#FFF5F7',        // Nền chính — hồng phấn sữa
                    card: '#FFFFFF',       // Vùng nội dung / card
                    'card-soft': '#FFF0F4', // Card phụ, hồng nhạt hơn 1 chút so với nền
                    border: '#FBE1E9',      // Viền tinh tế
                    text: '#333333',        // Văn bản chính — xám đậm, không đen tuyền
                    muted: '#8A7A80',       // Văn bản phụ — hồng tro nhạt

                    // Dark mode
                    'bg-dark': '#2D1B22',        // Nền chính — than chì hồng
                    'card-dark': '#1F1217',       // Card — tối hơn nền 1 chút
                    'card-soft-dark': '#271821',  // Card phụ trong dark mode
                    'border-dark': '#3D2530',
                    'text-dark': '#FFEBF0',       // Văn bản chính — hồng tro rất nhạt
                    'muted-dark': '#C9A3B0',      // Văn bản phụ

                    // Màu điểm nhấn — dùng chung 2 mode, chỉ đổi sắc độ hover
                    accent: '#FF6B9B',
                    'accent-hover': '#FF4785',
                    'accent-dark': '#FF7FAE',      // nổi bật hơn 1 chút trên nền tối
                    'accent-dark-hover': '#FF6B9B',
                },
            },

            // Bo góc chuẩn hoá 8–12px cho card/button/input
            borderRadius: {
                DEFAULT: '8px',
                lg: '10px',
                xl: '12px',
                '2xl': '16px',
            },

            // Đổ bóng RẤT tinh tế — chỉ dùng cho trạng thái hover, không dùng mặc định
            // (tinh thần tối giản: card mặc định chỉ có viền mỏng, không có shadow nặng)
            boxShadow: {
                soft: '0 2px 10px rgba(255, 107, 155, 0.08)',
                'soft-dark': '0 2px 14px rgba(0, 0, 0, 0.35)',
            },

            keyframes: {
                pop: {
                    '0%': { transform: 'scale(0.98)', opacity: '0.4' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                // Hiệu ứng hiện dần khi phần tử xuất hiện trong viewport (scroll reveal)
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },

            animation: {
                pop: 'pop 180ms ease-out',
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
            },
        },
    },

    plugins: [],
}