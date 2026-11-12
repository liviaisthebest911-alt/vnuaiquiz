// Seed P1 (docs/DATABASE_DESIGN.md §6): danh mục tài liệu, 5 môn, 5 chương CNSAI, 200 câu từ bản backup.
// Một transaction: lỗi/không khớp số lượng → rollback, DB giữ nguyên.
// Idempotent: chạy lại không thêm dòng, không đổi UUID, không ghi đè nội dung đã sửa trên DB.
//
//   DATABASE_URL=postgres://... node db/seed/import-legacy-questions.js [--allow-remote]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { databaseHost, dbSsl, isLocalDatabase } from '../../config/dbSsl.js';

const BACKUP = new URL('./legacy/questions.2026-11-11.json', import.meta.url);
const CHECKSUM = new URL('./legacy/questions.2026-11-11.json.sha256', import.meta.url);
const EXPECTED = { questions: 200, options: 801, chapters: 5, perChapter: 40 };

const CATEGORIES = [
  ['textbook', 'Giáo trình'], ['lecture', 'Bài giảng'], ['slide', 'Slide'],
  ['syllabus', 'Đề cương'], ['review', 'Tài liệu ôn tập'], ['reference', 'Tài liệu tham khảo'],
];
const SUBJECTS = [
  ['LSD', 'Lịch sử Đảng Cộng sản Việt Nam'],
  ['NNPL', 'Nhà nước và Pháp luật đại cương'],
  ['TRIET', 'Triết học'],
  ['KTCT', 'Kinh tế chính trị'],
  ['CNSAI', 'Nhập môn Công nghệ số và Ứng dụng Trí tuệ nhân tạo'],
];

export function loadLegacyQuestions(file = BACKUP, checksumFile = CHECKSUM) {
  const raw = readFileSync(file);
  const expected = readFileSync(checksumFile, 'utf8').split(/\s+/)[0];
  const actual = createHash('sha256').update(raw).digest('hex');
  if (actual !== expected) throw new Error(`Checksum bản backup không khớp: ${actual} ≠ ${expected}`);

  const questions = JSON.parse(raw);
  const seen = new Set();
  const chapterNames = new Map();
  for (const q of questions) {
    const chapter = Number(q.chapter);
    const key = `${chapter}:${q.id}`;
    const ok = Number.isInteger(chapter) && chapter > 0 && Number.isInteger(q.id)
      && typeof q.question === 'string' && q.question.trim()
      && Array.isArray(q.options) && q.options.length >= 2
      && q.options.every((o) => typeof o === 'string' && o.trim())
      && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length
      && typeof q.chapterName === 'string' && !seen.has(key)
      && (chapterNames.get(chapter) ?? q.chapterName) === q.chapterName;
    if (!ok) throw new Error(`Câu hỏi không hợp lệ hoặc trùng (chương ${q.chapter}, id ${q.id})`);
    seen.add(key);
    chapterNames.set(chapter, q.chapterName);
  }
  return questions;
}

const COUNTS_SQL = `
  select (select count(*) from subjects)::int            as subjects,
         (select count(*) from material_categories)::int as categories,
         (select count(*) from chapters)::int            as chapters,
         (select count(*) from questions)::int           as questions,
         (select count(*) from question_options)::int    as options`;

