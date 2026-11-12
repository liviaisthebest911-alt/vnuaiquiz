import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { debugDetailsAllowed, errorHandler, notFound, validationError } from '../middleware/errors.js';

// App thử nghiệm dùng đúng middleware của dự án, với các route cố tình gây lỗi.
const SECRET = 'postgres://user:SENTINEL_DB_PASSWORD@db.internal:5432/app';
let server;
let base;
let logs;
const originalError = console.error;
const originalWarn = console.warn;

before(async () => {
  const app = express();
  app.use(express.json());
  app.post('/validate', (req, res) => {
    if (!req.body?.name) throw validationError('Thiếu trường name.', { field: 'name' });
    res.json({ ok: true });
  });
  app.get('/boom', () => { throw new Error(`connect failed ${SECRET}`); });
  app.get('/boom-async', async () => { throw new Error(`async failure ${SECRET}`); });
  app.use(notFound);
  app.use(errorHandler);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

beforeEach(() => {
  logs = [];
  console.error = (...args) => logs.push(args.map((a) => (a instanceof Error ? a.stack : String(a))).join(' '));
  console.warn = (...args) => logs.push(args.join(' '));
});
afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  delete process.env.DEBUG_ERRORS;
});

const assertNoLeak = (raw) => {
  assert.ok(!raw.includes('SENTINEL'), 'không lộ thông tin nhạy cảm');
  assert.ok(!/\bat\s.+:\d+:\d+/.test(raw), 'không có stack trace');
  assert.ok(!raw.includes('/home/') && !raw.includes('node_modules'), 'không có đường dẫn file');
};

test('JSON không hợp lệ → 400 INVALID_JSON, JSON thống nhất', async () => {
  const res = await fetch(`${base}/validate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
  const raw = await res.text();
  assert.equal(res.status, 400);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(JSON.parse(raw), { error: { code: 'INVALID_JSON', message: 'Dữ liệu JSON không hợp lệ.' } });
  assertNoLeak(raw);
});

test('route không tồn tại → 404 NOT_FOUND', async () => {
  const res = await fetch(`${base}/khong-co`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn.' } });
});

test('lỗi validation → 422 VALIDATION_ERROR kèm details', async () => {
  const res = await fetch(`${base}/validate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 422);
  assert.deepEqual(await res.json(), {
    error: { code: 'VALIDATION_ERROR', message: 'Thiếu trường name.', details: { field: 'name' } },
  });
});

for (const path of ['/boom', '/boom-async']) {
  test(`lỗi nội bộ (${path}) → 500 thông báo chung; chi tiết chỉ nằm trong log server`, async () => {
    const res = await fetch(`${base}${path}`);
    const raw = await res.text();
    assert.equal(res.status, 500);
    assert.deepEqual(JSON.parse(raw), { error: { code: 'INTERNAL', message: 'Đã xảy ra lỗi trên server.' } });
    assertNoLeak(raw);
    assert.ok(logs.some((l) => l.includes('SENTINEL') && /\bat\s/.test(l)), 'stack + message gốc được ghi vào log');
  });
}

test('payload quá lớn → 413 PAYLOAD_TOO_LARGE', async () => {
  const res = await fetch(`${base}/validate`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(200_000) }),
  });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error.code, 'PAYLOAD_TOO_LARGE');
});

test('debug chỉ bật khi DEBUG_ERRORS=true + NODE_ENV=development + không chạy trên Vercel', () => {
  assert.equal(debugDetailsAllowed({}), false);
  assert.equal(debugDetailsAllowed({ DEBUG_ERRORS: 'true' }), false); // NODE_ENV thiếu
  assert.equal(debugDetailsAllowed({ DEBUG_ERRORS: 'true', NODE_ENV: 'production' }), false);
  assert.equal(debugDetailsAllowed({ DEBUG_ERRORS: 'true', NODE_ENV: 'development', VERCEL: '1' }), false);
  assert.equal(debugDetailsAllowed({ NODE_ENV: 'development' }), false);
  assert.equal(debugDetailsAllowed({ DEBUG_ERRORS: 'true', NODE_ENV: 'development' }), true);
});

test('khi debug được bật tường minh ở dev, lỗi 500 kèm stack để gỡ lỗi', async () => {
  const savedEnv = process.env.NODE_ENV;
  process.env.DEBUG_ERRORS = 'true';
  process.env.NODE_ENV = 'development';
  try {
    const body = await (await fetch(`${base}/boom`)).json();
    assert.equal(body.error.code, 'INTERNAL');
    assert.match(body.error.debug.stack, /\bat\s/);
  } finally {
    if (savedEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedEnv;
  }
});
