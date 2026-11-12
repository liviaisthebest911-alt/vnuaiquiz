# DATABASE DESIGN – VNU AI Quiz

> PostgreSQL trên Supabase. File nhị phân nằm ở Supabase Storage; DB chỉ lưu metadata + `storage_path`.

## 1. Quy ước

- **Khoá chính là UUID** (`gen_random_uuid()`); `users.id` = `auth.users.id` của Supabase Auth. Mã môn học (`subjects.code`) là định danh nghiệp vụ `unique`, không dùng làm khoá chính hay FK.
- Thời gian `timestamptz`; chuỗi `text`; giá trị liệt kê dùng `text` + `check` (dễ thêm giá trị hơn enum type).
- Trạng thái nội dung dùng chung: `draft` → `in_review` → `published` ⇄ `hidden` (câu hỏi dùng `archived` thay `hidden`). Quy trình chuyển trạng thái ở §4. **Không xoá cứng nội dung đã được dùng** – FK `on delete restrict`, admin ẩn/lưu trữ thay vì xoá.
- Mọi cột FK đều có index. Bảng có `updated_at` dùng chung một trigger `set_updated_at()`.
- RLS bật trên mọi bảng, không có policy cho `anon`/`authenticated` (chỉ backend truy cập qua kết nối trực tiếp).
- Migration là file SQL đánh số trong `backend/db/migrations/`, chỉ thêm mới, không sửa file đã chạy.

## 2. Sơ đồ quan hệ

```
roles 1─* users
subjects 1─* chapters 1─* topics            (topics.subject_id bắt buộc, chapter_id tuỳ chọn)
subjects 1─* materials *─1 material_categories
           materials *─0..1 chapters / topics
subjects 1─* questions 1─* question_options
           questions *─0..1 chapters / topics
subjects 1─* exams 1─* exam_questions *─1 questions
exams 1─* exam_attempts *─1 users
exam_attempts 1─* user_answers *─1 questions
users *─* questions   via bookmarks, learning_progress
users *─* materials   via material_favorites
users 1─* audit_logs
```

## 3. DDL

