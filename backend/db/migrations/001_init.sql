-- 001: toàn bộ schema theo docs/DATABASE_DESIGN.md §3.
-- Chạy một lần, trong một transaction: lỗi ở bất kỳ câu nào → không tạo gì cả.
-- Chạy lại trên DB đã có schema sẽ lỗi ở "create table" và rollback toàn bộ (không ghi đè).
-- Yêu cầu schema auth.users (Supabase Auth).
begin;

create schema if not exists extensions;            -- Supabase đặt extension ở schema này
create extension if not exists pg_trgm with schema extensions;

-- ---------- Người dùng & quyền ----------
create table roles (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('user','editor','admin')),
  name text not null
);
-- Dữ liệu tham chiếu bắt buộc cho trigger tạo profile bên dưới, nên nằm trong migration.
insert into roles (code, name) values
  ('user',   'Người dùng'),
  ('editor', 'Biên tập viên'),
  ('admin',  'Quản trị viên');

create table users (                         -- profile, 1-1 với auth.users
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  full_name    text,
  student_code text unique,
  role_id      uuid not null references roles(id),
  status       text not null default 'active' check (status in ('active','blocked')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on users (role_id);

-- ---------- Môn học, chương, chủ đề ----------
create table subjects (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  name             text not null,
  description      text,
  cover_image_path text,
  status           text not null default 'draft' check (status in ('draft','in_review','published','hidden')),
  sort_order       int  not null default 0,
  created_by       uuid references users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on subjects (created_by);

create table chapters (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references subjects(id) on delete restrict,
  position    int  not null,
  title       text not null,
  description text,
  status      text not null default 'published' check (status in ('draft','in_review','published','hidden')),
  unique (id, subject_id),
  unique (subject_id, position) deferrable initially deferred
);

create table topics (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete restrict,
  chapter_id uuid,
  name       text not null,
  unique (id, subject_id),
  foreign key (chapter_id, subject_id) references chapters(id, subject_id) on delete restrict
);
create index on topics (subject_id);
create index on topics (chapter_id);

-- ---------- Tài liệu ----------
create table material_categories (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  sort_order int  not null default 0
);

create table materials (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid   not null references subjects(id) on delete restrict,
  chapter_id        uuid,
  topic_id          uuid,
  category_id       uuid   not null references material_categories(id),
  title             text   not null,
  description       text,
  storage_path      text   not null unique,
  original_filename text   not null,
  mime_type         text   not null,
  size_bytes        bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  status            text   not null default 'draft' check (status in ('draft','in_review','published','hidden')),
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
create index materials_title_trgm on materials using gin (title extensions.gin_trgm_ops);

create table material_favorites (
  user_id     uuid not null references users(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, material_id)
);
create index on material_favorites (material_id);

-- ---------- Ngân hàng câu hỏi ----------
create table questions (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references subjects(id) on delete restrict,
  chapter_id    uuid,
  topic_id      uuid,
  type          text not null default 'single_choice' check (type in ('single_choice','multiple_choice')),
  content       text not null,
  explanation   text,
  difficulty    text check (difficulty in ('easy','medium','hard')),
  status        text not null default 'draft' check (status in ('draft','in_review','published','archived')),
  source        text not null default 'manual' check (source in ('manual','import','ai')),
  legacy_number int,                                 -- id cũ trong questions.json, chỉ duy nhất TRONG một chương
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (chapter_id, legacy_number),
  foreign key (chapter_id, subject_id) references chapters(id, subject_id),
  foreign key (topic_id, subject_id)   references topics(id, subject_id)
);
create index on questions (subject_id, status, chapter_id);
create index on questions (chapter_id);
create index on questions (topic_id);
create index on questions (created_by);

create table question_options (
  id          uuid     primary key default gen_random_uuid(),
  question_id uuid     not null references questions(id) on delete cascade,
  position    smallint not null,
  content     text     not null,
  is_correct  boolean  not null default false,
  unique (question_id, position)
);

-- ---------- Đề thi ----------
create table exams (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid not null references subjects(id) on delete restrict,
  title             text not null,
  description       text,
  duration_minutes  int  not null check (duration_minutes between 1 and 600),
  max_score         numeric(6,2) not null default 10 check (max_score > 0),
  shuffle_questions boolean not null default false,
  shuffle_options   boolean not null default false,
  answer_visibility text not null default 'after_submit'
                    check (answer_visibility in ('never','after_submit','after_close')),
  closes_at         timestamptz,
  max_attempts      int check (max_attempts > 0),
  status            text not null default 'draft' check (status in ('draft','in_review','published','hidden')),
  created_by        uuid references users(id) on delete set null,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (answer_visibility <> 'after_close' or closes_at is not null)
);
create index on exams (subject_id, status);
create index on exams (created_by);

create table exam_questions (
  exam_id     uuid not null references exams(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  position    int  not null,
  points      numeric(6,2) not null default 1 check (points > 0),
  primary key (exam_id, question_id),
  unique (exam_id, position) deferrable initially deferred
);
create index on exam_questions (question_id);

create table exam_attempts (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references exams(id) on delete restrict,
  user_id        uuid not null references users(id) on delete cascade,
  status         text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  started_at     timestamptz not null default now(),
  deadline_at    timestamptz not null,
  submitted_at   timestamptz,
  question_order jsonb not null,
  total_points   numeric(8,2) not null,
  earned_points  numeric(8,2),
  score          numeric(6,2),
  correct_count  int,
  check (status = 'in_progress' or submitted_at is not null)
);
create index on exam_attempts (user_id, started_at desc);
create index on exam_attempts (exam_id);
create unique index one_open_attempt on exam_attempts (user_id, exam_id) where status = 'in_progress';

create table user_answers (
  attempt_id          uuid   not null references exam_attempts(id) on delete cascade,
  question_id         uuid   not null references questions(id) on delete restrict,
  selected_option_ids uuid[] not null default '{}',
  is_correct          boolean,
  points_awarded      numeric(6,2),
  answered_at         timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create index on user_answers (question_id);

-- ---------- Cá nhân hoá ----------
create table bookmarks (
  user_id     uuid not null references users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index on bookmarks (question_id);

create table learning_progress (
  user_id          uuid    not null references users(id) on delete cascade,
  question_id      uuid    not null references questions(id) on delete cascade,
  correct_count    int     not null default 0,
  wrong_count      int     not null default 0,
  last_correct     boolean not null,
  last_answered_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index on learning_progress (question_id);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index on audit_logs (actor_id);
create index on audit_logs (entity_type, entity_id);

-- ---------- updated_at ----------
create function set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger set_updated_at before update on users     for each row execute function set_updated_at();
create trigger set_updated_at before update on subjects  for each row execute function set_updated_at();
create trigger set_updated_at before update on materials for each row execute function set_updated_at();
create trigger set_updated_at before update on questions for each row execute function set_updated_at();
create trigger set_updated_at before update on exams     for each row execute function set_updated_at();

-- ---------- Lưới an toàn: số lựa chọn / đáp án đúng (DATABASE_DESIGN §4) ----------
-- Kiểm tra lúc commit, nên service được ghi câu hỏi rồi mới ghi lựa chọn trong cùng transaction.
create function check_question_options() returns trigger
language plpgsql set search_path = '' as $$
declare
  ids uuid[];
  qid uuid;
  q_type text;
  n_options int;
  n_correct int;
begin
  if tg_table_name = 'questions' then
    ids := array[new.id];
  elsif tg_op = 'INSERT' then
    ids := array[new.question_id];
  elsif tg_op = 'DELETE' then
    ids := array[old.question_id];
  else
    ids := array[new.question_id, old.question_id];
  end if;
  foreach qid in array ids loop
    continue when qid is null;
    select q.type, count(o.id), count(o.id) filter (where o.is_correct)
      into q_type, n_options, n_correct
      from public.questions q left join public.question_options o on o.question_id = q.id
     where q.id = qid
     group by q.type;
    continue when not found;                    -- câu đã bị xoá (cascade)
    if n_options < 2
       or (q_type = 'single_choice' and n_correct <> 1)
       or (q_type = 'multiple_choice' and n_correct < 1) then
      raise exception 'Câu hỏi % (%) có % lựa chọn, % đáp án đúng – không hợp lệ', qid, q_type, n_options, n_correct
        using errcode = 'check_violation';
    end if;
  end loop;
  return null;
end $$;

create constraint trigger question_options_valid
  after insert or update or delete on question_options
  deferrable initially deferred for each row execute function check_question_options();
create constraint trigger question_options_valid
  after insert or update of type on questions
  deferrable initially deferred for each row execute function check_question_options();

-- ---------- Tạo profile khi có auth.users mới ----------
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, full_name, role_id)
  select new.id, new.email, new.raw_user_meta_data ->> 'full_name', r.id
    from public.roles r where r.code = 'user';   -- vai trò luôn là 'user', không lấy từ metadata client gửi
  return new;
end $$;
revoke all on function handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- RLS: bật cho mọi bảng, không có policy (chặn Data API qua anon/authenticated key) ----------
do $$
declare t text;
begin
  foreach t in array array['roles','users','subjects','chapters','topics','material_categories','materials',
                           'material_favorites','questions','question_options','exams','exam_questions',
                           'exam_attempts','user_answers','bookmarks','learning_progress','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

commit;
