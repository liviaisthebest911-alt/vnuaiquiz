// Integration P4 (mốc 1): kho tài liệu – admin tạo môn/chương, upload, duyệt; sinh viên/khách tìm, lọc, xem, tải.
// Postgres thật (001 + 002) + Supabase giả (JWKS + Storage). Cần TEST_DATABASE_URL cục bộ như db.test.js.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { isLocalDatabase } from '../config/dbSsl.js';
import { startFakeSupabase } from './helpers/fakeSupabase.js';

const BASE = process.env.TEST_DATABASE_URL;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200, 1)]);

describe('P4: kho tài liệu', { skip: !BASE && 'đặt TEST_DATABASE_URL để chạy' }, () => {
  const dbName = `vnuaiquiz_p4_test_${process.pid}`;
  let admin; let db; let fake; let server; let api; let pool;
  const ids = {};
  const tokens = {};
  let category;

  const one = async (text, params) => (await db.query(text, params)).rows[0];
  const call = async (method, path, { as, token, body } = {}) => {
    const t = token ?? (as && tokens[as]);
    const res = await fetch(`${api}/api/v1${path}`, {
      method,
      headers: { ...(t && { authorization: `Bearer ${t}` }), ...(body && { 'content-type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  // Luồng upload như trình duyệt: xin URL → PUT thẳng Storage → finalize.
  const upload = async (as, { bytes = PDF, filename = 'Giáo trình chương 1.pdf', mime = 'application/pdf', putType, ...meta }) => {
    const u = await call('POST', '/admin/materials/upload-url', { as, body: { filename, mime_type: mime, size_bytes: bytes.length } });
    assert.equal(u.status, 200, JSON.stringify(u.body));
    const put = await fetch(u.body.data.upload_url, { method: 'PUT', headers: { 'content-type': putType ?? u.body.data.content_type }, body: bytes });
    assert.equal(put.status, 200);
    return { key: u.body.data.storage_path, res: await call('POST', '/admin/materials', { as, body: {
      storage_path: u.body.data.storage_path, original_filename: filename, category_id: category, ...meta } }) };
  };
  const publish = async (type, id) => {
    assert.equal((await call('POST', `/admin/${type}/${id}/submit`, { as: 'editor' })).status, 200);
    assert.equal((await call('POST', `/admin/${type}/${id}/approve`, { as: 'admin' })).status, 200);
  };

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
      await db.query(readFileSync(join(ROOT, f), 'utf8'));
    }
    category = (await one(`insert into material_categories (code, name) values ('textbook', 'Giáo trình') returning id`)).id;
    await db.query(`insert into material_categories (code, name) values ('slide', 'Slide')`);

    fake = await startFakeSupabase();
    // Nhiều editor: URL upload giới hạn 10/phút/người, mỗi nhóm test dùng hạn mức riêng.
    for (const [name, role] of [['user', 'user'], ['admin', 'admin'], ...['editor', 'editor2', 'editor3', 'editor4'].map((e) => [e, 'editor'])]) {
      ids[name] = (await one(`insert into auth.users (email) values ($1) returning id`, [`${name}@hus.edu.vn`])).id;
      if (role !== 'user') await db.query(`update users set role_id = (select id from roles where code = $2) where id = $1`, [ids[name], role]);
      tokens[name] = await fake.sign(ids[name]);
    }
    Object.assign(process.env, { SUPABASE_URL: fake.url, SUPABASE_SECRET_KEY: fake.secretKey, DATABASE_URL: u.href });
    const { default: app } = await import('../app.js');
    pool = (await import('../config/db.js')).default;
    server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    api = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server?.close();
    await fake?.close();
    await pool?.end();
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  test('luồng admin → sinh viên: tạo môn + chương, upload PDF, xuất bản; tìm, lọc, xem, tải', async () => {
    // Admin: môn + chương (draft)
    const s = await call('POST', '/admin/subjects', { as: 'admin', body: { code: ' cnsai2 ', name: 'Công nghệ số 2' } });
    assert.equal(s.status, 201);
    assert.deepEqual([s.body.data.code, s.body.data.status], ['CNSAI2', 'draft']);
    ids.subject = s.body.data.id;
    const c1 = await call('POST', `/admin/subjects/${ids.subject}/chapters`, { as: 'editor', body: { title: 'Chương 1: Tổng quan' } });
    const c2 = await call('POST', `/admin/subjects/${ids.subject}/chapters`, { as: 'editor', body: { title: 'Chương 2: Dữ liệu' } });
    assert.deepEqual([c1.status, c1.body.data.position, c1.body.data.status, c2.body.data.position], [201, 1, 'draft', 2]);
    ids.ch1 = c1.body.data.id; ids.ch2 = c2.body.data.id;

    // Editor upload PDF (draft); admin duyệt
    const { key, res } = await upload('editor', { title: 'Giáo trình Công nghệ số', subject_id: ids.subject, chapter_id: ids.ch1 });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'draft');
    assert.equal(res.body.data.size_bytes, String(PDF.length));
    assert.equal(res.body.data.storage_path, undefined, 'không lộ storage_path');
    ids.material = res.body.data.id;
    ids.key = key;
    const other = await upload('editor', { filename: 'de-cuong.pdf', title: 'Đề cương 100% ôn tập', subject_id: ids.subject, chapter_id: ids.ch2 });
    ids.other = other.res.body.data.id;

    assert.equal((await call('GET', '/materials')).body.meta.total, 0, 'chưa xuất bản → chưa thấy');
    await publish('subjects', ids.subject);
    await publish('chapters', ids.ch1);
    await publish('chapters', ids.ch2);
    await publish('materials', ids.material);
    await publish('materials', ids.other);

    // Sinh viên (khách hoặc user): danh sách môn kèm chương, tìm, lọc
    const subjects = (await call('GET', '/subjects')).body.data;
    const subj = subjects.find((x) => x.id === ids.subject);
    assert.deepEqual(subj.chapters.map((c) => c.title), ['Chương 1: Tổng quan', 'Chương 2: Dữ liệu']);
    assert.equal(subj.material_count, 2);
    const titles = async (qs, as) => (await call('GET', `/materials${qs}`, { as })).body.data.map((m) => m.title).sort();
    assert.deepEqual(await titles(''), ['Giáo trình Công nghệ số', 'Đề cương 100% ôn tập']);
    assert.deepEqual(await titles('?q=giáo TRÌNH', 'user'), ['Giáo trình Công nghệ số']);
    assert.deepEqual(await titles(`?subject_id=${ids.subject}&chapter_id=${ids.ch2}`), ['Đề cương 100% ôn tập']);
    assert.deepEqual(await titles('?q=100%'), ['Đề cương 100% ôn tập']);
    assert.deepEqual(await titles('?q=%25%25'), [], '% là ký tự thường, không phải wildcard');
    assert.deepEqual(await titles('?category=slide'), []);
    const page = await call('GET', '/materials?limit=1&page=2&sort=title');
    assert.deepEqual([page.body.meta, page.body.data.length], [{ page: 2, limit: 1, total: 2 }, 1]);

    // Xem PDF: signed URL 5 phút, mở được; tải xuống ép attachment với tên gốc
    const detail = await call('GET', `/materials/${ids.material}`);
    assert.deepEqual([detail.body.data.subject.code, detail.body.data.chapter.position, detail.body.data.category.code], ['CNSAI2', 1, 'textbook']);
    const view = await call('GET', `/materials/${ids.material}/view`);
    assert.equal(view.status, 200);
    const expiresIn = (Date.parse(view.body.data.expires_at) - Date.now()) / 1000;
    assert.ok(expiresIn > 290 && expiresIn <= 300, `hạn ~5 phút (${expiresIn})`);
    assert.equal([...fake.signTokens.values()].at(-1).expiresIn, 300);
    const file = await fetch(view.body.data.url);
    assert.equal(file.headers.get('content-type'), 'application/pdf');
    assert.equal(file.headers.get('content-disposition'), null, 'xem inline');
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), PDF);
    const dl = await call('GET', `/materials/${ids.material}/download`, { as: 'user' });
    const dlFile = await fetch(dl.body.data.url);
    assert.match(dlFile.headers.get('content-disposition'), /^attachment; filename=".*Gi%C3%A1o%20tr%C3%ACnh%20ch%C6%B0%C6%A1ng%201\.pdf"$/);
    // Object nằm ở bucket private: đường public không mở được
    assert.equal((await fetch(`${fake.url}/storage/v1/object/public/materials/${ids.key}`)).status, 400);

    const logs = (await db.query(`select action, entity_type from audit_logs where entity_id = any($1) order by created_at`,
      [[ids.subject, ids.ch1, ids.material]])).rows.map((r) => `${r.entity_type}:${r.action}`);
    assert.deepEqual(logs.filter((l) => l.startsWith('materials')), ['materials:create', 'materials:submit', 'materials:approve']);
  });

  test('tài liệu nháp / chờ duyệt / đã ẩn không mở được bằng URL trực tiếp (guest, user); editor xem trước được', async () => {
    const { res } = await upload('editor', { filename: 'nhap.pdf', title: 'Bản nháp bí mật', subject_id: ids.subject });
    const draft = res.body.data.id;
    const blocked = async (id, label) => {
      for (const as of [undefined, 'user']) {
        for (const suffix of ['', '/view', '/download']) {
          const r = await call('GET', `/materials/${id}${suffix}`, { as });
          assert.equal(r.status, 404, `${label} ${as ?? 'guest'} ${suffix}`);
          assert.equal(r.body.error.code, 'NOT_FOUND');
        }
      }
      assert.ok(!(await call('GET', '/materials?q=b')).body.data.some((m) => m.id === id), `${label}: không có trong danh sách`);
    };
    await blocked(draft, 'draft');
    assert.equal((await call('GET', `/materials/${draft}/view`, { as: 'editor' })).status, 200, 'editor xem trước bản nháp');
    assert.equal((await call('POST', `/admin/materials/${draft}/submit`, { as: 'editor' })).status, 200);
    await blocked(draft, 'in_review');

    assert.equal((await call('POST', `/admin/materials/${ids.material}/hide`, { as: 'admin' })).status, 200);
    await blocked(ids.material, 'hidden');
    assert.equal((await call('POST', `/admin/materials/${ids.material}/unhide`, { as: 'admin' })).status, 200);
    assert.equal((await call('GET', `/materials/${ids.material}/view`)).status, 200);

    // Tài liệu published nhưng chương / môn bị ẩn → cũng không lộ
    assert.equal((await call('POST', `/admin/chapters/${ids.ch1}/hide`, { as: 'admin' })).status, 200);
    await blocked(ids.material, 'chương ẩn');
    assert.ok(!(await call('GET', '/subjects')).body.data.find((s) => s.id === ids.subject).chapters.some((c) => c.id === ids.ch1));
    await call('POST', `/admin/chapters/${ids.ch1}/unhide`, { as: 'admin' });
    await call('POST', `/admin/subjects/${ids.subject}/hide`, { as: 'admin' });
    await blocked(ids.material, 'môn ẩn');
    assert.ok(!(await call('GET', '/subjects')).body.data.some((s) => s.id === ids.subject));
    await call('POST', `/admin/subjects/${ids.subject}/unhide`, { as: 'admin' });

    assert.equal((await call('GET', `/materials/${randomUUID()}`)).status, 404);
    assert.equal((await call('GET', '/materials/abc')).status, 404);
    assert.equal((await call('GET', `/materials/${ids.material}`, { token: 'rác' })).status, 401, 'token sai không bị hạ xuống khách');
  });

  test('phân quyền: guest/user không tạo môn, chương, URL upload, tài liệu; editor không tự xuất bản', async () => {
    for (const [p, body] of [['/admin/subjects', { code: 'X1', name: 'x' }], [`/admin/subjects/${ids.subject}/chapters`, { title: 'x' }],
      ['/admin/materials/upload-url', { filename: 'a.pdf', mime_type: 'application/pdf', size_bytes: 10 }],
      ['/admin/materials', { storage_path: `${randomUUID()}.pdf` }]]) {
      assert.equal((await call('POST', p, { body })).status, 401, `guest ${p}`);
      assert.equal((await call('POST', p, { as: 'user', body })).status, 403, `user ${p}`);
    }
    assert.equal((await call('GET', '/admin/materials', { as: 'user' })).status, 403);
    const { res } = await upload('editor', { filename: 'e.pdf', title: 'Editor tự xuất bản?', subject_id: ids.subject });
    await call('POST', `/admin/materials/${res.body.data.id}/submit`, { as: 'editor' });
    const r = await call('POST', `/admin/materials/${res.body.data.id}/approve`, { as: 'editor' });
    assert.deepEqual([r.status, r.body.error.code], [403, 'FORBIDDEN']);
    assert.equal((await one('select status from materials where id = $1', [res.body.data.id])).status, 'in_review');
    const list = await call('GET', `/admin/materials?subject_id=${ids.subject}&status=in_review`, { as: 'editor' });
    assert.ok(list.body.data.every((m) => m.status === 'in_review') && list.body.data.length >= 2);
  });

  test('upload: từ chối .exe đổi tên .pdf, sai content-type, quá 50 MB, loại lạ, path giả; object bị từ chối bị xoá', async () => {
    const before = await one('select count(*)::int n from materials');
    const exe = await upload('editor2', { bytes: EXE, filename: 'virus.pdf', title: 'x', subject_id: ids.subject });
    assert.equal(exe.res.status, 422);
    assert.match(exe.res.body.error.message, /không đúng định dạng/);
    assert.equal(fake.objects.has(exe.key), false, 'object .exe đã bị xoá khỏi Storage');

    // Khai 10 byte nhưng PUT file rỗng → Storage trả 416 cho Range → finalize 422 + xoá object
    const u0 = await call('POST', '/admin/materials/upload-url', { as: 'editor2', body: { filename: 'rong.txt', mime_type: 'text/plain', size_bytes: 10 } });
    await fetch(u0.body.data.upload_url, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: Buffer.alloc(0) });
    const empty = await call('POST', '/admin/materials', { as: 'editor2', body: { storage_path: u0.body.data.storage_path,
      original_filename: 'rong.txt', title: 'x', subject_id: ids.subject, category_id: category } });
    assert.deepEqual([empty.status, empty.body.error.message], [422, 'File phải lớn hơn 0 và tối đa 50 MB.']);
    assert.equal(fake.objects.has(u0.body.data.storage_path), false);
    const html = await upload('editor2', { bytes: PDF, filename: 'a.pdf', putType: 'text/html', title: 'x', subject_id: ids.subject });
    assert.equal(html.res.status, 422);
    assert.equal(fake.objects.has(html.key), false);

    const bad = async (body) => (await call('POST', '/admin/materials/upload-url', { as: 'editor2', body })).status;
    assert.equal(await bad({ filename: 'a.exe', mime_type: 'application/x-msdownload', size_bytes: 10 }), 422);
    assert.equal(await bad({ filename: 'a.pdf', mime_type: 'text/html', size_bytes: 10 }), 422);
    assert.equal(await bad({ filename: 'a.pdf', mime_type: 'application/pdf', size_bytes: 50 * 1024 * 1024 + 1 }), 422);
    assert.equal(await bad({ filename: 'a.pdf', mime_type: 'application/pdf', size_bytes: 0 }), 422);
    assert.equal(await bad({ filename: 'a.__proto__', mime_type: 'x', size_bytes: 1 }), 422);

    const fin = async (extra) => (await call('POST', '/admin/materials', { as: 'editor2', body: {
      original_filename: 'a.pdf', title: 't', subject_id: ids.subject, category_id: category, ...extra } }));
    assert.equal((await fin({ storage_path: `${randomUUID()}.pdf` })).status, 422, 'chưa upload');
    assert.equal((await fin({ storage_path: '../secret.pdf' })).status, 422);
    assert.equal((await fin({ storage_path: 'other-bucket/x.pdf' })).status, 422);
    const ok = await upload('editor2', { title: 'Hợp lệ', subject_id: ids.subject });
    assert.equal((await fin({ storage_path: ok.key })).status, 409, 'path đã đăng ký');
    const wrongChapter = await call('POST', '/admin/subjects', { as: 'admin', body: { code: 'KHAC', name: 'Môn khác' } });
    const cross = await upload('editor2', { title: 'x', subject_id: wrongChapter.body.data.id, chapter_id: ids.ch1 });
    assert.equal(cross.res.status, 422, 'chương thuộc môn khác');
    assert.equal(fake.objects.has(cross.key), false, 'object của tài liệu không tạo được bị xoá');
    assert.equal((await one('select count(*)::int n from materials')).n, before.n + 1);
  });

  test('admin "publish" = draft → published trong một bước (một dòng audit); editor không dùng được', async () => {
    const s = await call('POST', '/admin/subjects', { as: 'editor', body: { code: 'PUB1', name: 'Xuất bản thẳng' } });
    const e = await call('POST', `/admin/subjects/${s.body.data.id}/publish`, { as: 'editor' });
    assert.deepEqual([e.status, e.body.error.code], [403, 'FORBIDDEN']);
    const a = await call('POST', `/admin/subjects/${s.body.data.id}/publish`, { as: 'admin' });
    assert.deepEqual([a.status, a.body.data.status], [200, 'published']);
    assert.equal((await call('POST', `/admin/subjects/${s.body.data.id}/publish`, { as: 'admin' })).status, 409, 'chỉ từ draft');
    const logs = (await db.query(`select action, details from audit_logs where entity_id = $1 order by created_at`, [s.body.data.id])).rows;
    assert.deepEqual(logs.map((l) => l.action), ['create', 'publish']);
    assert.ok((await call('GET', '/subjects')).body.data.some((x) => x.code === 'PUB1'));
  });

  test('route công khai: token giả → 401 (không được hạn mức của người đăng nhập); page cực lớn không gây lỗi SQL', async () => {
    for (const p of ['/subjects', '/material-categories', '/materials']) {
      assert.equal((await call('GET', p, { token: 'gia-mao' })).status, 401, p);
    }
    const r = await call('GET', '/materials?page=100000000000000000000&limit=5');
    assert.deepEqual([r.status, r.body.data, r.body.meta.page], [200, [], 1_000_000]);
  });

  test('môn/chương: mã trùng → 409, dữ liệu sai → 422, vị trí chương trùng → 409', async () => {
    assert.equal((await call('POST', '/admin/subjects', { as: 'editor', body: { code: 'CNSAI2', name: 'x' } })).status, 409);
    assert.equal((await call('POST', '/admin/subjects', { as: 'editor', body: { code: 'a b', name: 'x' } })).status, 422);
    assert.equal((await call('POST', '/admin/subjects', { as: 'editor', body: { code: 'OK1' } })).status, 422);
    const p = `/admin/subjects/${ids.subject}/chapters`;
    assert.equal((await call('POST', p, { as: 'editor', body: { title: 'Trùng', position: 1 } })).status, 409);
    assert.equal((await call('POST', p, { as: 'editor', body: { title: 'x', position: 0 } })).status, 422);
    assert.equal((await call('POST', `/admin/subjects/${randomUUID()}/chapters`, { as: 'editor', body: { title: 'x' } })).status, 404);
  });

  test('xem trực tuyến chỉ cho PDF; tài liệu khác chỉ tải xuống', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const { res } = await upload('editor3', { bytes: png, filename: 'so-do.png', mime: 'image/png', title: 'Sơ đồ', subject_id: ids.subject });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    await publish('materials', res.body.data.id);
    const v = await call('GET', `/materials/${res.body.data.id}/view`);
    assert.deepEqual([v.status, v.body.error.code], [409, 'NOT_VIEWABLE']);
    assert.equal((await call('GET', `/materials/${res.body.data.id}/download`)).status, 200);
  });

  test('URL upload: quá 10 yêu cầu/phút/người → 429 RATE_LIMITED, người khác không bị ảnh hưởng', async () => {
    const body = { filename: 'a.pdf', mime_type: 'application/pdf', size_bytes: 10 };
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await call('POST', '/admin/materials/upload-url', { as: 'editor4', body })).status);
    assert.deepEqual([statuses.slice(0, 10).every((x) => x === 200), statuses[10]], [true, 429]);
    assert.equal((await call('POST', '/admin/materials/upload-url', { as: 'editor4', body })).body.error.code, 'RATE_LIMITED');
    assert.equal((await call('POST', '/admin/materials/upload-url', { as: 'admin', body })).status, 200);
  });
});
