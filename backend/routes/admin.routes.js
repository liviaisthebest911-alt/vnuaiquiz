import express from 'express';
import pool, { audit, withTx } from '../config/db.js';
import { hasRole, requireAuth, requireRole, UUID } from '../middleware/auth.js';
import { HttpError, validationError } from '../middleware/errors.js';
import libraryAdmin from './admin.library.routes.js';
import examsAdmin from './admin.exams.routes.js';

const router = express.Router();
router.use(requireAuth, requireRole('editor'));   // mọi /admin/*: tối thiểu editor
router.use(libraryAdmin);                          // môn/chương/tài liệu – đăng ký trước route quy trình duyệt chung
router.use(examsAdmin);

router.get('/stats', async (_req, res) => {
  const { rows: [stats] } = await pool.query(`
    with content as (
      select 'subjects' as type, status, count(*)::int n from public.subjects group by status
      union all select 'materials', status, count(*)::int from public.materials group by status
      union all select 'questions', status, count(*)::int from public.questions group by status
      union all select 'exams', status, count(*)::int from public.exams group by status
    ), content_groups as (
      select type, jsonb_object_agg(status, n) by_status from content group by type
    ), attempts as (
      select (submitted_at at time zone 'Asia/Ho_Chi_Minh')::date::text as "day", count(*)::int as count
        from public.exam_attempts
       where submitted_at >= ((clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date - 29)::timestamp at time zone 'Asia/Ho_Chi_Minh'
       group by 1 order by 1
    ), top_materials as (
      select m.id, m.title, count(*)::int count
        from public.material_favorites f join public.materials m on m.id = f.material_id
       group by m.id order by count desc, m.id limit 5
    )
    select (select count(*)::int from public.users) users_count,
           (select count(*)::int from public.users where created_at >= now() - interval '7 days') new_users_count,
           coalesce((select jsonb_object_agg(type, by_status) from content_groups), '{}') content,
           coalesce((select json_agg(a order by a."day") from attempts a), '[]') attempts_by_day,
           coalesce((select json_agg(m order by m.count desc, m.id) from top_materials m), '[]') top_materials`);
  res.json({ data: stats });
});

// Quy trình duyệt (API_SPECIFICATION.md §1b). Bảng → tên trạng thái "ẩn" (câu hỏi dùng 'archived').
// topics không có cột status nên không nằm trong quy trình.
const HIDDEN = { subjects: 'hidden', chapters: 'hidden', materials: 'hidden', questions: 'archived', exams: 'hidden' };
const TRANSITIONS = {
  submit:  { role: 'editor', from: 'draft',     to: 'in_review' },
  publish: { role: 'admin',  from: 'draft',     to: 'published' }, // admin xuất bản thẳng bản nháp (một bước, một dòng audit)
  approve: { role: 'admin',  from: 'in_review', to: 'published' },
  reject:  { role: 'admin',  from: 'in_review', to: 'draft' },
  hide:    { role: 'admin',  from: 'published', to: 'hidden' },
  unhide:  { role: 'admin',  from: 'hidden',    to: 'published' },
};
const HAS_PUBLISHED_AT = new Set(['materials', 'exams']);
const notFound = () => new HttpError(404, 'NOT_FOUND', 'Không tìm thấy nội dung.');

router.post('/:type/:id/:action', async (req, res) => {
  const { type, id, action } = req.params;
  const t = TRANSITIONS[action];
  if (!Object.hasOwn(HIDDEN, type) || !Object.hasOwn(TRANSITIONS, action)) {
    throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đường dẫn.');
  }
  if (!hasRole(req.user, t.role)) throw new HttpError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
  if (!UUID.test(id)) throw notFound();
  const note = req.body?.note;
  if (action === 'reject' && (typeof note !== 'string' || !note.trim() || note.length > 2000)) {
    throw validationError('Cần ghi chú lý do trả lại (tối đa 2000 ký tự).', { note: 'required' });
  }
  const swap = (s) => (s === 'hidden' ? HIDDEN[type] : s);
  const from = swap(t.from);
  const to = swap(t.to);

  await withTx(async (client) => {
    const row = (await client.query(`select status from public.${type} where id = $1 for update`, [id])).rows[0];
    if (!row) throw notFound();
    if (row.status !== from) {
      throw new HttpError(409, 'INVALID_TRANSITION', `Không thể thực hiện "${action}" khi nội dung đang ở trạng thái "${row.status}".`);
    }
    if (type === 'exams' && to === 'published') {
      // for share: không cho câu hỏi bị ẩn/sửa trạng thái song song trong lúc duyệt đề
      const { rows: qs } = await client.query(
        `select q.status from public.exam_questions eq join public.questions q on q.id = eq.question_id
          where eq.exam_id = $1 for share of q`, [id]);
      if (qs.length === 0 || qs.some((q) => q.status !== 'published')) {
        throw new HttpError(409, 'EXAM_NOT_READY', 'Đề thi cần ít nhất 1 câu hỏi và mọi câu phải đã xuất bản.');
      }
    }
    await client.query(
      `update public.${type} set status = $2${HAS_PUBLISHED_AT.has(type) && to === 'published' ? ', published_at = coalesce(published_at, now())' : ''} where id = $1`,
      [id, to],
    );
    await audit(client, req.user.id, action, type, id, { from, to, ...(action === 'reject' && { note: note.trim() }) });
  });
  res.json({ data: { id, type, status: to } });
});

export default router;
