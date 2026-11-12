// Supabase giả cho test: JWKS (Auth) + các endpoint Storage mà services/storage.js và trình duyệt dùng.
// Object lưu trong bộ nhớ. Kiểm tra secret key, token ký URL và hạn dùng giống hành vi thật ở mức cần cho test.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';

export async function startFakeSupabase({ secretKey = 'test-secret-key', kid = 'test-key' } = {}) {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' };
  const objects = new Map();   // key → { body: Buffer, contentType }
  const uploadTokens = new Map(); // token → key
  const signTokens = new Map();   // token → { key, exp }
  const calls = [];

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', '*');
    res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.end();
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    const json = (status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
    const service = req.headers.apikey === secretKey && req.headers.authorization === `Bearer ${secretKey}`;
    calls.push({ method: req.method, path: p, service });

    if (p === '/auth/v1/.well-known/jwks.json') return json(200, { keys: [jwk] });

    let m;
    if ((m = /^\/storage\/v1\/object\/upload\/sign\/materials\/(.+)$/.exec(p))) {
      const key = decodeURIComponent(m[1]);
      if (req.method === 'POST') {
        if (!service) return json(403, { error: 'Unauthorized' });
        const token = randomUUID();
        uploadTokens.set(token, key);
        return json(200, { url: `/object/upload/sign/materials/${m[1]}?token=${token}` });
      }
      if (req.method === 'PUT') {
        if (uploadTokens.get(url.searchParams.get('token')) !== key) return json(400, { error: 'InvalidSignature' });
        if (objects.has(key)) return json(409, { error: 'Duplicate' });
        uploadTokens.delete(url.searchParams.get('token'));
        objects.set(key, { body: raw, contentType: req.headers['content-type'] ?? 'application/octet-stream' });
        return json(200, { Key: `materials/${key}` });
      }
    }
    if ((m = /^\/storage\/v1\/object\/sign\/materials\/(.+)$/.exec(p))) {
      const key = decodeURIComponent(m[1]);
      if (req.method === 'POST') {
        if (!service) return json(403, { error: 'Unauthorized' });
        if (!objects.has(key)) return json(400, { error: 'not_found' });
        const { expiresIn } = JSON.parse(raw);
        const token = randomUUID();
        signTokens.set(token, { key, exp: Date.now() + expiresIn * 1000, expiresIn });
        return json(200, { signedURL: `/object/sign/materials/${m[1]}?token=${token}` });
      }
      const t = signTokens.get(url.searchParams.get('token'));
      if (!t || t.key !== key || t.exp < Date.now()) return json(400, { error: 'InvalidJWT' });
      const o = objects.get(key);
      res.setHeader('content-type', o.contentType);
      const dl = url.searchParams.get('download');
      if (dl !== null) res.setHeader('content-disposition', `attachment; filename="${encodeURIComponent(dl)}"`);
      return res.end(o.body);
    }
    if ((m = /^\/storage\/v1\/object\/public\/materials\/(.+)$/.exec(p))) return json(400, { error: 'Bucket not public' });
    if ((m = /^\/storage\/v1\/object\/materials\/(.+)$/.exec(p)) && req.method === 'GET') {
      if (!service) return json(400, { error: 'not_found' });
      const o = objects.get(decodeURIComponent(m[1]));
      if (!o) return json(400, { statusCode: '404', error: 'not_found' });
      const r = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '');
      res.setHeader('content-type', o.contentType);
      if (!r) return res.end(o.body);
      if (o.body.length === 0) { res.statusCode = 416; res.setHeader('content-range', 'bytes */0'); return res.end(); }
      const end = Math.min(Number(r[2]), o.body.length - 1);
      res.statusCode = 206;
      res.setHeader('content-range', `bytes ${r[1]}-${end}/${o.body.length}`);
      return res.end(o.body.subarray(Number(r[1]), end + 1));
    }
    if (p === '/storage/v1/object/materials' && req.method === 'DELETE') {
      if (!service) return json(403, { error: 'Unauthorized' });
      for (const k of JSON.parse(raw).prefixes) objects.delete(k);
      return json(200, []);
    }
    json(404, { error: 'not handled by fake', path: p });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const issuer = `${url}/auth/v1`;

  return {
    url, secretKey, objects, signTokens, calls,
    sign: (sub, { claims = {}, exp = '1h' } = {}) => new SignJWT({ role: 'authenticated', ...claims })
      .setProtectedHeader({ alg: 'ES256', kid }).setSubject(sub).setIssuer(issuer).setAudience('authenticated')
      .setIssuedAt().setExpirationTime(exp).sign(privateKey),
    close: () => new Promise((r) => server.close(r)),
  };
}
