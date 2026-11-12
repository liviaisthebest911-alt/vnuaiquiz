# IMPLEMENTATION ROADMAP – VNU AI Quiz

> Thứ tự dựa trên phụ thuộc: **ổn định → nền dữ liệu → xác thực → nội dung → làm bài → tổng hợp**. Mỗi phase merge được độc lập và không làm hỏng production: frontend vẫn chạy bằng dữ liệu tĩnh cho tới khi API tương ứng sẵn sàng, chuyển theo từng màn hình.

```
P0 Ổn định ─▶ P1 DB + seed ─▶ P2 Auth/quyền ─┬▶ P3 Môn học + câu hỏi ─▶ P5 Đề thi ─┐
                                             └▶ P4 Tài liệu ───────────────────────┴▶ P6 CMS + Dashboard
```

P3 và P4 độc lập, làm song song được nếu có 2 người. **Sau P2 ưu tiên P4 (kho tài liệu + quản trị nội dung)**: admin thêm môn, tải lên và xuất bản tài liệu không cần sửa code; phần CRUD môn/chương của P3 cần cho việc này được kéo sang P4.

## P0 – Ổn định & loại bỏ THPTQG ✅ *(hoàn thành 2026-11-10, chưa commit)*

- Khôi phục script `dev/build/preview` trong `package.json` gốc. **Kiểm tra:** `npm run build` thành công, preview deploy Vercel xanh.
- Xoá phân hệ THPTQG theo bảng ở `PROJECT_AUDIT.md §3`; **giữ tại chỗ** `useExamTimer`, `StickyTimer`, `QuestionMinimap`, `CircularScore` trong `src/features/exam/` (sẽ dùng ở P5); xoá nút trên Dashboard và case `thptqg` trong `App.jsx`. **Không xoá** key `localStorage` nào (dữ liệu người dùng).
- Khoá endpoint `/api/quiz/generate`: trả 503 trước khi đọc file, controller giữ lại cho P2.
- Frontend: Vitest + jsdom + Testing Library (`npm test`). Backend: `node --test` (không thêm thư viện). CI GitHub Actions: `tsc`, test, build cho frontend; test cho backend.
- **Xong khi:** app chạy như cũ trừ THPTQG; `grep -ri thptqg src` rỗng.

## P1 – Database & seed ✅ *(code + test xong 2026-11-11; đã xác minh trên staging `zwwzevtjuamauntkhbko`, chưa commit)*

- **Staging (2026-11-11):** migration 001 áp thành công, 17 bảng, 200 câu / 801 lựa chọn, Auth thật tạo profile, TLS có kiểm tra chứng chỉ qua **Session pooler cổng 5432** – đều đạt. **Transaction pooler cổng 6543 chưa kiểm tra.** Schema `p1_seed` trên staging được giữ lại (không xoá).

- Công cụ migration: SQL thuần trong `backend/db/migrations/` – không thêm ORM. *Thực tế:* áp bằng `psql -v ON_ERROR_STOP=1 -f` (Supabase CLI đòi thư mục `supabase/migrations/` và tên file có timestamp, chưa dùng); chưa có bảng ghi lại migration đã chạy.
- **Backup trước:** snapshot `questions.json` + SHA-256 vào `backend/db/seed/legacy/`; `pg_dump` trước mỗi lần chạy migration trên production.
- Migration 001: toàn bộ DDL (khoá chính UUID) trong `DATABASE_DESIGN.md`, bật RLS, trigger `updated_at`, trigger tạo profile khi có `auth.users` mới.
- Seed: roles (`user`, `editor`, `admin`), material_categories, 5 môn `LSD`, `NNPL`, `TRIET`, `KTCT`, `CNSAI`; import 200 câu từ bản backup – mỗi câu UUID mới, phân biệt theo chương.
- Sửa `config/db.js`: dùng connection string pooler, bật kiểm tra TLS.
- **Kiểm tra:** test đếm 200 câu / 801 lựa chọn / mỗi câu đúng 1 đáp án đúng / 5 chương × 40 câu; chạy seed hai lần không nhân đôi; test ràng buộc topic–chapter khác môn bị từ chối.

## P2 – Xác thực & phân quyền ✅ *(code + test local xong; đã xác minh trên staging 2026-11-11, chưa commit, chưa deploy)*