```sql
create extension if not exists pg_trgm;

-- ---------- Người dùng & quyền ----------
create table roles (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('user','editor','admin')),
  name text not null
);

create table users (                         -- profile, 1-1 với auth.users
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  full_name    text,
  student_code text unique,
  role_id      uuid     not null references roles(id),
  status       text not null default 'active' check (status in ('active','blocked')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on users (role_id);

-- ---------- Môn học, chương, chủ đề ----------
create table subjects (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,            -- định danh nghiệp vụ (LSD, CNSAI…), dùng trong URL; KHÔNG phải khoá chính
  name             text not null,
  description      text,
  cover_image_path text,                            -- path trong bucket public-assets
  status           text not null default 'draft' check (status in ('draft','in_review','published','hidden')),
  sort_order       int  not null default 0,
  created_by       uuid references users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on subjects (created_by);

create table chapters (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid   not null references subjects(id) on delete restrict,
  position    int    not null,
  title       text   not null,
  description text,
  status      text   not null default 'published' check (status in ('draft','in_review','published','hidden')),
  unique (id, subject_id),                         -- đích cho FK kép bên dưới
  unique (subject_id, position) deferrable initially deferred  -- cho phép đổi thứ tự trong 1 transaction
);

create table topics (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid   not null references subjects(id) on delete restrict,
  chapter_id uuid  ,
  name       text   not null,
  unique (id, subject_id),
  -- chủ đề chỉ được gắn vào chương CÙNG môn
  foreign key (chapter_id, subject_id) references chapters(id, subject_id) on delete restrict
);
create index on topics (subject_id);
create index on topics (chapter_id);

-- ---------- Tài liệu ----------
create table material_categories (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,   -- textbook, lecture, slide, syllabus, review, reference
  name       text not null,
  sort_order int  not null default 0
);

create table materials (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid     not null references subjects(id) on delete restrict,
  chapter_id        uuid  ,
  topic_id          uuid  ,
  category_id       uuid     not null references material_categories(id),
  title             text     not null,
  description       text,
  storage_path      text     not null unique,      -- key trong bucket `materials`: <uuid>.<ext>
  original_filename text     not null,
  mime_type         text     not null,
  size_bytes        bigint   not null check (size_bytes > 0 and size_bytes <= 52428800),
  status            text     not null default 'draft' check (status in ('draft','in_review','published','hidden')),
  uploaded_by       uuid references users(id) on delete set null,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (chapter_id, subject_id) references chapters(id, subject_id),
  foreign key (topic_id, subject_id)   references topics(id, subject_id)
);
create index on materials (subject_id, status, created_at desc);
create index on materials (chapter_id);
create index on materials (topic_id);
create index on materials (category_id);
create index on materials (uploaded_by);
create index materials_title_trgm on materials using gin (title gin_trgm_ops);  -- tìm kiếm ILIKE

create table material_favorites (
  user_id     uuid   not null references users(id) on delete cascade,
  material_id uuid   not null references materials(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, material_id)
);
create index on material_favorites (material_id);

-- ---------- Ngân hàng câu hỏi ----------
create table questions (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid   not null references subjects(id) on delete restrict,
  chapter_id  uuid  ,
  topic_id    uuid  ,
  type        text   not null default 'single_choice' check (type in ('single_choice','multiple_choice')),
  content     text   not null,
  explanation text,
  difficulty  text   check (difficulty in ('easy','medium','hard')),
  status      text   not null default 'draft' check (status in ('draft','in_review','published','archived')),
  source      text   not null default 'manual' check (source in ('manual','import','ai')),
  legacy_number int,                                 -- số thứ tự cũ trong questions.json, chỉ duy nhất TRONG một chương
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (chapter_id, legacy_number),               -- câu cũ được phân biệt bằng chương, không bằng id cũ
  foreign key (chapter_id, subject_id) references chapters(id, subject_id),
  foreign key (topic_id, subject_id)   references topics(id, subject_id)
);
create index on questions (subject_id, status, chapter_id);
create index on questions (chapter_id);
create index on questions (topic_id);
create index on questions (created_by);

create table question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid     not null references questions(id) on delete cascade,
  position    smallint not null,
  content     text     not null,
  is_correct  boolean  not null default false,
  unique (question_id, position)
);

-- ---------- Đề thi ----------
create table exams (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid   not null references subjects(id) on delete restrict,
  title             text   not null,
  description       text,
  duration_minutes  int    not null check (duration_minutes between 1 and 600),
  max_score         numeric(6,2) not null default 10 check (max_score > 0),
  shuffle_questions boolean not null default false,
  shuffle_options   boolean not null default false,
  answer_visibility text   not null default 'after_submit'
                    check (answer_visibility in ('never','after_submit','after_close')),
  closes_at         timestamptz,                     -- bắt buộc khi answer_visibility = 'after_close'
  max_attempts      int    check (max_attempts > 0), -- null = không giới hạn
  status            text   not null default 'draft' check (status in ('draft','in_review','published','hidden')),
  created_by        uuid references users(id) on delete set null,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (answer_visibility <> 'after_close' or closes_at is not null)
);
create index on exams (subject_id, status);
create index on exams (created_by);

create table exam_questions (
  exam_id     uuid   not null references exams(id) on delete cascade,
  question_id uuid   not null references questions(id) on delete restrict,
  position    int    not null,
  points      numeric(6,2) not null default 1 check (points > 0),
  primary key (exam_id, question_id),
  unique (exam_id, position) deferrable initially deferred
);
create index on exam_questions (question_id);

create table exam_attempts (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid   not null references exams(id) on delete restrict,
  user_id         uuid   not null references users(id) on delete cascade,
  status          text   not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  started_at      timestamptz not null default now(),
  deadline_at     timestamptz not null,
  submitted_at    timestamptz,
  question_order  jsonb  not null,   -- [{ "question_id": 1, "option_ids": [4,2,1,3] }, ...] thứ tự đã phát cho bài này
  total_points    numeric(8,2) not null,             -- snapshot tổng điểm thô của đề lúc bắt đầu
  earned_points   numeric(8,2),
  score           numeric(6,2),                      -- quy đổi về exams.max_score
  correct_count   int,
  check (status = 'in_progress' or submitted_at is not null)
);
create index on exam_attempts (user_id, started_at desc);
create index on exam_attempts (exam_id);
create unique index one_open_attempt on exam_attempts (user_id, exam_id) where status = 'in_progress';

create table user_answers (
  attempt_id          uuid   not null references exam_attempts(id) on delete cascade,
  question_id         uuid   not null references questions(id) on delete restrict,
  selected_option_ids uuid[]   not null default '{}', -- server kiểm tra thuộc question_id
  is_correct          boolean,                        -- điền khi chấm
  points_awarded      numeric(6,2),
  answered_at         timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create index on user_answers (question_id);

-- ---------- Cá nhân hoá ----------
create table bookmarks (
  user_id     uuid   not null references users(id) on delete cascade,
  question_id uuid   not null references questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index on bookmarks (question_id);

create table learning_progress (            -- mỗi dòng = 1 người × 1 câu (từ luyện tập và thi)
  user_id          uuid   not null references users(id) on delete cascade,
  question_id      uuid   not null references questions(id) on delete cascade,
  correct_count    int    not null default 0,
  wrong_count      int    not null default 0,
  last_correct     boolean not null,
  last_answered_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index on learning_progress (question_id);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id) on delete set null,
  action      text not null,          -- vd: 'material.publish', 'user.role_change'
  entity_type text not null,
  entity_id   text not null,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index on audit_logs (actor_id);
create index on audit_logs (entity_type, entity_id);

-- RLS: bật cho mọi bảng trên, không tạo policy (chặn Data API qua anon key)
-- alter table <t> enable row level security;   -- lặp cho từng bảng trong migration
```

