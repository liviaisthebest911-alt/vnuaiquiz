# HANDOFF – Kho tài liệu (P4 mốc 1) → staging

> Cập nhật 2026-11-12. **P4 mốc 1 đã xác minh trên staging `zwwzevtjuamauntkhbko`**: luồng PDF với Supabase Storage thật đạt mọi kiểm tra (mục 2), dữ liệu thử đã dọn sạch và kiểm lại bằng truy vấn chỉ đọc (mục 3). Code **chưa commit, chưa deploy**.

## 1. Cấu hình staging (đã làm)

- **Bucket `materials`** (tạo 2026-11-12 bằng SQL, đã kiểm tra lại): private, `file_size_limit` 52428800 (50 MB), 9 MIME khớp `FILE_TYPES` trong `backend/routes/admin.library.routes.js`, **không** có policy trên `storage.objects` (backend dùng secret key, trình duyệt chỉ dùng signed URL). Bucket `public-assets` chưa cần.
- **DB:** shared pooler, Session mode `aws-1-ap-southeast-2.pooler.supabase.com:5432`, user `postgres.zwwzevtjuamauntkhbko`, TLS kiểm chứng chỉ bằng CA `~/.config/vnuaiquiz/prod-ca-2021.crt`. Dashboard có thể không hiện mục "Session pooler" – host trên đã kiểm bằng kết nối thật.
- **Biến bí mật trên máy** (chỉ ở `~/.config/vnuaiquiz/staging.env`, quyền 600, không trong repo/log): `P1_TEST_EMAIL`, `STAGING_DB_PASSWORD` (gốc, chưa URL-encode), `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`. `DATABASE_URL` được ghép trong tiến trình lúc chạy (mật khẩu `encodeURIComponent`, không `sslmode`).
- **Hai biến URL API khác nhau – đừng nhầm:**
  - `VITE_API_URL=http://localhost:5000` (frontend, `src/lib/api.js` **tự thêm** `/api/v1`). Đặt `.../api/v1` → mọi gọi API 404 "Không tìm thấy đường dẫn".
  - `API_URL=http://localhost:5000/api/v1` (script `backend/scripts/staging-library-smoke.mjs`, **đã gồm** `/api/v1`).
  - Backend: `SUPABASE_URL=https://zwwzevtjuamauntkhbko.supabase.co`, `CORS_ORIGINS=http://localhost:5173`, `PORT=5000`, `DATABASE_CA_CERT` = nội dung file CA.

## 2. Kết quả kiểm tra 2026-11-12 (tất cả đạt)

1. **Đầu vào:** kết nối DB qua pooler đạt (200 câu / 801 lựa chọn); `npm run db:set-role -- <email> admin --allow-remote` → admin; `/me` = 200 `admin`/`active`.
2. **Smoke test `backend/scripts/staging-library-smoke.mjs`: 22 PASS / 0 FAIL** – signed upload URL; CORS preflight PUT từ `localhost:5173` 200 (`ACAO=*`, cho `content-type,x-upsert`); PUT 200; PUT lần 2 cùng URL 400 (`x-upsert:false`); finalize 201 (đọc Range + content-type thật, 193 byte); guest: nháp → 404, `/view` nháp → 404; URL public `/storage/v1/object/public/materials/...` → 400; "Xuất bản ngay" môn/chương/tài liệu 200; xem inline 200 `application/pdf`, không `attachment`; token signed URL sống 300 s; tải xuống `attachment` + `filename*=UTF-8''Gi%C3%A1o%20tr%C3%ACnh...` (tên tiếng Việt đúng); ẩn → guest 404, admin vẫn xem trước 200; `.exe` đổi tên `.pdf` → 422 và object bị xoá; xoá object thử 200.
3. **Upload qua trình duyệt thật** (Chromium/Playwright, trang Tài khoản → Quản trị tài liệu, Vite 5173 + backend local): upload-url 200 → PUT Storage 200 (`ACAO=*`) → finalize 201 `draft` → thông báo "Đã tải lên – tài liệu đang ở trạng thái nháp." và dòng mới trong danh sách; không lỗi console/mạng. (Khác preflight của script ở mục 2: đây là CORS thật của trình duyệt.)
4. **Hết hạn URL xem** (object còn, tài liệu nháp, admin xem trước): ngay sau khi cấp 200; ~10 s trước `exp` 200; 5 s sau `exp` 400 `InvalidJWT "exp" claim timestamp check failed`; URL mới 200.

## 3. Dọn dữ liệu thử – XONG

- Object Storage thử (`79834f9f-…`, `996a1f06-…` (`.exe` giả), `581b0d57-…`) xoá bằng Storage API.
- Dòng DB + tài khoản thử: người dùng xoá trên Dashboard (lệnh xoá qua MCP `execute_sql` bị chặn ở bước duyệt quyền – lượt sau muốn agent tự dọn thì cho phép công cụ này, hoặc tự chạy trên SQL Editor). `ADMIN_PASSWORD` đã bỏ khỏi `staging.env`.
- **Kiểm lại (chỉ đọc):** 0 dòng cho mọi UUID thử – môn `2c78d64d-7136-40a9-81ee-1e9621186673` (`ZZTEST_P4`), chương `80f84fdd-2e45-440a-9373-0337533f084e`, tài liệu `907b820e-d6b9-4ad5-b5a7-f3d849c2532d` và `a9455bdc-105c-4515-b140-454534c8bff6`, audit theo 4 UUID này, audit `set_role` `030e9738-fa4e-4af6-9543-00cd9fe2f2c9`, tài khoản `a0253802-dcc4-4694-b591-1887a3dc2625` trong `auth.users` và `public.users`.
- **Trạng thái staging sau khi dọn:** `auth.users` 0, `public.users` 0, `audit_logs` 0, `materials` 0, `storage.objects` 0, `subjects` 5, `chapters` 5, câu hỏi 200 / lựa chọn 801; bucket `materials` giữ nguyên cấu hình mục 1.
- Lần kiểm thử sau: tạo tài khoản thử bằng Dashboard → "Auto Confirm User", thêm lại `ADMIN_PASSWORD` vào `staging.env`, chạy smoke script; dọn theo ID script in ra (thứ tự: audit nội dung → materials → chapters → subjects → tài khoản → audit `set_role`).

## 4. Còn treo

- Bước tiếp: commit P4 mốc 1, rồi deploy backend (Vercel project riêng) và Google OAuth. Staging hiện **không có tài khoản admin vận hành** – cần tạo khi bắt đầu nhập tài liệu thật.
- Luồng gửi thư xác nhận (Confirm email) **chưa kiểm chứng** – 429 `over_email_send_rate_limit`; cần SMTP riêng cho staging (lượt này tạo tài khoản bằng Dashboard "Auto Confirm User").
- Transaction pooler cổng 6543 chưa kiểm tra.
- Phần còn lại P4: sửa/thay/xoá tài liệu (xoá kèm object), yêu thích, ảnh đại diện môn, dọn object upload dở, chuyển `react-router-dom`.
