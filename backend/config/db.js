import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Supabase yêu cầu SSL
  }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu Supabase:', err.stack);
  } else {
    console.log('Đã kết nối thành công tới Supabase PostgreSQL!');
    release();
  }
});

export default pool;