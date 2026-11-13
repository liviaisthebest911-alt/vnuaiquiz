import express from 'express';
import pool from '../config/db.js';
import { optionalAuth, requireAuth, UUID } from '../middleware/auth.js';
import { HttpError, validationError } from '../middleware/errors.js';

const router = express.Router();
const questionNotFound = () => new HttpError(404, 'NOT_FOUND', 'Không tìm thấy câu hỏi.');
const SUBJECT_CHAPTERS = `
  from public.questions q
  join public.subjects s on s.id = q.subject_id
  left join public.chapters c on c.id = q.chapter_id`;
const VISIBLE = `q.status = 'published' and s.status = 'published'
  and (q.chapter_id is null or c.status = 'published')`;

router.get('/subjects/:idOrCode', optionalAuth, async (req, res) => {
  const idOrCode = req.params.idOrCode;
  const { rows: [subject] } = await pool.query(`
    select id, code, name, description
      from public.subjects
     where status = 'published' and ${UUID.test(idOrCode) ? 'id = $1' : 'code = upper($1)'}`, [idOrCode]);
  if (!subject) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy môn học.');

  const { rows: chapters } = await pool.query(`
    select c.id, c.position, c.title, c.description, count(q.id)::int as question_count
      from public.chapters c
      left join public.questions q on q.chapter_id = c.id and q.status = 'published'
     where c.subject_id = $1 and c.status = 'published'
     group by c.id order by c.position`, [subject.id]);
  const { rows: topics } = await pool.query(`
    select t.id, t.name, t.chapter_id
      from public.topics t left join public.chapters c on c.id = t.chapter_id
     where t.subject_id = $1 and (t.chapter_id is null or c.status = 'published')
     order by t.name, t.id`, [subject.id]);
  res.json({ data: { ...subject, chapters, topics } });
});

function listQuestions(flashcards) {
  return async (req, res) => {
    const { subject_id, chapter_id, topic_id, bookmarked, limit = '100', page = '1', resume = 'false' } = req.query;
    if (typeof subject_id !== 'string' || !UUID.test(subject_id)) {
      throw validationError('Cần chọn môn học hợp lệ.');
    }
    for (const value of [chapter_id, topic_id]) {
      if (value !== undefined && (typeof value !== 'string' || !UUID.test(value))) {
        throw validationError('Chương hoặc chủ đề không hợp lệ.');
      }
    }
    if (typeof limit !== 'string' || !/^\d{1,3}$/.test(limit) || Number(limit) < 1 || Number(limit) > 250 ||
        typeof page !== 'string' || !/^[1-9]\d{0,5}$/.test(page) ||
        !['true', 'false'].includes(resume) ||
        (bookmarked !== undefined && !['true', 'false'].includes(bookmarked))) {
      throw validationError('Tham số lọc không hợp lệ.');
    }

    // Chỉ flashcard trả đáp án. Practice chấm trên server sau khi người học nộp lựa chọn.
    const answerFields = flashcards ? ", 'is_correct', o.is_correct" : '';
    const explanation = flashcards ? ', q.explanation' : '';
    const { rows } = await pool.query(`
      with ordered as (
        select q.id, q.chapter_id, q.topic_id, q.type, q.content, q.difficulty${explanation},
               (b.question_id is not null) as bookmarked,
               (p.question_id is not null) as answered,
               row_number() over (order by c.position nulls last, q.legacy_number nulls last, q.created_at, q.id) as position
          ${SUBJECT_CHAPTERS}
          left join public.bookmarks b on b.user_id = $1 and b.question_id = q.id
          left join public.learning_progress p on p.user_id = $1 and p.question_id = q.id
         where ${VISIBLE} and q.subject_id = $2
           and ($3::uuid is null or q.chapter_id = $3)
           and ($4::uuid is null or q.topic_id = $4)
           and (not $5::boolean or b.question_id is not null)
      ), selected_page as (
        select case when $8::boolean then coalesce((min(position) filter (where not answered) - 1) / $6::int + 1, 1)
                    else $7::int end as page from ordered
      )
      select q.*, selected_page.page::int,
             coalesce((select json_agg(json_build_object('id', o.id, 'content', o.content${answerFields}) order by o.position)
                         from public.question_options o where o.question_id = q.id), '[]') as options
        from ordered q cross join selected_page
       where q.position > (selected_page.page - 1) * $6::int
         and q.position <= selected_page.page * $6::int + 1
       order by q.position`, [req.user.id, subject_id, chapter_id ?? null, topic_id ?? null,
        bookmarked === 'true', Number(limit), Number(page), resume === 'true']);
    res.json({ data: rows.slice(0, Number(limit)).map(({ position, page, ...question }) => question),
      meta: { page: rows[0]?.page ?? Number(page), has_more: rows.length > Number(limit) } });
  };
}