## 4. Ràng buộc nghiệp vụ không biểu diễn bằng `check`

| Quy tắc | Nơi thực thi |
|---|---|
| `single_choice` có đúng 1 đáp án đúng; `multiple_choice` ≥ 1; mỗi câu ≥ 2 lựa chọn | Service ghi câu hỏi + option trong **một transaction**; thêm constraint trigger `deferrable initially deferred` trên `question_options` làm lưới an toàn. |
| `selected_option_ids` thuộc đúng `question_id` và câu thuộc attempt | Service khi lưu đáp án. |
| Chỉ câu `published` mới được thêm vào đề `published`; đề `published` phải có ≥ 1 câu | Service khi xuất bản đề. |
| Câu hỏi đã xuất hiện trong `user_answers` **không được sửa nội dung/đáp án** | Service từ chối; admin dùng "nhân bản để sửa" → câu mới, câu cũ `archived`. Giữ nguyên phần xem lại của các bài đã làm mà không cần bảng snapshot. |
| Không lưu đáp án sau `deadline_at + 30s` | Service, dùng `now()` của DB. |
| `max_attempts` | Service đếm attempt trong transaction có `select ... for update` trên exam. |
| **Quy trình duyệt nội dung** (môn, chương, chủ đề, tài liệu, câu hỏi, đề): editor chỉ tạo/sửa/xoá khi `status = 'draft'` và chỉ được chuyển `draft → in_review`; chỉ admin chuyển `in_review → published` (duyệt), `in_review → draft` (trả lại, kèm ghi chú), `published ⇄ hidden`. | Service + middleware vai trò. Vai trò luôn đọc từ `users.role_id` theo JWT, không nhận từ client. Mỗi lần chuyển trạng thái ghi `audit_logs` (ghi chú trả lại nằm trong `details`). |
| Guest chỉ thấy nội dung `published` (và môn chứa nó cũng `published`); tài liệu chưa xuất bản không bao giờ được cấp signed URL cho người không phải editor/admin. | Service. |

