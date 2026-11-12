// Đặt vai trò cho một tài khoản ĐÃ đăng ký (đăng nhập ít nhất một lần để có profile) – dùng tạo admin đầu tiên.
// Không có endpoint tự nâng quyền; sau khi có admin, đổi vai trò qua PATCH /admin/users/:id (P6).
//
//   DATABASE_URL=postgres://... node db/seed/set-role.js <email> <user|editor|admin> [--allow-remote]
import pg from 'pg';
import { databaseHost, dbSsl, isLocalDatabase } from '../../config/dbSsl.js';

const [email, role] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const url = process.env.DATABASE_URL; // cố ý không đọc .env: tránh đổi quyền nhầm DB
if (!url || !email || !['user', 'editor', 'admin'].includes(role)) {
  console.error('Dùng: DATABASE_URL=... node db/seed/set-role.js <email> <user|editor|admin> [--allow-remote]');
  process.exit(1);
}

let client;
try {
  const host = databaseHost(url);
  if (!isLocalDatabase(url) && !process.argv.includes('--allow-remote')) {
    console.error(`Từ chối đổi quyền trên ${host}. Thêm --allow-remote nếu chắc chắn.`);
    process.exit(1);
  }
  client = new pg.Client({ connectionString: url, ssl: dbSsl(url) });
} catch (err) {
  console.error(err.message); // không chứa chuỗi kết nối
  process.exit(1);
}

try {
  await client.connect();
  await client.query('begin');
  const { rows } = await client.query(
    `update public.users u set role_id = r.id from public.roles r
      where lower(u.email) = lower($1) and r.code = $2
      returning u.id, u.status`, [email, role]);
  if (rows.length !== 1) throw new Error(`Không tìm thấy tài khoản ${email} (đã đăng nhập lần nào chưa?)`);
  await client.query(
    `insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
     values (null, 'set_role', 'users', $1, $2)`, [rows[0].id, { role, via: 'db/seed/set-role.js' }]);
  await client.query('commit');
  console.log(`${email} → ${role}${rows[0].status === 'blocked' ? ' (CHÚ Ý: tài khoản đang bị khoá)' : ''}`);
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error('Thất bại:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