**Kết quả trên staging `zwwzevtjuamauntkhbko` (2026-11-11):**
- **Migration 002:** `pg_dump` trước khi áp (`public`, `p1_seed`, `supabase_migrations`; đã kiểm tra đọc lại 200 câu / 801 lựa chọn), áp một lần qua MCP `apply_migration` – lịch sử: `001_init`, `002_revoke_data_api_grants`. Sau khi áp: `anon`/`authenticated` còn 0 quyền trên bảng (kể cả TRUNCATE) và 0 quyền EXECUTE trên hàm `public`; Data API bằng publishable key → `permission denied`. Dữ liệu giữ nguyên (200 / 801, 17 bảng RLS bật), `p1_seed` giữ nguyên.
- **Auth email/mật khẩu** (backend + frontend local trỏ vào staging, một tài khoản thử – đã xoá sau khi kiểm tra): đăng ký, đăng nhập trên giao diện, `GET/PATCH /me`, đăng xuất – đạt.
- **Phân quyền – 26/26 đạt:** `user_metadata.role = admin` (lúc đăng ký và tự sửa + refresh token) không nâng quyền; `role`/`status`/`email` trong body `PATCH /me` bị bỏ qua; user gọi `/admin/*` → 403; token rác/bị sửa/tự ký khoá khác/publishable key → 401; tài khoản `blocked` → 403 `ACCOUNT_BLOCKED` kể cả khi đăng nhập lại; tài khoản đã xoá → token cũ còn hạn bị 401, không đăng nhập lại được.
- ⚠️ **Chưa kiểm chứng: luồng gửi thư xác nhận (Confirm email bật → thư → bấm link → đăng nhập).** Mọi lần đăng ký khi Confirm email bật đều bị Supabase trả **429 `over_email_send_rate_limit`** (SMTP mặc định giới hạn vài thư/giờ). Phần kiểm tra trên chạy khi Confirm email **tạm tắt**, sau đó đã bật lại. Cần cấu hình SMTP riêng cho staging rồi kiểm lại luồng này trước khi mở đăng ký thật.
- Phát hiện khi kiểm tra: tài khoản `blocked` vẫn đăng nhập được Supabase Auth (chặn ở backend, đúng thiết kế); lỗi nhỏ form Tài khoản không hiện mã SV đã chuẩn hoá sau khi lưu – đã sửa.
- Còn lại cho lượt riêng: Google OAuth, tạo admin vận hành, deploy backend; Transaction pooler 6543 vẫn chưa kiểm tra.

**Đã làm:**
- `middleware/auth.js`: xác minh access token bằng JWKS của project (ES256/RS256, `jose`, kiểm tra `iss`/`aud`/`exp`; không nhận HS256/`none`/phiên ẩn danh) → JWT chỉ cho **danh tính**; vai trò + trạng thái đọc từ `public.users` + `roles`. Profile không tồn tại → 401; `blocked` → 403 `ACCOUNT_BLOCKED`. `requireRole` theo cấp `user < editor < admin`.
- `GET/PATCH /api/v1/me` (chỉ `full_name`, `student_code`; mọi trường khác bị bỏ qua).
- Quy trình duyệt §1b: `POST /api/v1/admin/:type/:id/{submit|approve|reject|hide|unhide}` cho `subjects, chapters, materials, questions, exams` (ghi `audit_logs`; đề thi cần ≥ 1 câu, mọi câu đã xuất bản). `topics` không có cột status nên không nằm trong quy trình.
- CORS allowlist (`CORS_ORIGINS`), `express.json` 1 MB, rate limit 60 req/phút/IP cho `/api/v1` (bộ nhớ trong từng instance).
- Migration `002_revoke_data_api_grants.sql`: thu hồi mọi quyền của `anon`/`authenticated` trên bảng/sequence/hàm của `public` (+ default privileges). P2 không dùng Data API nên không cần grant nào; RLS vẫn bật. Test trên DB riêng có giả lập grant mặc định của Supabase.
- Script `npm run db:set-role -- <email> admin` tạo admin đầu tiên (tài khoản phải đăng nhập trước một lần).
- Frontend: `@supabase/supabase-js` (chỉ Auth), trang **Tài khoản** (email/mật khẩu, Google OAuth, sửa hồ sơ qua `/me`, đăng xuất), `src/lib/api.js`. Thiếu biến `VITE_SUPABASE_*` → ẩn chức năng đăng nhập, app chạy như cũ.

