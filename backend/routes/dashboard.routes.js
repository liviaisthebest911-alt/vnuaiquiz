import express from 'express';
import pool from '../config/db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', optionalAuth, async (req, res) => {
  const userId = req.user?.id ?? null;
  const [{ rows: subjects }, { rows: [summary] }] = await Promise.all([
    pool.query(`
      select s.id, s.code, s.name, s.description,
             count(q.id)::int as question_count,
             count(p.question_id)::int as answered_count,
             max(p.last_answered_at) as last_answered_at
        from public.subjects s
        left join public.questions q on q.subject_id = s.id and q.status = 'published'
         and (q.chapter_id is null or exists (
           select 1 from public.chapters c where c.id = q.chapter_id and c.status = 'published'
         ))
        left join public.learning_progress p on p.question_id = q.id and p.user_id = $1
       where s.status = 'published'
       group by s.id
       order by last_answered_at desc nulls last, s.sort_order, s.name`, [userId]),
    pool.query(`
      with visible_materials as (
        select m.id, m.title, m.published_at, s.name as subject_name
          from public.materials m join public.subjects s on s.id = m.subject_id
          left join public.chapters c on c.id = m.chapter_id
         where m.status = 'published' and s.status = 'published'
           and (m.chapter_id is null or c.status = 'published')
      ), visible_exams as (
        select e.id, e.title, e.duration_minutes, e.closes_at, e.published_at, s.name as subject_name
          from public.exams e join public.subjects s on s.id = e.subject_id
         where e.status = 'published' and s.status = 'published'
      )
      select (select count(*)::int from visible_materials) as materials_count,
             (select count(*)::int from visible_exams) as exams_count,
             (select count(*)::int from public.exam_attempts where user_id = $1 and status <> 'in_progress') as attempts_count,
             coalesce((select json_agg(m) from (
               select * from visible_materials order by published_at desc nulls last, id limit 5
             ) m), '[]') as recent_materials,
             coalesce((select json_agg(e) from (
               select * from visible_exams where closes_at is null or closes_at > now()
               order by published_at desc nulls last, id limit 5
             ) e), '[]') as available_exams`, [userId]),
  ]);
  const data = {
    totals: { subjects: subjects.length, materials: summary.materials_count, exams: summary.exams_count },
    subjects: req.user ? subjects : subjects.map(({ answered_count, last_answered_at, ...subject }) => subject),
    recent_materials: summary.recent_materials,
    available_exams: summary.available_exams,
  };
  if (req.user) {
    data.attempts_count = summary.attempts_count;
    data.progress_by_subject = subjects.map(({ id, question_count, answered_count, last_answered_at }) =>
      ({ subject_id: id, question_count, answered_count, last_answered_at }));
  }
  res.json({ data });
});

export default router;
