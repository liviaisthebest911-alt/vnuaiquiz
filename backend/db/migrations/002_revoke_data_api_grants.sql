-- 002: thu hồi quyền của anon/authenticated trên schema public; giới hạn độ dài full_name khi tạo profile.
-- Mọi truy cập dữ liệu đi qua backend (kết nối Postgres trực tiếp, role postgres) – không dùng Data API
-- (ARCHITECTURE.md §1). Supabase mặc định GRANT ALL cho anon/authenticated trên bảng mới; RLS không policy
-- chặn được SELECT/INSERT/UPDATE/DELETE nhưng KHÔNG chặn TRUNCATE, REFERENCES, TRIGGER → thu hồi tận gốc.
-- Đăng nhập (GoTrue → trigger handle_new_user, security definer) không cần các quyền này.
-- Một transaction; chạy lại được (revoke là idempotent). Không có file down: khôi phục grant = mở lại lỗ hổng.
begin;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
-- Hàm trigger không cần EXECUTE lúc trigger chạy (chỉ kiểm tra khi CREATE TRIGGER).
revoke all on all functions in schema public from public, anon, authenticated;

-- Bảng/sequence/hàm tạo sau này bởi postgres (người chạy migration) không tự cấp cho anon/authenticated.
-- Riêng EXECUTE cho PUBLIC trên hàm mới là mặc định toàn cục của Postgres, không gỡ được theo schema →
-- migration nào tạo hàm phải tự "revoke all on function ... from public, anon, authenticated" (db.test.js kiểm tra).
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;

-- full_name lấy từ metadata đăng ký (client gửi tuỳ ý) → cắt còn 100 ký tự như giới hạn của PATCH /me.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, full_name, role_id)
  select new.id, new.email, nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 100), ''), r.id
    from public.roles r where r.code = 'user';   -- vai trò luôn là 'user', không lấy từ metadata client gửi
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

commit;
