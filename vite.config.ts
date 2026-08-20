import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,       // cho phép truy cập qua localhost và IP LAN (vd: từ điện thoại cùng mạng)
    port: 5173,        // cố định cổng để URL luôn là http://localhost:5173/
    strictPort: false, // nếu 5173 đang bận thì tự chuyển sang cổng trống kế tiếp thay vì lỗi
    open: false,
  },
  preview: {
    port: 5173,
  },
})