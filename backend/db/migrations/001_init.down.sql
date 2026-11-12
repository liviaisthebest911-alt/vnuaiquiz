-- Rollback 001. Chỉ dùng khi DB chỉ có đúng nội dung seed chưa bị sửa (tạo lại được từ backup).
-- Từ chối nếu có dữ liệu người dùng hoặc nội dung do người sửa/thêm – khi đó khôi phục bằng pg_dump.
begin;

do $$
begin
  if exists (select 1 from public.users) or exists (select 1 from public.exam_attempts)
     or exists (select 1 from public.bookmarks) or exists (select 1 from public.learning_progress)
     or exists (select 1 from public.audit_logs) or exists (select 1 from public.materials)
     or exists (select 1 from public.exams) or exists (select 1 from public.topics)
     or exists (select 1 from public.questions where source <> 'import' or updated_at <> created_at)
     or exists (select 1 from public.subjects where updated_at <> created_at) then
    raise exception 'Từ chối rollback 001: database đã có dữ liệu người dùng hoặc nội dung đã sửa';
  end if;
end $$;

drop trigger on_auth_user_created on auth.users;
drop table audit_logs, learning_progress, bookmarks, user_answers, exam_attempts, exam_questions, exams,
           question_options, questions, material_favorites, materials, material_categories,
           topics, chapters, subjects, users, roles;
drop function handle_new_user(), check_question_options(), set_updated_at();
-- giữ schema extensions/pg_trgm: có thể đã có từ trước, dùng chung

commit;
