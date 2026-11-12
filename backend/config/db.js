import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { dbSsl } from './dbSsl.js';

dotenv.config();

// DATABASE_URL: connection string pooler của Supabase. Đã kiểm tra trên staging: Session pooler (5432).
// Transaction pooler (6543) chưa kiểm tra – code không dùng prepared statement có tên nên về lý thuyết tương thích.
const connectionString = process.env.DATABASE_URL;

let ssl;
let configError;
try {
  ssl = connectionString ? dbSsl(connectionString) : undefined;
} catch (err) {
  configError = err; // thông báo đã được làm sạch, không chứa chuỗi kết nối
}

const pool = new Pool({ connectionString: configError ? undefined : connectionString, ssl });

if (configError) {
  console.error('Lỗi cấu hình cơ sở dữ liệu:', configError.message);
} else {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Lỗi kết nối cơ sở dữ liệu Supabase:', err.stack);
    } else {
      console.log('Đã kết nối thành công tới Supabase PostgreSQL!');
      release();
    }
  });
}

// Chạy fn(client) trong một transaction. Rollback lỗi (mất kết nối) → giữ lỗi gốc, huỷ client thay vì trả về pool.
export async function withTx(fn) {
  const client = await pool.connect();
  let broken;
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch((e) => { broken = e; });
    throw err;
  } finally {
    client.release(broken);
  }
}

// Nhật ký thao tác quản trị – gọi bằng client của transaction đang ghi dữ liệu để hai việc cùng thành công/thất bại.
export const audit = (db, actorId, action, entityType, entityId, details) => db.query(
  `insert into public.audit_logs (actor_id, action, entity_type, entity_id, details) values ($1, $2, $3, $4, $5)`,
  [actorId, action, entityType, entityId, details]);

export default pool;
