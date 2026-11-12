import dotenv from 'dotenv';
import './config/db.js'; // Import để kích hoạt test kết nối DB khi chạy server
import app from './app.js';

dotenv.config();

if (!process.env.SUPABASE_URL) console.warn('Thiếu SUPABASE_URL: mọi API cần đăng nhập sẽ lỗi 500.');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend Server đang chạy tại http://localhost:${PORT}`));
