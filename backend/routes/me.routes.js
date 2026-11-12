import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, validationError } from '../middleware/errors.js';

const router = express.Router();
router.use(requireAuth);

const profile = ({ id, email, full_name, student_code, role, status, created_at }) =>
  ({ id, email, full_name, student_code, role, status, created_at });

router.get('/', (req, res) => res.json({ data: profile(req.user) }));

// Chỉ nhận full_name, student_code (chuỗi rỗng → xoá). Mọi trường khác (role, status, email, id...) bị bỏ qua.
const FIELDS = {
  full_name: (v) => v.length <= 100,
  student_code: (v) => /^[0-9A-Za-z]{1,20}$/.test(v),
};

router.patch('/', async (req, res) => {
  const body = req.body ?? {};
  const changes = {};
  const errors = {};
  for (const [field, valid] of Object.entries(FIELDS)) {
    if (!(field in body)) continue;
    const v = body[field] === null ? '' : body[field];
    if (typeof v !== 'string' || (v.trim() && !valid(v.trim()))) errors[field] = 'Giá trị không hợp lệ.';
    // mã SV viết hoa: UNIQUE trong DB phân biệt hoa/thường
    else changes[field] = (field === 'student_code' ? v.trim().toUpperCase() : v.trim()) || null;
  }
  if (Object.keys(errors).length) throw validationError('Dữ liệu không hợp lệ.', errors);
  if (!Object.keys(changes).length) throw validationError('Không có trường nào để cập nhật (full_name, student_code).');

  const cols = Object.keys(changes);
  try {
    await pool.query(
      `update public.users set ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} where id = $1`,
      [req.user.id, ...cols.map((c) => changes[c])],
    );
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'CONFLICT', 'Mã sinh viên đã được tài khoản khác sử dụng.');
    throw err;
  }
  res.json({ data: profile({ ...req.user, ...changes }) });
});

export default router;
