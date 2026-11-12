// Integration P1: migration 001 + seed trên Postgres thật.
// Chạy khi có TEST_DATABASE_URL trỏ tới Postgres CỤC BỘ (vd docker postgres:16); mỗi lần tạo DB tạm rồi xoá.
//   TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { dbSsl, isLocalDatabase } from '../config/dbSsl.js';
import { loadLegacyQuestions, seed } from '../db/seed/import-legacy-questions.js';

const BASE = process.env.TEST_DATABASE_URL;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const sql = (p) => readFileSync(join(ROOT, p), 'utf8');
const MIGRATION = 'db/migrations/001_init.sql';
const DOWN = 'db/migrations/001_init.down.sql';
const MIGRATION_002 = 'db/migrations/002_revoke_data_api_grants.sql';
const SEED = 'db/seed/import-legacy-questions.js';
const legacy = loadLegacyQuestions();

const runSeed = (url, ...args) => spawnSync(process.execPath, [SEED, ...args], {
  cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, DATABASE_URL: url },
});

test('dbSsl: cục bộ không TLS, từ xa luôn kiểm tra chứng chỉ', () => {
  assert.equal(dbSsl('postgres://u:p@localhost:5432/db'), false);
  assert.deepEqual(dbSsl('postgres://u:p@aws-0.pooler.supabase.com:6543/postgres', undefined),
    { rejectUnauthorized: true });
  assert.equal(dbSsl('postgres://u:p@h.example.com/db', 'A\\nB').ca, 'A\nB');
});

test('dbSsl: ?host= không qua mặt được chốt cục bộ; sslmode trong URL bị từ chối; lỗi không lộ mật khẩu', () => {
  const sneaky = 'postgres://u:p@localhost:5432/postgres?host=aws-0.pooler.supabase.com';
  assert.equal(isLocalDatabase(sneaky), false);
  assert.deepEqual(dbSsl(sneaky, undefined), { rejectUnauthorized: true });
  assert.throws(() => dbSsl('postgres://u:p@db.example.com/x?sslmode=no-verify'), /Bỏ sslmode/);
  assert.throws(() => dbSsl('postgres://u:sec/ret@db.example.com:5432/x'), (e) => !String(e.message).includes('sec/ret'));
});

test('seed: ?host= từ xa bị từ chối; URL sai không in mật khẩu', () => {
  const r1 = runSeed('postgres://u:p@localhost:5432/postgres?host=aws-0.pooler.supabase.com');
  assert.equal(r1.status, 1);
  assert.match(r1.stderr, /Từ chối seed lên aws-0\.pooler\.supabase\.com/);
  const r2 = runSeed('postgres://postgres:sec/ret@db.x.supabase.co:5432/postgres');
  assert.equal(r2.status, 1);
  assert.ok(!(r2.stdout + r2.stderr).includes('sec/ret'), r2.stderr);
});

test('seed từ chối DB từ xa khi thiếu --allow-remote (không kết nối)', () => {
  const r = runSeed('postgres://u:secret@db.example.com:5432/postgres');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Từ chối seed lên db\.example\.com/);
  assert.ok(!r.stdout.includes('secret') && !r.stderr.includes('secret'), 'không in mật khẩu');
});

test('seed từ chối khi thiếu DATABASE_URL', () => {
  const r = runSeed('');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Thiếu DATABASE_URL/);
});

test('backup bị sửa → checksum sai, không import', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vnuaiquiz-'));
  try {
    const file = join(dir, 'q.json');
    writeFileSync(file, readFileSync(join(ROOT, 'db/seed/legacy/questions.2026-11-11.json'), 'utf8').replace('"answer": 1', '"answer": 2'));
    assert.throws(() => loadLegacyQuestions(file), /Checksum bản backup không khớp/);
  } finally { rmSync(dir, { recursive: true }); }
});

test('bản backup: 200 câu, 801 lựa chọn, 5 chương × 40, id lặp lại giữa các chương', () => {
  assert.equal(legacy.length, 200);
  assert.equal(legacy.reduce((s, q) => s + q.options.length, 0), 801);
  assert.equal(new Set(legacy.map((q) => q.id)).size, 40);
});

