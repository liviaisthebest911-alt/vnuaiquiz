import express from 'express';
import pool, { audit, withTx } from '../config/db.js';
import { UUID } from '../middleware/auth.js';
import { HttpError, validationError } from '../middleware/errors.js';

const router = express.Router();
const missing = () => new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đề thi.');

router.get('/exams', async (_req, res) => {
  const { rows } = await pool.query(`
    select e.id, e.subject_id, s.name as subject_name, e.title, e.status, e.duration_minutes,
           array(select q.question_id from public.exam_questions q where q.exam_id = e.id order by q.position) as question_ids
      from public.exams e join public.subjects s on s.id = e.subject_id
     order by e.created_at desc, e.id`);
  res.json({ data: rows });
});

router.get('/exams/questions', async (req, res) => {
  const id = req.query.subject_id;
  if (typeof id !== 'string' || !UUID.test(id)) throw validationError('Cần chọn môn học hợp lệ.');
  const { rows } = await pool.query(`
    select q.id, q.content, c.title as chapter_title
      from public.questions q left join public.chapters c on c.id = q.chapter_id
     where q.subject_id = $1 and q.status = 'published' and (q.chapter_id is null or c.status = 'published')
     order by c.position nulls last, q.legacy_number nulls last, q.created_at, q.id`, [id]);
  res.json({ data: rows });
});

router.post('/exams', async (req, res) => {
  const { subject_id, title, description, duration_minutes, max_score = 10, max_attempts = null,
    shuffle_questions = false, shuffle_options = false, answer_visibility = 'after_submit', closes_at = null } = req.body ?? {};
  if (typeof subject_id !== 'string' || !UUID.test(subject_id) || typeof title !== 'string' || !title.trim() || title.length > 240 ||
      (description != null && (typeof description !== 'string' || description.length > 5000)) ||
      !Number.isInteger(duration_minutes) || duration_minutes < 1 || duration_minutes > 600 ||
      typeof max_score !== 'number' || !Number.isFinite(max_score) || max_score < .01 || max_score > 9999.99 ||
      (max_attempts !== null && (!Number.isInteger(max_attempts) || max_attempts < 1 || max_attempts > 1000)) ||
      typeof shuffle_questions !== 'boolean' || typeof shuffle_options !== 'boolean' ||
      !['never', 'after_submit', 'after_close'].includes(answer_visibility) ||
      (closes_at !== null && (typeof closes_at !== 'string' || !Number.isFinite(Date.parse(closes_at)))) ||
      (answer_visibility === 'after_close' && closes_at === null)) throw validationError('Thông tin đề thi không hợp lệ.');

  const exam = await withTx(async (client) => {
    const { rows: [row] } = await client.query(`
      insert into public.exams
        (subject_id, title, description, duration_minutes, max_score, max_attempts,
         shuffle_questions, shuffle_options, answer_visibility, closes_at, created_by)
      select id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11 from public.subjects where id = $1 returning *`,
    [subject_id, title.trim(), description?.trim() || null, duration_minutes, max_score, max_attempts,
      shuffle_questions, shuffle_options, answer_visibility, closes_at === null ? null : new Date(closes_at), req.user.id]);
    if (!row) throw validationError('Môn học không tồn tại.');
    await audit(client, req.user.id, 'create', 'exams', row.id, null);
    return row;
  });
  res.status(201).json({ data: exam });
});

router.put('/exams/:id/questions', async (req, res) => {
  const id = req.params.id;
  if (!UUID.test(id)) throw missing();
  const questions = req.body;
  if (!Array.isArray(questions) || questions.length > 250 ||
      questions.some((question) => !question || typeof question.question_id !== 'string' || !UUID.test(question.question_id) ||
        !Number.isInteger(question.position) || question.position < 1 || question.position > 250 ||
        typeof question.points !== 'number' || !Number.isFinite(question.points) || question.points < .01 || question.points > 9999.99) ||
      new Set(questions.map((q) => q.question_id.toLowerCase())).size !== questions.length ||
      new Set(questions.map((q) => q.position)).size !== questions.length ||
      questions.reduce((cents, q) => cents + Math.round(q.points * 100), 0) > 99_999_999) {
    throw validationError('Danh sách câu hỏi, thứ tự hoặc điểm không hợp lệ.');
  }

  await withTx(async (client) => {
    const { rows: [exam] } = await client.query('select id, subject_id, status from public.exams where id = $1 for update', [id]);
    if (!exam) throw missing();
    const { rowCount: attempts } = await client.query('select 1 from public.exam_attempts where exam_id = $1 limit 1', [id]);
    if (attempts) throw new HttpError(409, 'EXAM_LOCKED', 'Đề đã có lượt làm. Hãy tạo một đề mới để đổi câu hỏi.');
    if (exam.status !== 'draft') throw new HttpError(409, 'CONTENT_NOT_EDITABLE', 'Chỉ chỉnh danh sách câu hỏi khi đề ở trạng thái nháp.');
    const { rowCount } = await client.query(`
      select 1 from public.questions q left join public.chapters c on c.id = q.chapter_id
       where q.id = any($1::uuid[]) and q.subject_id = $2 and q.status = 'published'
         and (q.chapter_id is null or c.status = 'published') for share of q`,
    [questions.map((q) => q.question_id), exam.subject_id]);
    if (rowCount !== questions.length) throw validationError('Mọi câu phải đã xuất bản và thuộc đúng môn.');
    await client.query('delete from public.exam_questions where exam_id = $1', [id]);
    await client.query(`
      insert into public.exam_questions (exam_id, question_id, position, points)
      select $1, question_id, position, points
        from jsonb_to_recordset($2::jsonb) as q(question_id uuid, position int, points numeric)`,
    [id, JSON.stringify(questions)]);
    await audit(client, req.user.id, 'set_questions', 'exams', id, { count: questions.length });
  });
  res.sendStatus(204);
});

export default router;
