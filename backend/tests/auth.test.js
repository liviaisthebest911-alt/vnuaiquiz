// Integration P2: xác thực + phân quyền trên Postgres thật (migration 001 + 002) và JWKS ES256 giả lập Supabase Auth.
// Chạy khi có TEST_DATABASE_URL trỏ tới Postgres CỤC BỘ (như db.test.js).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { SignJWT, exportJWK, generateKeyPair, UnsecuredJWT } from 'jose';
import { isLocalDatabase } from '../config/dbSsl.js';

const BASE = process.env.TEST_DATABASE_URL;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const sql = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('P2: xác thực & phân quyền', { skip: !BASE && 'đặt TEST_DATABASE_URL để chạy' }, () => {
  const dbName = `vnuaiquiz_p2_test_${process.pid}`;
  const KID = 'test-key';
  let admin; let db; let jwksServer; let apiServer; let api; let issuer; let key; let otherKey; let pool;
  const ids = {};
  let subjectId;
  let jwksDown = false;

  const one = async (text, params) => (await db.query(text, params)).rows[0];
  const sign = (sub, { claims = {}, signer = key, iss = issuer, aud = 'authenticated', exp = '5m', alg = 'ES256', kid = KID } = {}) =>
    new SignJWT({ role: 'authenticated', ...claims }).setProtectedHeader({ alg, kid })
      .setSubject(sub).setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime(exp).sign(signer);
  const call = async (method, path, { token, body } = {}) => {
    const res = await fetch(`${api}/api/v1${path}`, {
      method,
      headers: { ...(token && { authorization: `Bearer ${token}` }), ...(body && { 'content-type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  const as = async (who, method, path, body) => call(method, path, { token: await sign(ids[who]), body });

  before(async () => {
    assert.ok(isLocalDatabase(BASE), 'TEST_DATABASE_URL phải là Postgres cục bộ');
    admin = new pg.Client({ connectionString: BASE });
    await admin.connect();
    await admin.query(`drop database if exists ${dbName}`);
    await admin.query(`create database ${dbName}`);
    const u = new URL(BASE); u.pathname = `/${dbName}`;
    db = new pg.Client({ connectionString: u.href });
    await db.connect();
    for (const f of ['tests/fixtures/supabase-auth-stub.sql', 'db/migrations/001_init.sql', 'db/migrations/002_revoke_data_api_grants.sql']) {
      await db.query(sql(f));
    }

    // Người dùng tạo qua auth.users như Supabase (trigger tạo profile); metadata cố tình chứa role admin.
    for (const name of ['user', 'editor', 'admin', 'blocked']) {
      ids[name] = (await one(`insert into auth.users (email, raw_user_meta_data) values ($1, '{"role":"admin"}') returning id`,
        [`${name}@hus.edu.vn`])).id;
    }
    await db.query(`update users set role_id = (select id from roles where code = 'editor') where id = $1`, [ids.editor]);
    await db.query(`update users set role_id = (select id from roles where code = 'admin') where id = $1`, [ids.admin]);
    await db.query(`update users set status = 'blocked', role_id = (select id from roles where code = 'admin') where id = $1`, [ids.blocked]);
    subjectId = (await one(`insert into subjects (code, name) values ('TEST', 'Môn thử') returning id`)).id;

    const pair = await generateKeyPair('ES256');
    key = pair.privateKey;
    ({ privateKey: otherKey } = await generateKeyPair('ES256')); // ký cùng kid nhưng khác khoá → phải bị từ chối
    const jwk = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: 'ES256', use: 'sig' };
    jwksServer = createServer((req, res) => {
      if (jwksDown) { res.statusCode = 503; return res.end(); }
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise((r) => jwksServer.listen(0, '127.0.0.1', r));
    process.env.SUPABASE_URL = `http://127.0.0.1:${jwksServer.address().port}`;
    issuer = `${process.env.SUPABASE_URL}/auth/v1`;
    process.env.DATABASE_URL = u.href; // trước khi import app → config/db.js dùng DB tạm (dotenv không ghi đè)

    const { default: app } = await import('../app.js');
    pool = (await import('../config/db.js')).default;
    apiServer = app.listen(0, '127.0.0.1');
    await new Promise((r) => apiServer.once('listening', r));
    api = `http://127.0.0.1:${apiServer.address().port}`;
  });

  after(async () => {
    apiServer?.close();
    jwksServer?.close();
    await pool?.end();
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  test('(chạy trước mọi test có token) JWKS lỗi (Supabase sự cố) → 500, không biến thành 401 "phiên hết hạn"', async () => {
    jwksDown = true;
    try {
      const r = await call('GET', '/me', { token: await sign(ids.user, ) }); // chạy đầu tiên: JWKS chưa được cache
      assert.equal(r.status, 500);
      assert.equal(r.body.error.code, 'INTERNAL');
    } finally { jwksDown = false; }
  });

  test('thiếu token → 401', async () => {
    const r = await call('GET', '/me');
    assert.equal(r.status, 401);
    assert.equal(r.body.error.code, 'UNAUTHENTICATED');
  });

  test('token sai: rác, khoá khác, hết hạn, sai issuer/audience, HS256, alg none → đều 401', async () => {
    const hs = await new SignJWT({}).setProtectedHeader({ alg: 'HS256', kid: KID }).setSubject(ids.admin)
      .setIssuer(issuer).setAudience('authenticated').setExpirationTime('5m').sign(new TextEncoder().encode('x'.repeat(32)));
    const none = new UnsecuredJWT({}).setSubject(ids.admin).setIssuer(issuer).setAudience('authenticated').setExpirationTime('5m').encode();
    const tokens = {
      garbage: 'abc.def.ghi',
      otherKey: await sign(ids.admin, { signer: otherKey }),
      expired: await sign(ids.admin, { exp: Math.floor(Date.now() / 1000) - 10 }),
      wrongIssuer: await sign(ids.admin, { iss: 'https://evil.example.com/auth/v1' }),
      wrongAudience: await sign(ids.admin, { aud: 'anon' }),
      hs256: hs,
      none,
    };
    for (const [name, token] of Object.entries(tokens)) {
      const r = await call('GET', '/me', { token });
      assert.equal(r.status, 401, name);
      assert.deepEqual(Object.keys(r.body.error), ['code', 'message'], `${name}: không lộ chi tiết`);
    }
  });

  test('token hợp lệ nhưng không có profile (user đã xoá) hoặc phiên ẩn danh → 401', async () => {
    assert.equal((await call('GET', '/me', { token: await sign(randomUUID()) })).status, 401);
    assert.equal((await call('GET', '/me', { token: await sign(ids.user, { claims: { is_anonymous: true } }) })).status, 401);
    assert.equal((await call('GET', '/me', { token: await sign('not-a-uuid') })).status, 401);
  });

  test('người dùng bị khoá → 403 ACCOUNT_BLOCKED ở mọi endpoint, kể cả khi là admin', async () => {
    for (const [m, p] of [['GET', '/me'], ['PATCH', '/me'], ['POST', `/admin/subjects/${subjectId}/approve`]]) {
      const r = await as('blocked', m, p, m === 'GET' ? undefined : { full_name: 'x' });
      assert.equal(r.status, 403, `${m} ${p}`);
      assert.equal(r.body.error.code, 'ACCOUNT_BLOCKED');
    }
  });

  test('GET /me: vai trò lấy từ DB, bỏ qua role trong user_metadata/app_metadata/claim', async () => {
    const token = await sign(ids.user, { claims: {
      role: 'service_role', user_metadata: { role: 'admin' }, app_metadata: { role: 'admin' } } });
    const r = await call('GET', '/me', { token });
    assert.equal(r.status, 200);
    assert.deepEqual({ email: r.body.data.email, role: r.body.data.role, status: r.body.data.status },
      { email: 'user@hus.edu.vn', role: 'user', status: 'active' });
  });

  test('PATCH /me: chỉ đổi full_name/student_code; role/status/email/id trong body bị bỏ qua', async () => {
    const r = await as('user', 'PATCH', '/me', {
      full_name: '  Nguyễn Văn A ', student_code: '20000001', role: 'admin', role_id: randomUUID(),
      status: 'active', email: 'x@evil.com', id: ids.admin });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.full_name, 'Nguyễn Văn A');
    const row = await one(`select u.email, u.full_name, u.student_code, r.code role from users u join roles r on r.id = u.role_id where u.id = $1`, [ids.user]);
    assert.deepEqual(row, { email: 'user@hus.edu.vn', full_name: 'Nguyễn Văn A', student_code: '20000001', role: 'user' });
    assert.equal((await one(`select r.code from users u join roles r on r.id = u.role_id where u.id = $1`, [ids.admin])).code, 'admin');
  });

  test('PATCH /me: chỉ gửi role → 422; dữ liệu sai → 422; mã SV trùng → 409; chuỗi rỗng xoá giá trị', async () => {
    assert.equal((await as('editor', 'PATCH', '/me', { role: 'admin' })).status, 422);
    assert.equal((await as('editor', 'PATCH', '/me', { full_name: 42 })).status, 422);
    assert.equal((await as('editor', 'PATCH', '/me', { student_code: 'a b; drop' })).status, 422);
    assert.equal((await as('editor', 'PATCH', '/me', { student_code: 'qht01' })).body.data.student_code, 'QHT01');
    assert.equal((await as('admin', 'PATCH', '/me', { student_code: 'QHT01' })).status, 409, 'trùng không phân biệt hoa/thường');
    assert.equal((await as('editor', 'PATCH', '/me', { full_name: 'x'.repeat(101) })).status, 422);
    const dup = await as('editor', 'PATCH', '/me', { student_code: '20000001' });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, 'CONFLICT');
    const cleared = await as('user', 'PATCH', '/me', { student_code: '' });
    assert.equal(cleared.body.data.student_code, null);
    assert.equal((await one(`select r.code from users u join roles r on r.id = u.role_id where u.id = $1`, [ids.editor])).code, 'editor');
  });

  test('user gọi API quản trị → 403, kể cả khi token mang role admin trong metadata', async () => {
    const token = await sign(ids.user, { claims: { user_metadata: { role: 'admin' }, app_metadata: { role: 'admin' } } });
    for (const action of ['submit', 'approve']) {
      const r = await call('POST', `/admin/subjects/${subjectId}/${action}`, { token, body: { role: 'admin' } });
      assert.equal(r.status, 403, action);
      assert.equal(r.body.error.code, 'FORBIDDEN');
    }
    assert.equal((await one('select status from subjects where id = $1', [subjectId])).status, 'draft');
  });

  test('editor gửi duyệt được nhưng approve/reject/hide/unhide → 403, trạng thái không đổi', async () => {
    const r = await as('editor', 'POST', `/admin/subjects/${subjectId}/submit`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'in_review');
    for (const action of ['approve', 'reject', 'hide', 'unhide']) {
      const x = await as('editor', 'POST', `/admin/subjects/${subjectId}/${action}`, { note: 'x', role: 'admin' });
      assert.equal(x.status, 403, action);
    }
    assert.equal((await one('select status from subjects where id = $1', [subjectId])).status, 'in_review');
  });

  test('admin: reject cần note; approve → published; hide/unhide; chuyển sai trạng thái → 409; ghi audit_logs', async () => {
    assert.equal((await as('admin', 'POST', `/admin/subjects/${subjectId}/reject`, {})).status, 422);
    assert.equal((await as('admin', 'POST', `/admin/subjects/${subjectId}/approve`)).status, 200);
    const again = await as('admin', 'POST', `/admin/subjects/${subjectId}/approve`);
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'INVALID_TRANSITION');
    assert.equal((await as('admin', 'POST', `/admin/subjects/${subjectId}/hide`)).body.data.status, 'hidden');
    assert.equal((await as('admin', 'POST', `/admin/subjects/${subjectId}/unhide`)).body.data.status, 'published');
    const logs = (await db.query(`select actor_id, action, details from audit_logs where entity_id = $1 order by created_at, action`, [subjectId])).rows;
    assert.deepEqual(logs.map((l) => l.action).sort(), ['approve', 'hide', 'submit', 'unhide']);
    assert.ok(logs.find((l) => l.action === 'submit').actor_id === ids.editor);
  });

  test('admin reject lưu note; câu hỏi ẩn = archived; đề không có câu không duyệt được', async () => {
    const qid = (await one(`with q as (insert into questions (subject_id, content, status) values ($1, 'q', 'in_review') returning id),
      o as (insert into question_options (question_id, position, content, is_correct)
            select id, p, 'o', p = 0 from q, generate_series(0, 1) p) select id from q`, [subjectId])).id;
    assert.equal((await as('admin', 'POST', `/admin/questions/${qid}/reject`, { note: ' sai đáp án ' })).body.data.status, 'draft');
    const log = await one(`select details from audit_logs where entity_id = $1 and action = 'reject'`, [qid]);
    assert.deepEqual(log.details, { from: 'in_review', to: 'draft', note: 'sai đáp án' });
    await db.query(`update questions set status = 'published' where id = $1`, [qid]);
    assert.equal((await as('admin', 'POST', `/admin/questions/${qid}/hide`)).body.data.status, 'archived');

    const eid = (await one(`insert into exams (subject_id, title, duration_minutes, status) values ($1, 'Đề', 30, 'in_review') returning id`, [subjectId])).id;
    const r = await as('admin', 'POST', `/admin/exams/${eid}/approve`);
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'EXAM_NOT_READY');
    await db.query(`insert into exam_questions (exam_id, question_id, position) values ($1, $2, 1)`, [eid, qid]);
    assert.equal((await as('admin', 'POST', `/admin/exams/${eid}/approve`)).status, 409, 'câu đang archived');
    await db.query(`update questions set status = 'published' where id = $1`, [qid]);
    assert.equal((await as('admin', 'POST', `/admin/exams/${eid}/approve`)).status, 200);
    assert.ok((await one('select published_at from exams where id = $1', [eid])).published_at);
    const mid = (await one(`with c as (insert into material_categories (code, name) values ('test', 'Thử') returning id)
      insert into materials (subject_id, category_id, title, storage_path, original_filename, mime_type, size_bytes, status)
      select $1, c.id, 'TL', 'materials/x.pdf', 'x.pdf', 'application/pdf', 10, 'in_review' from c returning id`, [subjectId])).id;
    assert.equal((await as('admin', 'POST', `/admin/materials/${mid}/approve`)).status, 200);
    assert.ok((await one('select published_at from materials where id = $1', [mid])).published_at);
  });

  test('loại/hành động lạ → 404; id không phải UUID hoặc không tồn tại → 404', async () => {
    assert.equal((await as('admin', 'POST', `/admin/users/${ids.user}/approve`)).status, 404);
    assert.equal((await as('admin', 'POST', `/admin/subjects/${subjectId}/force-publish`)).status, 404);
    assert.equal((await as('admin', 'POST', `/admin/subjects/1;drop/approve`)).status, 404);
    assert.equal((await as('admin', 'POST', `/admin/subjects/${randomUUID()}/approve`)).status, 404);
    assert.equal((await as('admin', 'POST', `/admin/__proto__/${subjectId}/approve`)).status, 404);
  });

  test('script set-role: từ chối DB từ xa/email lạ; nâng quyền tài khoản có sẵn + ghi audit_logs', async () => {
    const run = (url, ...args) => spawnSync(process.execPath, ['db/seed/set-role.js', ...args], {
      cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, DATABASE_URL: url } });
    const remote = run('postgres://u:secret@db.example.com:5432/postgres', 'a@b.c', 'admin');
    assert.equal(remote.status, 1);
    assert.ok(!remote.stderr.includes('secret'));
    assert.equal(run(process.env.DATABASE_URL, 'nobody@hus.edu.vn', 'admin').status, 1);
    assert.equal(run(process.env.DATABASE_URL, 'user@hus.edu.vn', 'root').status, 1);
    const { id } = await one(`insert into auth.users (email) values ('first-admin@hus.edu.vn') returning id`);
    const r = run(process.env.DATABASE_URL, 'First-Admin@hus.edu.vn', 'admin');
    assert.equal(r.status, 0, r.stderr);
    assert.equal((await call('GET', '/me', { token: await sign(id) })).body.data.role, 'admin');
    assert.ok(await one(`select 1 from audit_logs where action = 'set_role' and entity_id = $1`, [id]));
  });

  test('rate limit: quá 60 yêu cầu/phút → 429 RATE_LIMITED', async () => {
    let r;
    for (let i = 0; i < 61 && r?.status !== 429; i++) r = await call('GET', '/me');
    assert.equal(r.status, 429);
    assert.equal(r.body.error.code, 'RATE_LIMITED');
  });
});
