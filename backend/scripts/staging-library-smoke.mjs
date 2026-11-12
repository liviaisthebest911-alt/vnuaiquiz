// Kiểm tra trọn luồng PDF của kho tài liệu với Supabase Storage thật (staging). Không phụ thuộc gói nào (Node >= 20).
// Cần backend local đang chạy, trỏ vào staging. Biến môi trường:
//   API_URL (vd http://localhost:5000/api/v1), SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
//   SUPABASE_SECRET_KEY (chỉ để xoá object thử cuối cùng), ADMIN_EMAIL, ADMIN_PASSWORD
// Dữ liệu thử: môn mã ZZTEST_P4 – dòng DB dọn sau bằng SQL (in ra cuối).
const env = (k) => process.env[k] || (console.error(`Thiếu ${k}`), process.exit(2));
const API = env('API_URL').replace(/\/+$/, '');
const SB = env('SUPABASE_URL').replace(/\/+$/, '');
const ORIGIN = 'http://localhost:5173';
let pass = 0, fail = 0;
const check = (ok, name, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`); };

const login = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: env('SUPABASE_PUBLISHABLE_KEY'), 'content-type': 'application/json' },
  body: JSON.stringify({ email: env('ADMIN_EMAIL'), password: env('ADMIN_PASSWORD') }),
});
if (!login.ok) { console.error('Đăng nhập thất bại', login.status); process.exit(1); }
const token = (await login.json()).access_token;

async function api(path, { method = 'GET', body, guest = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method, headers: { origin: ORIGIN, ...(!guest && { authorization: `Bearer ${token}` }), ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const jwtLife = (url) => { const p = JSON.parse(Buffer.from(new URL(url).searchParams.get('token').split('.')[1], 'base64url')); return p.exp - p.iat; };
const keyOf = (url) => decodeURIComponent(new URL(url).pathname.split('/object/sign/materials/')[1]);

const me = await api('/me');
check(me.body?.data?.role === 'admin', 'tài khoản thử là admin', me.body?.data?.role);
const category = (await api('/material-categories')).body.data[0].id;
const subject = await api('/admin/subjects', { method: 'POST', body: { code: 'ZZTEST_P4', name: 'Môn thử P4 (xoá sau)' } });
check(subject.status === 201, 'tạo môn thử', subject.status);
const sid = subject.body.data.id;
console.log(`ID  subject=${sid}`);
const chapter = await api(`/admin/subjects/${sid}/chapters`, { method: 'POST', body: { title: 'Chương thử' } });
const cid = chapter.body.data.id;
console.log(`ID  chapter=${cid}`);

// PDF tối thiểu hợp lệ
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const filename = 'Giáo trình chương 1 – thử.pdf';
const up = await api('/admin/materials/upload-url', { method: 'POST', body: { filename, mime_type: 'application/pdf', size_bytes: pdf.length } });
check(up.status === 200, 'cấp signed upload URL', up.status);
const u = up.body.data;
console.log(`ID  storage_path=${u.storage_path}`);

const pre = await fetch(u.upload_url, { method: 'OPTIONS', headers: { origin: ORIGIN, 'access-control-request-method': 'PUT', 'access-control-request-headers': 'content-type,x-upsert' } });
const acao = pre.headers.get('access-control-allow-origin');
check(pre.ok && (acao === '*' || acao === ORIGIN), 'CORS preflight PUT từ localhost:5173', `${pre.status} ACAO=${acao} AllowHeaders=${pre.headers.get('access-control-allow-headers')}`);
const put = await fetch(u.upload_url, { method: 'PUT', headers: { origin: ORIGIN, 'content-type': u.content_type, 'x-upsert': 'false' }, body: pdf });
check(put.ok, 'PUT PDF lên signed upload URL', put.status);
const put2 = await fetch(u.upload_url, { method: 'PUT', headers: { 'content-type': u.content_type, 'x-upsert': 'false' }, body: pdf });
check(!put2.ok, 'PUT lần 2 cùng URL bị từ chối (x-upsert:false)', put2.status);

const fin = await api('/admin/materials', { method: 'POST', body: { subject_id: sid, chapter_id: cid, category_id: category, title: 'Tài liệu thử P4', storage_path: u.storage_path, original_filename: filename } });
check(fin.status === 201 && fin.body.data.size_bytes == pdf.length, 'finalize đọc Range + content-type thật', `${fin.status} size=${fin.body?.data?.size_bytes}`);
const mid = fin.body.data.id;
console.log(`ID  material=${mid}`);

check((await api(`/materials/${mid}`, { guest: true })).status === 404, 'guest: tài liệu nháp → 404');
check((await api(`/materials/${mid}/view`, { guest: true })).status === 404, 'guest: /view nháp → 404');
const pub = await fetch(`${SB}/storage/v1/object/public/materials/${u.storage_path}`);
check(!pub.ok, 'URL public của bucket private không mở được', pub.status);

for (const [type, id] of [['subjects', sid], ['chapters', cid], ['materials', mid]]) {
  const r = await api(`/admin/${type}/${id}/publish`, { method: 'POST' });
  check(r.status === 200, `Xuất bản ngay ${type}`, r.status);
}

const view = await api(`/materials/${mid}/view`, { guest: true });
check(view.status === 200, 'guest: /view sau khi xuất bản', view.status);
const vr = await fetch(view.body.data.url);
const vbuf = Buffer.from(await vr.arrayBuffer());
check(vr.ok && vr.headers.get('content-type')?.startsWith('application/pdf') && !/attachment/i.test(vr.headers.get('content-disposition') ?? '') && vbuf.equals(pdf),
  'mở PDF inline qua signed URL', `${vr.status} ${vr.headers.get('content-type')} CD=${vr.headers.get('content-disposition')}`);
check(jwtLife(view.body.data.url) === 300, 'signed URL hết hạn sau 5 phút', `${jwtLife(view.body.data.url)}s`);

const dl = await api(`/materials/${mid}/download`, { guest: true });
const dr = await fetch(dl.body.data.url);
const cd = dr.headers.get('content-disposition') ?? '';
await dr.body?.cancel();
check(dr.ok && /attachment/i.test(cd) && (cd.includes(encodeURIComponent(filename)) || cd.includes(filename)), 'tải xuống với tên file tiếng Việt', `${dr.status} CD=${cd}`);

const hide = await api(`/admin/materials/${mid}/hide`, { method: 'POST' });
check(hide.status === 200 && (await api(`/materials/${mid}/download`, { guest: true })).status === 404, 'ẩn tài liệu → guest 404');
const preview = await api(`/materials/${mid}/view`);
check(preview.status === 200, 'admin vẫn xem trước tài liệu ẩn', preview.status);

// .exe đổi tên .pdf
const exe = Buffer.concat([Buffer.from('MZ\x90\x00'), Buffer.alloc(60)]);
const up2 = (await api('/admin/materials/upload-url', { method: 'POST', body: { filename: 'setup.pdf', mime_type: 'application/pdf', size_bytes: exe.length } })).body.data;
console.log(`ID  storage_path(exe)=${up2.storage_path}`);
const put3 = await fetch(up2.upload_url, { method: 'PUT', headers: { 'content-type': up2.content_type, 'x-upsert': 'false' }, body: exe });
const bad = await api('/admin/materials', { method: 'POST', body: { subject_id: sid, category_id: category, title: 'exe giả', storage_path: up2.storage_path, original_filename: 'setup.pdf' } });
check(put3.ok && bad.status === 422, '.exe đổi tên .pdf → 422', `PUT ${put3.status}, finalize ${bad.status}`);
const SK = env('SUPABASE_SECRET_KEY');
const gone = await fetch(`${SB}/storage/v1/object/materials/${up2.storage_path}`, { headers: { apikey: SK, authorization: `Bearer ${SK}` } });
await gone.body?.cancel();
check(gone.status === 400 || gone.status === 404, 'object bị từ chối đã bị xoá', gone.status);

// Dọn object thử (dòng DB dọn bằng SQL bên dưới)
const del = await fetch(`${SB}/storage/v1/object/materials`, { method: 'DELETE', headers: { apikey: SK, authorization: `Bearer ${SK}`, 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: [keyOf(view.body.data.url), up2.storage_path] }) });
check(del.ok, 'xoá object thử', del.status);

console.log(`\n${pass} PASS, ${fail} FAIL. subject=${sid} chapter=${cid} material=${mid}`);
process.exit(fail ? 1 : 0);
