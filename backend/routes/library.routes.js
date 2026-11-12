// Kho tài liệu – API công khai (guest được xem/tải tài liệu đã xuất bản, API_SPECIFICATION.md §3–§4).
// Nội dung chưa xuất bản (của tài liệu, môn hoặc chương) → 404 cho guest/user; editor/admin xem trước được.
import express from 'express';
import pool from '../config/db.js';
import { hasRole, optionalAuth, requireAuth, UUID } from '../middleware/auth.js';
import { HttpError, validationError } from '../middleware/errors.js';
import { createSignedUrl } from '../services/storage.js';

const router = express.Router();
// Mọi route: có header Authorization thì phải hợp lệ (token giả → 401, không được tính là phiên đăng nhập).
router.use(optionalAuth);
const SIGNED_URL_SECONDS = 300;
const notFound = () => new HttpError(404, 'NOT_FOUND', 'Không tìm thấy tài liệu.');

// Tài liệu "hiển thị công khai" = chính nó + môn + chương (nếu có) đều published.
const VISIBLE = `m.status = 'published' and s.status = 'published' and (m.chapter_id is null or c.status = 'published')`;
const MATERIAL_FROM = `
    from public.materials m
    join public.subjects s on s.id = m.subject_id
    left join public.chapters c on c.id = m.chapter_id
    join public.material_categories mc on mc.id = m.category_id`;
export const MATERIAL_SELECT = `
  select m.id, m.title, m.description, m.status, m.original_filename, m.mime_type, m.size_bytes,
         m.storage_path, m.published_at, m.created_at,
         json_build_object('id', s.id, 'code', s.code, 'name', s.name) as subject,
         case when c.id is null then null else json_build_object('id', c.id, 'title', c.title, 'position', c.position) end as chapter,
         json_build_object('code', mc.code, 'name', mc.name) as category,
         ${VISIBLE} as visible
  ${MATERIAL_FROM}`;

export const publicMaterial = ({ storage_path, visible, ...m }) => m;

router.get('/subjects', async (req, res) => {
  const { rows } = await pool.query(`
    select s.id, s.code, s.name, s.description,
           coalesce((select json_agg(json_build_object('id', c.id, 'title', c.title, 'position', c.position) order by c.position)
                       from public.chapters c where c.subject_id = s.id and c.status = 'published'), '[]') as chapters,
           (select count(*)::int from public.materials m left join public.chapters c on c.id = m.chapter_id
             where m.subject_id = s.id and m.status = 'published' and (m.chapter_id is null or c.status = 'published')) as material_count
      from public.subjects s where s.status = 'published' order by s.sort_order, s.name`);
  res.json({ data: rows });
});

router.get('/material-categories', async (req, res) => {
  const { rows } = await pool.query('select id, code, name from public.material_categories order by sort_order, name');
  res.json({ data: rows });
});

router.get('/materials', async (req, res) => {
  const { q = '', subject_id, chapter_id, category, sort = 'newest' } = req.query;
  const page = Math.min(1_000_000, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  for (const [k, v] of Object.entries({ subject_id, chapter_id })) {
    if (v !== undefined && (typeof v !== 'string' || !UUID.test(v))) throw validationError('Tham số lọc không hợp lệ.', { [k]: 'uuid' });
  }
  if (typeof q !== 'string' || q.length > 200 || !['newest', 'title'].includes(sort) || (category !== undefined && typeof category !== 'string')) {
    throw validationError('Tham số tìm kiếm không hợp lệ.');
  }

  const params = [];
  const where = [VISIBLE];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  // Tìm theo tiêu đề; % và _ người dùng gõ là ký tự thường, không phải wildcard.
  if (q.trim()) add(`m.title ilike ? escape '\\'`, `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`);
  if (subject_id) add('m.subject_id = ?', subject_id);
  if (chapter_id) add('m.chapter_id = ?', chapter_id);
  if (category) add('mc.code = ?', category);

  const total = (await pool.query(`select count(*)::int n ${MATERIAL_FROM} where ${where.join(' and ')}`, params)).rows[0].n;
  const order = sort === 'title' ? 'm.title, m.id' : 'm.published_at desc nulls last, m.id';
  const { rows } = await pool.query(
    `${MATERIAL_SELECT} where ${where.join(' and ')} order by ${order} limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]);
  res.json({ data: rows.map(publicMaterial), meta: { page, limit, total } });
});

// Tải bản ghi theo id; nội dung không hiển thị công khai chỉ editor/admin thấy, còn lại 404 (không lộ sự tồn tại).
async function findMaterial(req) {
  if (!UUID.test(req.params.id)) throw notFound();
  const m = (await pool.query(`${MATERIAL_SELECT} where m.id = $1`, [req.params.id])).rows[0];
  if (!m || (!m.visible && !hasRole(req.user, 'editor'))) throw notFound();
  return m;
}

router.get('/materials/:id', async (req, res) => {
  res.json({ data: publicMaterial(await findMaterial(req)) });
});

const signed = async (m, download) => ({
  url: await createSignedUrl(m.storage_path, SIGNED_URL_SECONDS, download),
  expires_at: new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString(),
});

router.get('/materials/:id/view', async (req, res) => {
  const m = await findMaterial(req);
  if (m.mime_type !== 'application/pdf') throw new HttpError(409, 'NOT_VIEWABLE', 'Chỉ xem trực tuyến được tài liệu PDF – hãy tải xuống.');
  res.json({ data: await signed(m) });
});

router.get('/materials/:id/download', async (req, res) => {
  const m = await findMaterial(req);
  res.json({ data: await signed(m, m.original_filename) });
});

export const favoriteMaterialRoutes = express.Router();
favoriteMaterialRoutes.use(requireAuth);

favoriteMaterialRoutes.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    ${MATERIAL_SELECT} join public.material_favorites f on f.material_id = m.id
     where f.user_id = $1 and ${VISIBLE} order by f.created_at desc, m.id`, [req.user.id]);
  res.json({ data: rows.map(publicMaterial) });
});

favoriteMaterialRoutes.put('/:id', async (req, res) => {
  const id = req.params.id;
  if (!UUID.test(id)) throw notFound();
  const { rowCount } = await pool.query(`
    with visible as (select m.id ${MATERIAL_FROM} where m.id = $2 and ${VISIBLE}),
    saved as (
      insert into public.material_favorites (user_id, material_id) select $1, id from visible
      on conflict do nothing
    )
    select 1 from visible`, [req.user.id, id]);
  if (!rowCount) throw notFound();
  res.sendStatus(204);
});

favoriteMaterialRoutes.delete('/:id', async (req, res) => {
  const id = req.params.id;
  if (!UUID.test(id)) throw notFound();
  await pool.query('delete from public.material_favorites where user_id = $1 and material_id = $2', [req.user.id, id]);
  res.sendStatus(204);
});

export default router;
