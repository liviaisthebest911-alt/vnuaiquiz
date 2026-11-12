// Supabase Storage REST (cùng endpoint storage-js dùng), gọi bằng secret key – CHỈ ở backend.
// Bucket `materials` là private: trình duyệt chỉ chạm object qua signed URL ngắn hạn do backend cấp.
export const BUCKET = 'materials';

function config() {
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY');
  return { url: `${base}/storage/v1`, headers: { apikey: key, authorization: `Bearer ${key}` } };
}

async function call(method, path, body) {
  const { url, headers } = config();
  const res = await fetch(`${url}${path}`, {
    method,
    headers: { ...headers, ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Storage ${method} ${path.split('?')[0]} → HTTP ${res.status}`); // không kèm body: có thể lộ path/token
  return res.json();
}

const enc = (key) => key.split('/').map(encodeURIComponent).join('/');

// URL để trình duyệt PUT file trực tiếp (Storage tự đặt hạn, mặc định 2 giờ).
export async function createUploadUrl(key) {
  const { url } = config();
  const { url: signed } = await call('POST', `/object/upload/sign/${BUCKET}/${enc(key)}`, {});
  return `${url}${signed}`;
}

// Signed URL xem/tải. download = tên file → Storage trả Content-Disposition: attachment.
export async function createSignedUrl(key, expiresIn, download) {
  const { url } = config();
  const { signedURL } = await call('POST', `/object/sign/${BUCKET}/${enc(key)}`, { expiresIn });
  return `${url}${signedURL}${download ? `&download=${encodeURIComponent(download)}` : ''}`;
}

// Đọc vài byte đầu + kích thước + content-type đã lưu, không tải cả file. null nếu object không tồn tại.
export async function readHead(key, bytes = 16) {
  const { url, headers } = config();
  const res = await fetch(`${url}/object/${BUCKET}/${enc(key)}`, { headers: { ...headers, range: `bytes=0-${bytes - 1}` } });
  if (res.status === 404 || res.status === 400) { await res.body?.cancel(); return null; }
  // Object 0 byte: Range không thoả được → 416 (Content-Range: bytes */0)
  if (res.status === 416) { await res.body?.cancel(); return { size: 0, contentType: res.headers.get('content-type')?.split(';')[0].trim(), head: Buffer.alloc(0) }; }
  if (!res.ok) { await res.body?.cancel(); throw new Error(`Storage GET object → HTTP ${res.status}`); }
  const total = res.headers.get('content-range')?.split('/')[1];
  const size = Number(total ?? res.headers.get('content-length'));
  const reader = res.body.getReader();
  const chunks = [];
  let n = 0;
  while (n < bytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    n += value.length;
  }
  await reader.cancel(); // Storage không hỗ trợ Range → vẫn chỉ đọc phần đầu
  return { size, contentType: res.headers.get('content-type')?.split(';')[0].trim(), head: Buffer.concat(chunks).subarray(0, bytes) };
}

export async function removeObject(key) {
  await call('DELETE', `/object/${BUCKET}`, { prefixes: [key] });
}