## 5. Dữ liệu dẫn xuất (không lưu trùng)

- **Số câu của đề** = `count(exam_questions)`; **tổng điểm** = `sum(points)` (snapshot vào `exam_attempts.total_points` lúc bắt đầu).
- **Tiến độ theo môn/chương** = `count(learning_progress where last_correct) / count(questions published)` theo nhóm – view `subject_progress`.
- **Hoạt động gần đây** = union `exam_attempts` (của người dùng) + `materials` mới xuất bản – truy vấn, không cần bảng activity.
- **Thống kê admin** = các truy vấn `count` trên bảng chính; khi dữ liệu lớn mới tính materialized view.

## 6. Seed & migrate dữ liệu hiện có

0. **Backup trước khi migration:** sao chép `src/data/questions.json` vào `backend/db/seed/legacy/questions.<YYYY-MM-DD>.json` kèm checksum SHA-256 (commit vào repo), và `pg_dump` database trước mỗi lần chạy migration lên production.
1. `roles`: user, editor, admin. `material_categories`: textbook (Giáo trình), lecture (Bài giảng), slide (Slide), syllabus (Đề cương), review (Tài liệu ôn tập), reference (Tài liệu tham khảo).
2. `subjects` (status `published`, mã chính thức đã chốt):

   | code | name |
   |---|---|
   | `LSD` | Lịch sử Đảng Cộng sản Việt Nam |
   | `NNPL` | Nhà nước và Pháp luật đại cương |
   | `TRIET` | Triết học |
   | `KTCT` | Kinh tế chính trị |
   | `CNSAI` | Nhập môn Công nghệ số và Ứng dụng Trí tuệ nhân tạo |

3. Script `db/seed/import-legacy-questions.js` đọc bản backup ở bước 0 (200 câu):
   - tạo 5 chương của môn `CNSAI` từ `chapter`/`chapterName`;
   - **`id` trong file chỉ chạy 1–40 và lặp lại ở mỗi chương** (200 câu, 40 id khác nhau). Mỗi câu nhận **UUID mới**; câu được phân biệt bằng `chapter_id` + `legacy_number` (= `id` cũ), không bằng id cũ đơn lẻ;
   - mỗi câu → `questions` (`source = 'import'`, `status = 'published'`), `options[i]` → `question_options(position = i, is_correct = (i = answer))`. Có 1 câu 5 lựa chọn, còn lại 4 → tổng 801 lựa chọn;
   - idempotent nhờ `unique (chapter_id, legacy_number)` + `on conflict do nothing`; in số lượng trước/sau để đối chiếu (phải đúng 200 câu / 801 lựa chọn).
4. **Dữ liệu `localStorage` của người dùng không được chuyển lên server.** Bookmark/tiến độ cũ chỉ lưu `id` (không có chương) nên không xác định được câu nào; tiến độ cục bộ không đáng tin cậy. Dữ liệu này **giữ nguyên trong trình duyệt, không bị xoá**; người dùng bắt đầu bookmark/tiến độ mới trên server.

## 7. Bổ sung so với danh sách bảng đề xuất

| Bảng | Lý do |
|---|---|
| `material_favorites` | Yêu cầu "tài liệu yêu thích"; tách khỏi `bookmarks` (câu hỏi) để giữ FK thật thay vì FK đa hình. |
| `audit_logs` | Theo dõi thao tác admin (xuất bản, đổi quyền, xoá). |
| *(chưa tạo)* `permissions`, `role_permissions` | Ba vai trò cố định đủ cho phạm vi hiện tại; quyền chi tiết ánh xạ trong code. Thêm khi cần vai trò tuỳ biến (vd: giảng viên chỉ quản lý môn mình phụ trách → kèm bảng `subject_editors`). |