router.get('/practice/questions', requireAuth, listQuestions(false));
router.get('/flashcards', requireAuth, listQuestions(true));

router.post('/practice/answers', requireAuth, async (req, res) => {
  const { question_id, selected_option_ids } = req.body ?? {};
  if (typeof question_id !== 'string' || !UUID.test(question_id) ||
      !Array.isArray(selected_option_ids) || selected_option_ids.length < 1 || selected_option_ids.length > 30 ||
      selected_option_ids.some((id) => typeof id !== 'string' || !UUID.test(id))) {
    throw validationError('Câu hỏi hoặc lựa chọn không hợp lệ.');
  }
  const selected = selected_option_ids.map((id) => id.toLowerCase());
  if (new Set(selected).size !== selected.length) throw validationError('Lựa chọn bị trùng.');

  const { rows: [answer] } = await pool.query(`
    with answer as (
      select q.id, q.explanation,
             array(select o.id from public.question_options o
                    where o.question_id = q.id and o.is_correct order by o.position) as correct_option_ids
        ${SUBJECT_CHAPTERS}
       where q.id = $2 and ${VISIBLE}
         and (q.type <> 'single_choice' or cardinality($3::uuid[]) = 1)
         and not exists (
           select 1 from unnest($3::uuid[]) picked(id)
            where not exists (select 1 from public.question_options o where o.id = picked.id and o.question_id = q.id)
         )
    ), result as (
      select *, correct_option_ids <@ $3::uuid[] and correct_option_ids @> $3::uuid[] as is_correct from answer
    ), progress as (
      insert into public.learning_progress as p
        (user_id, question_id, correct_count, wrong_count, last_correct)
      select $1, id, is_correct::int, (not is_correct)::int, is_correct from result
      on conflict (user_id, question_id) do update
        set correct_count = p.correct_count + excluded.correct_count,
            wrong_count = p.wrong_count + excluded.wrong_count,
            last_correct = excluded.last_correct, last_answered_at = now()
      returning question_id
    )
    select r.is_correct, r.correct_option_ids, r.explanation
      from result r join progress p on p.question_id = r.id`, [req.user.id, question_id, selected]);

  if (!answer) {
    const { rowCount } = await pool.query(`select 1 ${SUBJECT_CHAPTERS} where q.id = $1 and ${VISIBLE}`, [question_id]);
    if (!rowCount) throw questionNotFound();
    throw validationError('Lựa chọn không thuộc câu hỏi hoặc sai số lượng.');
  }
  res.json({ data: answer });
});

router.get('/me/bookmarks', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    select q.id as question_id, q.subject_id, q.chapter_id, q.content, b.created_at
      ${SUBJECT_CHAPTERS} join public.bookmarks b on b.question_id = q.id
     where b.user_id = $1 and ${VISIBLE} order by b.created_at desc, q.id`, [req.user.id]);
  res.json({ data: rows });
});

router.put('/me/bookmarks/:questionId', requireAuth, async (req, res) => {
  const id = req.params.questionId;
  if (!UUID.test(id)) throw questionNotFound();
  const { rowCount } = await pool.query(`
    with visible as (select q.id ${SUBJECT_CHAPTERS} where q.id = $2 and ${VISIBLE}),
    saved as (
      insert into public.bookmarks (user_id, question_id) select $1, id from visible
      on conflict do nothing
    )
    select 1 from visible`, [req.user.id, id]);
  if (!rowCount) throw questionNotFound();
  res.sendStatus(204);
});

router.delete('/me/bookmarks/:questionId', requireAuth, async (req, res) => {
  const id = req.params.questionId;
  if (!UUID.test(id)) throw questionNotFound();
  await pool.query('delete from public.bookmarks where user_id = $1 and question_id = $2', [req.user.id, id]);
  res.sendStatus(204);
});

export default router;
