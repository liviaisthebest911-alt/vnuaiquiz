import { randomInt } from 'node:crypto';
import express from 'express';
import pool, { withTx } from '../config/db.js';
import { optionalAuth, requireAuth, UUID } from '../middleware/auth.js';
import { HttpError, validationError } from '../middleware/errors.js';

const router = express.Router();
const notFound = () => new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đề hoặc lượt làm bài.');
const attemptClosed = () => new HttpError(409, 'ATTEMPT_CLOSED', 'Bài thi đã được chốt.');
const examColumns = `
  select e.id, e.title, e.description, e.duration_minutes, e.max_score, e.max_attempts, e.closes_at,
         s.code as subject_code, s.name as subject_name,
         (select count(*)::int from public.exam_questions eq where eq.exam_id = e.id) as question_count,
         (select count(*)::int from public.exam_attempts a where a.exam_id = e.id and a.user_id = $1) as attempts_count,
         (select a.id from public.exam_attempts a
           where a.exam_id = e.id and a.user_id = $1 and a.status = 'in_progress') as active_attempt_id
    from public.exams e join public.subjects s on s.id = e.subject_id
   where e.status = 'published' and s.status = 'published'`;

async function listExams(req, res) {
  const subject = req.params.subjectId;
  if (subject && !UUID.test(subject)) throw notFound();
  const { rows } = await pool.query(`${examColumns} and ($2::uuid is null or s.id = $2)
    order by e.published_at desc nulls last, e.id`, [req.user?.id ?? null, subject ?? null]);
  res.json({ data: rows });
}
router.get('/exams', optionalAuth, listExams);
router.get('/subjects/:subjectId/exams', optionalAuth, listExams);

router.get('/exams/:id', optionalAuth, async (req, res) => {
  if (!UUID.test(req.params.id)) throw notFound();
  const { rows: [exam] } = await pool.query(`${examColumns} and e.id = $2`, [req.user?.id ?? null, req.params.id]);
  if (!exam) throw notFound();
  res.json({ data: exam });
});