export async function seed(client, questions, log = console.log) {
  await client.query('begin');
  try {
    await client.query(`select pg_advisory_xact_lock(hashtext('vnuaiquiz:seed'))`); // chặn 2 lần seed chạy song song
    const before = (await client.query(COUNTS_SQL)).rows[0];

    await client.query(
      `insert into material_categories (code, name, sort_order)
       select code, name, ord::int from unnest($1::text[], $2::text[]) with ordinality as t(code, name, ord)
       on conflict (code) do nothing`,
      [CATEGORIES.map((c) => c[0]), CATEGORIES.map((c) => c[1])],
    );
    await client.query(
      `insert into subjects (code, name, status, sort_order)
       select code, name, 'published', ord::int from unnest($1::text[], $2::text[]) with ordinality as t(code, name, ord)
       on conflict (code) do nothing`,
      [SUBJECTS.map((s) => s[0]), SUBJECTS.map((s) => s[1])],
    );
    const { rows: [{ id: subjectId }] } = await client.query(`select id from subjects where code = 'CNSAI'`);

    const chapterIds = new Map();
    for (const q of questions) {
      const position = Number(q.chapter);
      if (chapterIds.has(position)) continue;
      // unique (subject_id, position) là deferrable → không dùng được on conflict
      await client.query(
        `insert into chapters (subject_id, position, title)
         select $1, $2, $3 where not exists (select 1 from chapters where subject_id = $1 and position = $2)`,
        [subjectId, position, q.chapterName.replace(/^Chương\s+\d+\s*:\s*/u, '')],
      );
      const { rows: [{ id }] } = await client.query(
        'select id from chapters where subject_id = $1 and position = $2', [subjectId, position]);
      chapterIds.set(position, id);
    }

    // shortcut: ~400 round trip tuần tự (vài chục giây qua pooler từ xa), đủ cho seed chạy một lần; gộp bằng unnest nếu cần nhanh hơn.
    for (const q of questions) {
      const { rows } = await client.query(
        `insert into questions (subject_id, chapter_id, content, explanation, status, source, legacy_number)
         values ($1, $2, $3, $4, 'published', 'import', $5)
         on conflict (chapter_id, legacy_number) do nothing returning id`,
        [subjectId, chapterIds.get(Number(q.chapter)), q.question, q.explanation || null, q.id],
      );
      if (!rows.length) continue; // đã có từ lần seed trước – giữ nguyên
      await client.query(
        `insert into question_options (question_id, position, content, is_correct)
         select $1, ord - 1, content, ord - 1 = $3 from unnest($2::text[]) with ordinality as t(content, ord)`,
        [rows[0].id, q.options, q.answer],
      );
    }

    // Đối chiếu riêng các câu import (câu do editor thêm sau này không làm hỏng phép kiểm tra)
    const { rows: perChapter } = await client.query(
      `select c.position, count(distinct q.id)::int as questions, count(o.id)::int as options,
              count(distinct q.id) filter (where (select count(*) from question_options x
                                                   where x.question_id = q.id and x.is_correct) = 1)::int as one_correct
         from questions q join chapters c on c.id = q.chapter_id
         left join question_options o on o.question_id = q.id
        where q.subject_id = $1 and q.source = 'import' and q.legacy_number is not null
        group by c.position order by c.position`,
      [subjectId],
    );
    const total = (k) => perChapter.reduce((s, r) => s + r[k], 0);
    if (perChapter.length !== EXPECTED.chapters || perChapter.some((r) => r.questions !== EXPECTED.perChapter)
        || total('questions') !== EXPECTED.questions || total('options') !== EXPECTED.options
        || total('one_correct') !== EXPECTED.questions) {
      throw new Error(`Số lượng sau import không khớp: ${JSON.stringify(perChapter)}`);
    }

    await client.query('set constraints all immediate'); // chạy trigger kiểm tra lựa chọn ngay, trước commit
    const after = (await client.query(COUNTS_SQL)).rows[0];
    await client.query('commit');
    log('Trước:', before);
    log('Sau:  ', after);
    log('Theo chương (CNSAI):', perChapter);
    return { before, after, perChapter };
  } catch (err) {
    await client.query('rollback');
    throw err;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.DATABASE_URL; // cố ý không đọc .env: tránh seed nhầm DB production
  if (!url) {
    console.error('Thiếu DATABASE_URL.');
    process.exit(1);
  }
  let client;
  try {
    const host = databaseHost(url);
    if (!isLocalDatabase(url) && !process.argv.includes('--allow-remote')) {
      console.error(`Từ chối seed lên ${host}. Đã pg_dump chưa? Thêm --allow-remote nếu chắc chắn.`);
      process.exit(1);
    }
    client = new pg.Client({ connectionString: url, ssl: dbSsl(url) });
    console.log(`Seed → ${host}`);
  } catch (err) {
    console.error(err.message); // thông báo từ dbSsl, không chứa chuỗi kết nối
    process.exit(1);
  }
  try {
    const questions = loadLegacyQuestions();
    await client.connect();
    await seed(client, questions);
  } catch (err) {
    console.error('Seed thất bại, đã rollback:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
