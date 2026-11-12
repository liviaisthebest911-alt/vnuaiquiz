// Quản trị kho tài liệu (editor+, đã qua requireAuth/requireRole ở admin.routes.js).
// Tạo mới luôn ở 'draft'; xuất bản qua quy trình duyệt /admin/:type/:id/{submit|approve|...}.
import express from 'express';
import { randomUUID } from 'node:crypto';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import pool, { audit, withTx } from '../config/db.js';
import { HttpError, validationError } from '../middleware/errors.js';
import { createUploadUrl, readHead, removeObject } from '../services/storage.js';
import { UUID } from '../middleware/auth.js';
import { MATERIAL_SELECT } from './library.routes.js';

const router = express.Router();
const MAX_BYTES = 50 * 1024 * 1024;

// Allowlist (API_SPECIFICATION.md §4): đuôi → MIME + chữ ký đầu file. Không tin MIME/đuôi client khai báo.
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
export const FILE_TYPES = {
  pdf:  { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: ZIP },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', magic: ZIP },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: ZIP },
  doc:  { mime: 'application/msword', magic: OLE },
  ppt:  { mime: 'application/vnd.ms-powerpoint', magic: OLE },
  txt:  { mime: 'text/plain', magic: null },
  png:  { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  jpg:  { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  jpeg: { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
};
const KEY = new RegExp(`^[0-9a-f-]{36}\\.(${Object.keys(FILE_TYPES).join('|')})$`);
// txt không có chữ ký: chỉ chặn file nhị phân (có byte NUL).
const magicOk = (ext, head) => (FILE_TYPES[ext].magic ? FILE_TYPES[ext].magic.every((b, i) => head[i] === b) : !head.includes(0));

const str = (v, max, { required = false } = {}) => {
  if (v === undefined || v === null || v === '') return required ? undefined : null;
  return typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : undefined;
};

// ---------- Môn học & chương ----------
router.get('/subjects', async (req, res) => {
  const { rows } = await pool.query(`
    select s.id, s.code, s.name, s.description, s.status, s.sort_order,
           coalesce((select json_agg(json_build_object('id', c.id, 'title', c.title, 'position', c.position, 'status', c.status) order by c.position)
                       from public.chapters c where c.subject_id = s.id), '[]') as chapters
      from public.subjects s order by s.sort_order, s.name`);
  res.json({ data: rows });
});

router.post('/subjects', async (req, res) => {
  const b = req.body ?? {};
  const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : '';
  const name = str(b.name, 200, { required: true });
  const description = str(b.description, 2000);
  const errors = {};
  if (!/^[A-Z0-9_]{2,20}$/.test(code)) errors.code = '2–20 ký tự A-Z, 0-9, _';
  if (!name) errors.name = 'Bắt buộc, tối đa 200 ký tự';
  if (description === undefined) errors.description = 'Tối đa 2000 ký tự';
  if (Object.keys(errors).length) throw validationError('Dữ liệu môn học không hợp lệ.', errors);
  try {
    const subject = await withTx(async (db) => {
      const { rows } = await db.query(
        `insert into public.subjects (code, name, description, created_by) values ($1, $2, $3, $4)
         returning id, code, name, description, status, sort_order`, [code, name, description, req.user.id]);
      await audit(db, req.user.id, 'create', 'subjects', rows[0].id, { code });
      return rows[0];
    });
    res.status(201).json({ data: { ...subject, chapters: [] } });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'CONFLICT', `Mã môn ${code} đã tồn tại.`);
    throw err;
  }
});

router.post('/subjects/:id/chapters', async (req, res) => {
  if (!UUID.test(req.params.id)) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy môn học.');
  const b = req.body ?? {};
  const title = str(b.title, 300, { required: true });
  const description = str(b.description, 2000);
  const position = b.position === undefined || b.position === null || b.position === '' ? null : Number(b.position);
  if (!title || description === undefined || (position !== null && !(Number.isInteger(position) && position >= 1 && position <= 1000))) {
    throw validationError('Dữ liệu chương không hợp lệ.', { title: 'Bắt buộc, tối đa 300 ký tự', position: 'Số nguyên 1–1000 (bỏ trống = cuối)' });
  }
  try {
    // Chương mới ở 'draft' (cột mặc định 'published' là cho dữ liệu seed) – xuất bản qua quy trình duyệt.
    const chapter = await withTx(async (db) => {
      const { rows } = await db.query(
        `insert into public.chapters (subject_id, position, title, description, status)
         select s.id, coalesce($2, (select coalesce(max(position), 0) + 1 from public.chapters where subject_id = s.id)), $3, $4, 'draft'
           from public.subjects s where s.id = $1
         returning id, subject_id, position, title, description, status`, [req.params.id, position, title, description]);
      if (!rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy môn học.');
      await audit(db, req.user.id, 'create', 'chapters', rows[0].id, { subject_id: req.params.id, position: rows[0].position });
      return rows[0];
    });
    res.status(201).json({ data: chapter });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'CONFLICT', 'Môn học đã có chương ở vị trí này.');
    throw err;
  }
});

// ---------- Tài liệu ----------
// 10 yêu cầu/phút/người cho cấp URL upload (API spec §9). shortcut: bộ đếm trong bộ nhớ từng instance.
const uploadLimiter = rateLimit({
  windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  handler: (req, res, next) => next(new HttpError(429, 'RATE_LIMITED', 'Bạn tạo quá nhiều yêu cầu tải lên, thử lại sau ít phút.')),
});

// shortcut: object đã PUT nhưng không bao giờ finalize (đóng tab, bỏ dở) nằm lại trong bucket private – vô hại với
// người dùng nhưng tốn dung lượng; thêm job dọn object không có dòng materials, cũ hơn 1 ngày, khi dung lượng đáng kể.
router.post('/materials/upload-url', uploadLimiter, async (req, res) => {
  const { filename, mime_type: mime, size_bytes: size } = req.body ?? {};
  const ext = typeof filename === 'string' ? filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] : undefined;
  const type = ext && Object.hasOwn(FILE_TYPES, ext) ? FILE_TYPES[ext] : undefined;
  if (!type || typeof filename !== 'string' || filename.length > 255) {
    throw validationError('Loại file không được hỗ trợ.', { filename: Object.keys(FILE_TYPES).join(', ') });
  }
  if (mime !== type.mime) throw validationError('Loại file không khớp với đuôi file.', { mime_type: type.mime });
  if (!Number.isInteger(size) || size <= 0 || size > MAX_BYTES) throw validationError('File phải lớn hơn 0 và tối đa 50 MB.', { size_bytes: MAX_BYTES });

  const storagePath = `${randomUUID()}.${ext}`; // khoá ngẫu nhiên – không dùng tên file người dùng làm path
  res.json({ data: {
    upload_url: await createUploadUrl(storagePath),
    storage_path: storagePath,
    content_type: type.mime,               // trình duyệt PUT với đúng header này; finalize kiểm tra lại
    expires_at: new Date(Date.now() + 2 * 3600_000).toISOString(),
  } });
});

router.post('/materials', async (req, res) => {
  const b = req.body ?? {};
  const key = typeof b.storage_path === 'string' ? b.storage_path : '';
  const ext = KEY.exec(key)?.[1];
  const title = str(b.title, 300, { required: true });
  const description = str(b.description, 2000);
  const originalName = str(b.original_filename, 255, { required: true });
  const errors = {};
  if (!ext) errors.storage_path = 'Không hợp lệ – lấy từ /admin/materials/upload-url';
  if (!title) errors.title = 'Bắt buộc, tối đa 300 ký tự';
  if (description === undefined) errors.description = 'Tối đa 2000 ký tự';
  if (!originalName || originalName.toLowerCase().split('.').pop() !== ext) errors.original_filename = 'Bắt buộc, cùng đuôi với file đã tải lên';
  if (typeof b.subject_id !== 'string' || !UUID.test(b.subject_id)) errors.subject_id = 'uuid';
  if (b.chapter_id != null && (typeof b.chapter_id !== 'string' || !UUID.test(b.chapter_id))) errors.chapter_id = 'uuid';
  if (typeof b.category_id !== 'string' || !UUID.test(b.category_id)) errors.category_id = 'uuid';
  if (Object.keys(errors).length) throw validationError('Dữ liệu tài liệu không hợp lệ.', errors);

  const obj = await readHead(key);
  if (!obj) throw validationError('Chưa tìm thấy file trên Storage – hãy tải file lên trước.', { storage_path: 'missing' });
  const type = FILE_TYPES[ext];
  const problem = !(obj.size > 0 && obj.size <= MAX_BYTES) ? 'File phải lớn hơn 0 và tối đa 50 MB.'
    : obj.contentType !== type.mime ? 'Kiểu nội dung của file trên Storage không khớp loại file.'
      : !magicOk(ext, obj.head) ? 'Nội dung file không đúng định dạng đã khai báo (vd file .exe đổi tên thành .pdf).'
        : null;
  if (problem) {
    await removeObject(key).catch((err) => console.error('Không xoá được object bị từ chối', key, err.message));
    throw validationError(problem, { storage_path: 'rejected' });
  }

  try {
    const m = await withTx(async (db) => {
      const { rows } = await db.query(
        `insert into public.materials (subject_id, chapter_id, category_id, title, description, storage_path,
                                       original_filename, mime_type, size_bytes, uploaded_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
        [b.subject_id, b.chapter_id ?? null, b.category_id, title, description, key, originalName, type.mime, obj.size, req.user.id]);
      await audit(db, req.user.id, 'create', 'materials', rows[0].id, { storage_path: key, size_bytes: obj.size });
      return (await db.query(`${MATERIAL_SELECT} where m.id = $1`, [rows[0].id])).rows[0];
    });
    res.status(201).json({ data: adminMaterial(m) });
  } catch (err) {
    // môn/chương/danh mục không tồn tại hoặc chương thuộc môn khác (FK ghép) → 422 và xoá object vừa kiểm tra;
    // path đã đăng ký → 409 (KHÔNG xoá: object thuộc tài liệu đã có)
    if (err.code === '23503') {
      await removeObject(key).catch((e) => console.error('Không xoá được object', key, e.message));
      throw validationError('Môn, chương hoặc danh mục không hợp lệ.', { subject_id: 'fk' });
    }
    if (err.code === '23505') throw new HttpError(409, 'CONFLICT', 'File này đã được đăng ký cho một tài liệu khác.');
    throw err;
  }
});

const adminMaterial = ({ storage_path, visible, ...m }) => ({ ...m, publicly_visible: visible });

router.get('/materials', async (req, res) => {
  const { subject_id, status } = req.query;
  if (subject_id !== undefined && (typeof subject_id !== 'string' || !UUID.test(subject_id))) throw validationError('subject_id không hợp lệ.');
  if (status !== undefined && !['draft', 'in_review', 'published', 'hidden'].includes(status)) throw validationError('status không hợp lệ.');
  const params = [];
  const where = [];
  if (subject_id) { params.push(subject_id); where.push(`m.subject_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`m.status = $${params.length}`); }
  const { rows } = await pool.query(
    `${MATERIAL_SELECT} ${where.length ? `where ${where.join(' and ')}` : ''} order by m.created_at desc limit 200`, params);
  res.json({ data: rows.map(adminMaterial) });
});

export default router;