function shuffle(items, enabled) {
  if (!enabled) return items;
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function finish(client, attempt) {
  if (attempt.status !== 'in_progress') return;
  const expired = (await client.query('select clock_timestamp() >= $1::timestamptz as expired', [attempt.deadline_at])).rows[0].expired;
  await client.query(`
    with questions as (
      select * from jsonb_to_recordset($2::jsonb) as q(question_id uuid, correct_option_ids uuid[], points numeric)
    ), scored as (
      select q.question_id, coalesce(a.selected_option_ids, '{}'::uuid[]) as selected_option_ids,
             q.correct_option_ids <@ a.selected_option_ids and q.correct_option_ids @> a.selected_option_ids as is_correct,
             q.points
        from questions q left join public.user_answers a on a.attempt_id = $1 and a.question_id = q.question_id
    ), recorded as (
      insert into public.user_answers (attempt_id, question_id, selected_option_ids, is_correct, points_awarded)
      select $1, question_id, selected_option_ids, coalesce(is_correct, false), case when is_correct then points else 0 end from scored
      on conflict (attempt_id, question_id) do update set
        is_correct = excluded.is_correct, points_awarded = excluded.points_awarded
      returning question_id, selected_option_ids, is_correct, points_awarded
    ), progress as (
      insert into public.learning_progress as p (user_id, question_id, correct_count, wrong_count, last_correct)
      select $3, question_id, is_correct::int, (not is_correct)::int, is_correct from recorded where cardinality(selected_option_ids) > 0
      order by question_id
      on conflict (user_id, question_id) do update
        set correct_count = p.correct_count + excluded.correct_count, wrong_count = p.wrong_count + excluded.wrong_count,
            last_correct = excluded.last_correct, last_answered_at = now()
    ), totals as (
      select coalesce(sum(points_awarded), 0) earned, count(*) filter (where is_correct)::int correct from recorded
    )
    update public.exam_attempts a
       set status = $4, submitted_at = clock_timestamp(), earned_points = t.earned, correct_count = t.correct,
           score = round(t.earned / a.total_points * $5::numeric, 2)
      from totals t where a.id = $1`, [attempt.id, JSON.stringify(attempt.question_order), attempt.user_id,
    expired ? 'expired' : 'submitted', attempt.question_order[0].max_score]);
}

router.post('/exams/:id/attempts', requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!UUID.test(id)) throw notFound();
  const result = await withTx(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`exam-attempt:${req.user.id}:${id.toLowerCase()}`]);
    const { rows: [exam] } = await client.query(`
      select e.* from public.exams e join public.subjects s on s.id = e.subject_id
       where e.id = $1 and e.status = 'published' and s.status = 'published' for share of e, s`, [id]);
    if (!exam) throw notFound();
    const { rows: [existing] } = await client.query(`
      select *, deadline_at <= clock_timestamp() as expired from public.exam_attempts
       where exam_id = $1 and user_id = $2 and status = 'in_progress' for update`, [id, req.user.id]);
    if (existing && !existing.expired) return { id: existing.id, created: false };
    if (existing) {
      await finish(client, existing);
      return { id: existing.id, created: false };
    }

    const { rows: [eligibility] } = await client.query(`
      select count(*)::int as attempts, ($3::timestamptz is not null and $3 <= clock_timestamp()) as closed
        from public.exam_attempts where exam_id = $1 and user_id = $2`, [id, req.user.id, exam.closes_at]);
    if (eligibility.closed || (exam.max_attempts !== null && eligibility.attempts >= exam.max_attempts)) {
      return { error: new HttpError(409, 'EXAM_UNAVAILABLE', 'Đề đã đóng hoặc bạn đã hết lượt làm.') };
    }

    const { rows: questions } = await client.query(`
      select q.id as question_id, q.type, q.content, q.explanation, eq.points,
             coalesce((select json_agg(json_build_object('id', o.id, 'content', o.content, 'is_correct', o.is_correct)
                        order by o.position) from public.question_options o where o.question_id = q.id), '[]') as options
        from public.exam_questions eq join public.questions q on q.id = eq.question_id
        left join public.chapters c on c.id = q.chapter_id
       where eq.exam_id = $1 and q.subject_id = $2 and q.status = 'published'
         and (q.chapter_id is null or c.status = 'published')
       order by eq.position for share of q`, [id, exam.subject_id]);
    const { rows: [{ count }] } = await client.query(
      'select count(*)::int from public.exam_questions where exam_id = $1', [id]);
    if (count === 0 || count > 250 || questions.length !== count ||
        questions.some((question) => question.options.length > 30) ||
        questions.reduce((cents, question) => cents + Math.round(Number(question.points) * 100), 0) > 99_999_999) {
      return { error: new HttpError(409, 'EXAM_NOT_READY', 'Đề thi có câu hỏi chưa sẵn sàng.') };
    }

    const snapshot = shuffle(questions, exam.shuffle_questions).map(({ options, ...question }) => ({
      ...question,
      options: shuffle(options.map(({ id, content }) => ({ id, content })), exam.shuffle_options),
      correct_option_ids: options.filter((option) => option.is_correct).map((option) => option.id),
      max_score: exam.max_score,
      answer_visibility: exam.answer_visibility,
      closes_at: exam.closes_at,
    }));
    const { rows: [attempt] } = await client.query(`
      with start as (select clock_timestamp() as now)
      insert into public.exam_attempts (exam_id, user_id, started_at, deadline_at, question_order, total_points)
      select $1, $2, now, least(now + make_interval(mins => $3), $4::timestamptz), $5::jsonb,
             (select sum(points) from jsonb_to_recordset($5::jsonb) as q(points numeric))
        from start where $4::timestamptz is null or $4 > now
      returning id`, [id, req.user.id, exam.duration_minutes, exam.closes_at, JSON.stringify(snapshot)]);
    return attempt ? { id: attempt.id, created: true }
      : { error: new HttpError(409, 'EXAM_UNAVAILABLE', 'Đề thi đã đóng.') };
  });
  if (result.error) throw result.error;
  res.status(result.created ? 201 : 200).json({ data: { id: result.id } });
});

async function ownedAttempt(client, req) {
  if (!UUID.test(req.params.id)) throw notFound();
  const { rows: [attempt] } = await client.query(`
    select a.*, e.title, clock_timestamp() as server_now
      from public.exam_attempts a join public.exams e on e.id = a.exam_id
     where a.id = $1 and a.user_id = $2 for update of a`, [req.params.id, req.user.id]);
  if (!attempt) throw notFound();
  return attempt;
}