**Hoãn (có lý do):**
- Chuyển sang `react-router-dom` → làm ở P4 cùng các route `/materials/:id`, `/admin/...` (đăng nhập không cần URL riêng: OAuth quay về `origin`).
- `optionalAuth` → thêm ở P4 khi endpoint tài liệu đầu tiên cần (guest vs editor thấy bản nháp).
- Quên mật khẩu (luồng `PASSWORD_RECOVERY` → đặt mật khẩu mới) → làm cùng router.
- Deploy backend lên Vercel project thứ hai → lượt riêng.

**Kế hoạch ban đầu:**

- Backend: `middleware/auth.js` (`requireAuth`, `optionalAuth`, `requireRole`), error handler chuẩn, CORS allowlist, rate limit, `GET/PATCH /me`.
- Frontend: Supabase Auth (email/mật khẩu + Google OAuth, không giới hạn domain), trang `/login`, chuyển sang `react-router-dom`, `src/lib/api.js`.
- Tạo tài khoản admin đầu tiên bằng script seed (không có endpoint tự nâng quyền).
- Deploy backend lên Vercel project thứ hai; cấu hình env ở cả hai project.
- **Kiểm tra:** test 401 khi thiếu/sai token, 403 user gọi `/admin/*`, editor gọi approve/publish bị 403, gửi `role` trong body không có tác dụng, người bị `blocked` bị chặn.

## P3 – Môn học, câu hỏi, luyện tập

- API mục §3 và §5 của `API_SPECIFICATION.md`.
- Frontend: `/subjects`, `/subjects/:code`; `Practice.jsx` và `Flashcard.jsx` lấy dữ liệu từ API, chọn môn trước rồi chương; bookmark/tiến độ lưu server, bắt đầu mới (không chuyển dữ liệu `localStorage` cũ – id không xác định được chương; dữ liệu cũ giữ nguyên trong trình duyệt).
- Quy trình duyệt (`API_SPECIFICATION.md §1b`) dùng chung cho mọi loại nội dung.
- Admin/editor: CRUD môn/chương/chủ đề, CRUD câu hỏi, import JSON (tái dùng `validateQuestions` của `Admin.jsx`), endpoint generate AI có xác thực (đổi model Gemini còn hỗ trợ).
- **Kiểm tra:** practice không lộ đáp án trước khi trả lời; khoá sửa câu đã có bài làm; import lại cùng file không tạo câu trùng.

## P4 – Tài liệu 🟡 *(mốc 1 xong trong workspace 2026-11-11 – đã xác minh trên staging 2026-11-12; chưa commit, chưa deploy)*

**Mốc 1 – admin tạo môn/chương, tải PDF lên, xuất bản; sinh viên tìm, lọc, xem, tải (đã làm):**
- Backend: `services/storage.js` (Storage REST bằng `fetch` + `SUPABASE_SECRET_KEY`, không thêm dependency); `routes/library.routes.js` (`GET /subjects`, `/material-categories`, `/materials` – tìm theo tiêu đề, lọc môn/chương/loại, phân trang; `/materials/:id`, `/view`, `/download` – signed URL 5 phút); `routes/admin.library.routes.js` (`GET/POST /admin/subjects`, `POST /admin/subjects/:id/chapters`, `POST /admin/materials/upload-url`, `POST/GET /admin/materials`); `optionalAuth`; chuyển trạng thái `publish` (admin: draft → published một bước). Xuất bản dùng lại quy trình duyệt P2; mọi thao tác ghi `audit_logs` trong cùng transaction.
- Frontend: trang **Tài liệu** (sinh viên/khách) và **Quản trị tài liệu** (mở từ trang Tài khoản khi là editor/admin); nav thu gọn thành icon ở 768–1023px.
- Không cần migration mới (bảng `materials` + index trigram có từ 001).
- **Kiểm tra local:** backend 62 test (P4: 9 – luồng admin→sinh viên, nháp/chờ duyệt/ẩn/môn ẩn/chương ẩn đều 404 qua URL trực tiếp, `.exe` đổi tên `.pdf`, sai content-type, file rỗng, > 50 MB, path giả, chương khác môn, editor không tự xuất bản, rate limit upload); frontend 29 unit + 28 E2E; chạy thử trên trình duyệt (Postgres + backend thật + Supabase giả + Vite + Playwright) 17/17.
- **Staging `zwwzevtjuamauntkhbko` (2026-11-12):** review "Xuất bản ngay" đạt. Bucket `materials` đã tạo (private, 50 MB, 9 MIME đúng `FILE_TYPES`, không policy `storage.objects`). Luồng PDF với Supabase Storage thật **đạt mọi kiểm tra**: `backend/scripts/staging-library-smoke.mjs` 22/22 (CORS preflight, PUT, chặn ghi đè, finalize Range + content-type, nháp/ẩn → 404, URL public bucket bị chặn, xem inline, tải xuống tên tiếng Việt, `.exe` đổi tên → 422 + xoá object); upload qua trình duyệt thật (Chromium) tạo được bản nháp, không lỗi CORS/console; signed URL xem mở được trước `exp`, 400 `InvalidJWT` sau `exp`, URL mới mở lại được. Object thử đã xoá. Dữ liệu thử (object, môn `ZZTEST_P4`, chương, 2 tài liệu, 9 dòng audit, tài khoản thử) đã dọn và kiểm lại theo UUID; seed còn 200 câu / 801 lựa chọn. **→ P4 mốc 1 đã xác minh trên staging.** Chi tiết: `docs/HANDOFF.md`.
- **Còn lại của P4:** sửa/thay/xoá tài liệu (xoá kèm object), yêu thích, ảnh đại diện môn (`public-assets`), sửa/xoá môn & chương, dọn object upload dở, chuyển `react-router-dom` (URL chia sẻ `/materials/:id`).

