import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Integration: chạy server thật (index.js) như khi deploy.
const SECRET = 'SENTINEL_GEMINI_KEY_must_not_leak';

function startServer(port, extraEnv) {
  const env = { ...process.env, PORT: String(port), GEMINI_API_KEY: SECRET, ...extraEnv };
  for (const [k, v] of Object.entries(extraEnv)) if (v === undefined) delete env[k];
  const child = spawn(process.execPath, ['index.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 10000);
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes(`:${port}`)) { clearTimeout(timer); resolve(); }
    });
    child.on('exit', (code) => reject(new Error(`server exited with ${code}`)));
  });
  return { child, ready, base: `http://localhost:${port}` };
}

const assertNoLeak = (raw) => {
  assert.ok(!raw.includes('SENTINEL'), 'không lộ secret');
  assert.ok(!/\bat\s.+:\d+:\d+/.test(raw), 'không có stack trace');
  assert.ok(!raw.includes('/home/') && !raw.includes('node_modules'), 'không có đường dẫn file');
};

describe('endpoint AI bị khoá (NODE_ENV không đặt)', () => {
  const srv = startServer(5099, { NODE_ENV: undefined, DEBUG_ERRORS: undefined, VERCEL: undefined });
  before(() => srv.ready);
  after(() => srv.child.kill());

  test('POST /api/quiz/generate → 503 FEATURE_DISABLED, không xử lý file', async () => {
    const form = new FormData();
    form.append('document', new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' }), 'a.pdf');
    const res = await fetch(`${srv.base}/api/quiz/generate`, { method: 'POST', body: form });
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), {
      error: { code: 'FEATURE_DISABLED', message: 'Chức năng tạo câu hỏi bằng AI đang tạm khoá.' },
    });
  });

  test('endpoint bị khoá không làm lộ API key hay framework trong body/header', async () => {
    const res = await fetch(`${srv.base}/api/quiz/generate`, { method: 'POST' });
    const raw = JSON.stringify([...res.headers]) + (await res.text());
    assert.equal(res.status, 503);
    assert.ok(!raw.includes(SECRET));
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('upload lớn (5 MB) bị từ chối ngay, không được đọc/xử lý', async () => {
    const form = new FormData();
    form.append('document', new Blob([new Uint8Array(5 * 1024 * 1024)], { type: 'application/pdf' }), 'big.pdf');
    const started = Date.now();
    const res = await fetch(`${srv.base}/api/quiz/generate`, { method: 'POST', body: form });
    assert.equal(res.status, 503);
    assert.ok(Date.now() - started < 2000, 'phản hồi phải đến ngay, không chờ xử lý file');
  });

  test('JSON hỏng → 400 JSON, không còn trang lỗi HTML kèm stack (lỗi B1 của P0.1)', async () => {
    const res = await fetch(`${srv.base}/api/quiz/generate`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad',
    });
    const raw = await res.text();
    assert.equal(res.status, 400);
    assert.equal(JSON.parse(raw).error.code, 'INVALID_JSON');
    assertNoLeak(raw);
  });

  test('route không tồn tại → 404 JSON', async () => {
    const res = await fetch(`${srv.base}/api/quiz/unknown`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'NOT_FOUND');
  });
});

for (const [name, port, env] of [
  ['production + DEBUG_ERRORS=true', 5094, { NODE_ENV: 'production', DEBUG_ERRORS: 'true' }],
  ['Vercel preview (VERCEL=1, NODE_ENV=development, DEBUG_ERRORS=true)', 5095, { VERCEL: '1', NODE_ENV: 'development', DEBUG_ERRORS: 'true' }],
]) {
  describe(`môi trường ${name}`, () => {
    const srv = startServer(port, env);
    before(() => srv.ready);
    after(() => srv.child.kill());

    test('JSON hỏng và 404 không chứa stack trace / đường dẫn / secret', async () => {
      for (const [path, init, status] of [
        ['/api/quiz/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' }, 400],
        ['/khong-ton-tai', {}, 404],
      ]) {
        const res = await fetch(`${srv.base}${path}`, init);
        const raw = await res.text();
        assert.equal(res.status, status);
        assert.match(res.headers.get('content-type'), /application\/json/);
        assertNoLeak(raw);
        assert.equal(JSON.parse(raw).error.debug, undefined);
      }
    });
  });
}