async function attemptResponse(client, req, submit) {
  let attempt = await ownedAttempt(client, req);
  if (attempt.status === 'in_progress' && (submit || attempt.deadline_at <= attempt.server_now)) {
    await finish(client, attempt);
    attempt = await ownedAttempt(client, req);
  }
  const { rows: answers } = await client.query(`
    select question_id, selected_option_ids, is_correct, points_awarded
      from public.user_answers where attempt_id = $1`, [attempt.id]);
  const byId = new Map(answers.map((a) => [a.question_id, a]));
  const { question_order, user_id, ...data } = attempt;
  const policy = question_order[0];
  const showAnswers = attempt.status !== 'in_progress' && (policy.answer_visibility === 'after_submit' ||
    (policy.answer_visibility === 'after_close' && new Date(policy.closes_at) <= attempt.server_now));
  data.max_score = policy.max_score;
  data.questions = question_order.map(({ question_id, type, content, options, correct_option_ids, explanation }) => {
    const answer = byId.get(question_id);
    return {
      id: question_id, type, content, options, selected_option_ids: answer?.selected_option_ids ?? [],
      ...(attempt.status !== 'in_progress' && { is_correct: answer?.is_correct, points_awarded: answer?.points_awarded }),
      ...(showAnswers && { correct_option_ids, explanation }),
    };
  });
  return data;
}

router.get('/attempts/:id', requireAuth, async (req, res) => {
  res.json({ data: await withTx((client) => attemptResponse(client, req, false)) });
});

router.put('/attempts/:id/answers/:questionId', requireAuth, async (req, res) => {
  const ids = req.body?.selected_option_ids;
  if (!UUID.test(req.params.questionId) || !Array.isArray(ids) || ids.length > 30 ||
      ids.some((id) => typeof id !== 'string' || !UUID.test(id))) throw validationError('Lựa chọn không hợp lệ.');
  const selected = ids.map((id) => id.toLowerCase());
  if (new Set(selected).size !== selected.length) throw validationError('Lựa chọn bị trùng.');
  const saved = await withTx(async (client) => {
    const attempt = await ownedAttempt(client, req);
    if (attempt.status !== 'in_progress') return false;
    const question = attempt.question_order.find((q) => q.question_id === req.params.questionId.toLowerCase());
    if (!question) throw notFound();
    if ((question.type === 'single_choice' && selected.length > 1) ||
        selected.some((id) => !question.options.some((option) => option.id === id))) {
      throw validationError('Lựa chọn không thuộc câu hỏi hoặc sai số lượng.');
    }
    const { rowCount } = await client.query(`
      insert into public.user_answers (attempt_id, question_id, selected_option_ids)
      select $1, $2, $3 where clock_timestamp() < $4::timestamptz
      on conflict (attempt_id, question_id) do update
        set selected_option_ids = excluded.selected_option_ids, answered_at = clock_timestamp()`,
    [attempt.id, question.question_id, selected, attempt.deadline_at]);
    if (!rowCount) await finish(client, attempt);
    return rowCount > 0;
  });
  if (!saved) throw attemptClosed();
  res.sendStatus(204);
});

router.post('/attempts/:id/submit', requireAuth, async (req, res) => {
  res.json({ data: await withTx((client) => attemptResponse(client, req, true)) });
});

router.get('/me/attempts', requireAuth, async (req, res) => {
  const { exam_id, page = '1', limit = '20' } = req.query;
  if ((exam_id !== undefined && (typeof exam_id !== 'string' || !UUID.test(exam_id))) ||
      typeof page !== 'string' || !/^[1-9]\d{0,5}$/.test(page) ||
      typeof limit !== 'string' || !/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100) {
    throw validationError('Tham số lịch sử không hợp lệ.');
  }
  const { rows } = await pool.query(`
    select a.id, a.exam_id, e.title, a.started_at, a.submitted_at, a.deadline_at, a.status, a.score, a.correct_count
      from public.exam_attempts a join public.exams e on e.id = a.exam_id
     where a.user_id = $1 and ($2::uuid is null or a.exam_id = $2)
     order by a.started_at desc, a.id limit $3 offset $4`,
  [req.user.id, exam_id ?? null, Number(limit) + 1, (Number(page) - 1) * Number(limit)]);
  res.json({ data: rows.slice(0, Number(limit)), meta: { has_more: rows.length > Number(limit) } });
});

export default router;