**Kế hoạch ban đầu:**
- Tạo bucket `materials` (private) và `public-assets`; luồng signed upload → finalize kiểm tra magic bytes (`ARCHITECTURE.md §5.1`).
- API §4; frontend `/materials` (tìm, lọc theo môn/chương/loại), trang xem PDF, tải xuống, yêu thích; admin upload/sửa/thay/xoá, ảnh đại diện môn.
- **Kiểm tra:** từ chối file `.exe` đổi tên thành `.pdf`; file > 50 MB; signed URL hết hạn; tài liệu chưa xuất bản trả 404 cho guest/user; user không có quyền upload; editor không tự xuất bản được; xoá tài liệu xoá cả object.

## P5 – Đề thi đại học

- API §6: tạo đề (thủ công + rút ngẫu nhiên theo chương/độ khó), xuất bản, làm bài với hạn nộp phía server, lưu từng câu, chấm điểm, xem lại theo `answer_visibility`, lịch sử.
- Frontend: viết lại `Exam.jsx` thành `/exams/:id` + `/attempts/:id`, dùng lại timer/minimap/score ring; tự động lưu, khôi phục khi tải lại trang; đồng bộ đồng hồ theo `server_now`.
- **Kiểm tra (quan trọng nhất):** chấm điểm single/multiple; nộp sau hạn bị chốt; không xem được attempt của người khác (IDOR); trộn câu ổn định trong cùng attempt; `max_attempts`; nộp hai lần idempotent.

## P6 – Admin CMS hoàn chỉnh & Dashboard

- Quản lý người dùng/vai trò, audit log, `/admin/stats`, thống kê kết quả từng đề.
- Dashboard mới theo `GET /dashboard`: tổng môn/tài liệu/đề, số bài đã làm, tiến độ theo môn, tài liệu mới, đề có thể luyện, hoạt động gần đây.
- Gỡ `src/data/questions.json` khỏi bundle sau khi production chạy ổn định bằng DB ≥ 2 tuần (giữ bản sao trong `backend/db/seed/`).
- **Kiểm tra:** admin không tự hạ quyền admin cuối cùng; số liệu dashboard khớp truy vấn đếm trực tiếp.

## Quyết định đã chốt (2026-11-10)

1. Mã môn: `LSD`, `NNPL`, `TRIET`, `KTCT`, `CNSAI` – định danh nghiệp vụ; khoá chính là UUID.
2. Guest xem/tải tài liệu đã xuất bản; mọi nội dung chưa xuất bản được bảo vệ.
3. Đăng nhập: Supabase Auth, email/mật khẩu + Google OAuth (không yêu cầu Google Workspace của trường).
4. Deploy: frontend Vercel hiện tại; backend Vercel project riêng (đã xác nhận tương thích Express – `ARCHITECTURE.md §4`); Supabase Postgres + Storage.
5. Tài liệu: user không upload; editor upload/sửa nhưng không tự xuất bản; admin duyệt, xuất bản, ẩn.
6. Dữ liệu cũ: giữ 200 câu, mỗi câu UUID riêng, phân biệt theo chương; backup trước migration; không chuyển bookmark/tiến độ `localStorage` không xác định được chương.

## Ngoài phạm vi giai đoạn này

Quét malware file upload, xem trước DOCX/PPTX trong trình duyệt, câu hỏi tự luận/điền khuyết, phân quyền theo từng môn (giảng viên), ứng dụng di động, thông báo email.