describe('migration 001 + seed trên DB thử nghiệm trống', { skip: !BASE && 'đặt TEST_DATABASE_URL để chạy' }, () => {
  let admin; let url; let db;
  const dbName = `vnuaiquiz_p1_test_${process.pid}`;
  const q = (text, params) => db.query(text, params);
  const one = async (text, params) => (await q(text, params)).rows[0];
  const counts = () => one(`select (select count(*) from subjects)::int s, (select count(*) from chapters)::int c,
    (select count(*) from questions)::int q, (select count(*) from question_options)::int o,
    (select count(*) from material_categories)::int m, (select count(*) from roles)::int r`);
  const snapshot = async () => (await q(`select c.position, qu.legacy_number, qu.id, qu.updated_at,
      array_agg(o.id order by o.position) opts from questions qu join chapters c on c.id = qu.chapter_id
      join question_options o on o.question_id = qu.id group by 1,2,3,4 order by 1,2`)).rows;

  before(async () => {
    assert.ok(isLocalDatabase(BASE), 'TEST_DATABASE_URL phải là Postgres cục bộ – không chạy test trên DB thật');
    admin = new pg.Client({ connectionString: BASE });
    await admin.connect();
    await admin.query(`drop database if exists ${dbName}`);
    await admin.query(`create database ${dbName}`);
    const u = new URL(BASE); u.pathname = `/${dbName}`; url = u.href;
    db = new pg.Client({ connectionString: url });
    await db.connect();
    await q(sql('tests/fixtures/supabase-auth-stub.sql'));
    await q(sql(MIGRATION));
  });

  after(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${dbName}`);
    await admin?.end();
  });

  test('migration 002: anon/authenticated mất mọi quyền trên public, cả bảng tạo sau; chạy lại được', async () => {
    const leaked = () => one(`select
      (select count(*) from pg_class c cross join (values ('anon'), ('authenticated')) r(role)
         cross join unnest(array['select','insert','update','delete','truncate','references','trigger']) p
        where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','S','v','m')
          and has_table_privilege(r.role, c.oid, p))::int tables,
      (select count(*) from pg_proc f cross join (values ('anon'), ('authenticated')) r(role)
        where f.pronamespace = 'public'::regnamespace and has_function_privilege(r.role, f.oid, 'execute'))::int funcs`);
    const before = await leaked();
    assert.ok(before.tables > 0 && before.funcs > 0, 'stub phải giả lập grant mặc định của Supabase');
    await q(sql(MIGRATION_002));
    await q(sql(MIGRATION_002));
    assert.deepEqual(await leaked(), { tables: 0, funcs: 0 });
    await q('create table public.p2_probe (id int)');
    try {
      assert.deepEqual(await leaked(), { tables: 0, funcs: 0 });
    } finally { await q('drop table public.p2_probe'); }
    const svc = await one(`select has_table_privilege('service_role', 'public.questions', 'select') s`);
    assert.equal(svc.s, true, 'không đụng service_role');
  });

  test('RLS bật trên mọi bảng public, không có policy', async () => {
    const { rows } = await q(`select relname, relrowsecurity from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1`);
    assert.equal(rows.length, 17);
    assert.deepEqual(rows.filter((r) => !r.relrowsecurity), []);
    assert.equal((await one(`select count(*)::int n from pg_policies where schemaname = 'public'`)).n, 0);
  });

  test('mọi khoá ngoại đều có index bắt đầu bằng cột FK', async () => {
    const { rows } = await q(`select c.conrelid::regclass::text tbl, c.conname from pg_constraint c
      where c.contype = 'f' and c.connamespace = 'public'::regnamespace
        and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])`);
    assert.deepEqual(rows, []);
  });

  test('anon/authenticated không gọi được handle_new_user', async () => {
    const r = await one(`select has_function_privilege('anon', 'public.handle_new_user()', 'execute') a,
                                has_function_privilege('authenticated', 'public.handle_new_user()', 'execute') b`);
    assert.deepEqual(r, { a: false, b: false });
  });

  test('chạy lại migration bị từ chối và không đổi schema', async () => {
    const tables = await one(`select count(*)::int n from pg_tables where schemaname = 'public'`);
    await assert.rejects(q(sql(MIGRATION)), /already exists/);
    await q('rollback').catch(() => {});
    assert.deepEqual(await one(`select count(*)::int n from pg_tables where schemaname = 'public'`), tables);
    assert.equal((await counts()).r, 3);
  });

  test('seed lần 1: 200 câu / 801 lựa chọn / 5 chương × 40 / mỗi câu đúng 1 đáp án', async () => {
    const r = runSeed(url);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(await counts(), { s: 5, c: 5, q: 200, o: 801, m: 6, r: 3 });
    const perChapter = (await q(`select c.position, count(*)::int n from questions qu
      join chapters c on c.id = qu.chapter_id group by 1 order by 1`)).rows;
    assert.deepEqual(perChapter, [1, 2, 3, 4, 5].map((position) => ({ position, n: 40 })));
    const bad = await one(`select count(*)::int n from questions qu where (select count(*) from question_options o
      where o.question_id = qu.id and o.is_correct) <> 1`);
    assert.equal(bad.n, 0);
    const subjects = (await q(`select code, status from subjects order by sort_order`)).rows;
    assert.deepEqual(subjects.map((s) => s.code), ['LSD', 'NNPL', 'TRIET', 'KTCT', 'CNSAI']);
    assert.ok(subjects.every((s) => s.status === 'published'));
  });

  test('đối chiếu từng câu với backup theo (chương, id cũ): nội dung, lựa chọn, đáp án', async () => {
    const { rows } = await q(`select c.position, c.title, qu.legacy_number, qu.content, qu.explanation, qu.status, qu.source,
        array_agg(o.content order by o.position) opts, array_position(array_agg(o.is_correct order by o.position), true) - 1 ans
      from questions qu join chapters c on c.id = qu.chapter_id join question_options o on o.question_id = qu.id
      group by 1,2,3,4,5,6,7`);
    const byKey = new Map(rows.map((r) => [`${r.position}:${r.legacy_number}`, r]));
    assert.equal(byKey.size, 200);
    for (const l of legacy) {
      const r = byKey.get(`${Number(l.chapter)}:${l.id}`);
      assert.ok(r, `thiếu chương ${l.chapter} id ${l.id}`);
      assert.equal(r.content, l.question);
      assert.equal(r.explanation, l.explanation || null);
      assert.deepEqual(r.opts, l.options);
      assert.equal(r.ans, l.answer);
      assert.equal(`Chương ${r.position}: ${r.title}`, l.chapterName);
      assert.deepEqual([r.status, r.source], ['published', 'import']);
    }
    assert.equal(byKey.get('2:28').opts.length, 5);
  });

  test('id cũ trùng giữa các chương → câu riêng biệt, UUID khác nhau', async () => {
    const { rows } = await q(`select count(distinct id)::int n from questions where legacy_number = 1`);
    assert.equal(rows[0].n, 5);
  });

  test('seed lần 2: không đổi số bản ghi, UUID hay updated_at', async () => {
    const before = await snapshot();
    const cats = (await q('select id from material_categories order by code')).rows;
    const r = runSeed(url);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(await counts(), { s: 5, c: 5, q: 200, o: 801, m: 6, r: 3 });
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual((await q('select id from material_categories order by code')).rows, cats);
  });

  test('seed không ghi đè câu đã sửa trên DB', async () => {
    const { id } = await one(`select id from questions where legacy_number = 5 limit 1`);
    await q(`update questions set content = 'đã sửa' where id = $1`, [id]);
    assert.equal(runSeed(url).status, 0);
    assert.equal((await one('select content from questions where id = $1', [id])).content, 'đã sửa');
  });

  test('seed lỗi giữa chừng → rollback, không còn dòng nào mới', async () => {
    const before = await counts();
    const broken = [...legacy, { ...legacy[0], chapter: '6', chapterName: 'Chương 6: X' }]; // lệch số chương → kiểm tra cuối thất bại
    await assert.rejects(seed(db, broken, () => {}), /Số lượng sau import không khớp/);
    assert.deepEqual(await counts(), before);
    assert.equal((await one(`select count(*)::int n from chapters where position = 6`)).n, 0);
  });

  test('ràng buộc: chủ đề gắn chương của môn khác bị từ chối', async () => {
    const { id: chapterId } = await one(`select c.id from chapters c join subjects s on s.id = c.subject_id where s.code = 'CNSAI' limit 1`);
    const { id: otherSubject } = await one(`select id from subjects where code = 'LSD'`);
    await assert.rejects(q(`insert into topics (subject_id, chapter_id, name) values ($1, $2, 'x')`, [otherSubject, chapterId]),
      (e) => e.code === '23503');
    await assert.rejects(q(`insert into questions (subject_id, chapter_id, content) values ($1, $2, 'x')`, [otherSubject, chapterId]),
      (e) => e.code === '23503');
  });

  test('ràng buộc: câu single_choice phải có ≥2 lựa chọn và đúng 1 đáp án (kiểm tra khi commit)', async () => {
    const { id: subjectId } = await one(`select id from subjects where code = 'LSD'`);
    const attempt = async (options) => {
      await q('begin');
      try {
        const { id } = await one(`insert into questions (subject_id, content) values ($1, 'x') returning id`, [subjectId]);
        for (const [i, correct] of options.entries()) {
          await q(`insert into question_options (question_id, position, content, is_correct) values ($1, $2, 'o', $3)`, [id, i, correct]);
        }
        await q('commit');
      } catch (e) { await q('rollback'); throw e; }
    };
    await assert.rejects(attempt([true, true]), (e) => e.code === '23514');
    await assert.rejects(attempt([true]), (e) => e.code === '23514');
    await assert.rejects(attempt([false, false]), (e) => e.code === '23514');
    await attempt([false, true]);
    await assert.rejects(q(`update question_options set is_correct = true where position = 0
      and question_id = (select id from questions where content = 'x')`), (e) => e.code === '23514');
    await q(`delete from questions where content = 'x'`); // cascade xoá lựa chọn: không vướng trigger
  });

  test('auth.users mới → profile vai trò user, bỏ qua role do client gửi', async () => {
    const { id } = await one(`insert into auth.users (email, raw_user_meta_data)
      values ('sv@hus.edu.vn', '{"full_name":"Sinh Viên","role":"admin"}') returning id`);
    const u = await one(`select u.email, u.full_name, r.code, u.status from users u join roles r on r.id = u.role_id where u.id = $1`, [id]);
    assert.deepEqual(u, { email: 'sv@hus.edu.vn', full_name: 'Sinh Viên', code: 'user', status: 'active' });
    const { id: id2 } = await one(`insert into auth.users (email, raw_user_meta_data)
      values ('dai@hus.edu.vn', jsonb_build_object('full_name', repeat('a', 5000))) returning id`);
    assert.equal((await one('select length(full_name)::int n from users where id = $1', [id2])).n, 100, '002 cắt full_name');
  });

  test('updated_at tự cập nhật khi sửa', async () => {
    const { updated_at: t0, id } = await one(`select id, updated_at from subjects where code = 'TRIET'`);
    await q(`update subjects set description = 'mô tả' where id = $1`, [id]);
    const { updated_at: t1 } = await one('select updated_at from subjects where id = $1', [id]);
    assert.ok(t1 > t0);
  });

  test('rollback 001: từ chối khi có dữ liệu người dùng/nội dung đã sửa; khi chỉ có seed thì xoá sạch và áp lại được', async () => {
    const refuse = async () => {
      await assert.rejects(q(sql(DOWN)), /Từ chối rollback 001/);
      await q('rollback').catch(() => {});
      assert.equal((await counts()).q, 200, 'không mất dữ liệu khi bị từ chối');
    };
    await refuse();                                    // có profile người dùng
    await q('delete from auth.users');                 // cascade xoá profile
    await refuse();                                    // còn câu đã sửa (test "không ghi đè") + môn đã sửa
    await q(`set session_replication_role = replica`); // bỏ qua trigger set_updated_at để giả lập "chưa sửa"
    await q(`update questions set updated_at = created_at`);
    await q(`update subjects set updated_at = created_at`);
    await q(`reset session_replication_role`);
    await q(sql(DOWN));
    assert.equal((await one(`select count(*)::int n from pg_tables where schemaname = 'public'`)).n, 0);
    await q(sql(MIGRATION));
    assert.equal(runSeed(url).status, 0);
    assert.deepEqual(await counts(), { s: 5, c: 5, q: 200, o: 801, m: 6, r: 3 });
  });
});
