# ARCHITECTURE – VNU AI Quiz

> Nền tảng học tập cho sinh viên đại học: môn học → chương/chủ đề → tài liệu, ngân hàng câu hỏi, đề thi cuối kỳ (tuỳ môn), theo dõi tiến độ.

## 1. Nguyên tắc

- **Giữ stack hiện tại, không thêm nhà cung cấp mới.** React/Vite trên Vercel + Express + Supabase (Postgres, Auth, Storage – cùng một project Supabase đã cấu hình `DATABASE_URL`).
- **Mọi truy cập dữ liệu đi qua backend.** Frontend chỉ dùng Supabase cho đăng nhập (Auth) và tải file trực tiếp lên Storage bằng signed URL do backend cấp. Không dùng Supabase Data API từ trình duyệt.
- **Server là nguồn sự thật** cho đáp án đúng, điểm số, thời hạn làm bài, quyền hạn.
- **Nội dung là dữ liệu, không phải code:** thêm môn/chương/tài liệu/đề không cần deploy.

## 2. Sơ đồ tổng thể

```
 Trình duyệt (React SPA, Vercel)
   │  ① Đăng nhập: supabase-js Auth → nhận access token (JWT)
   │  ② Gọi API:  Authorization: Bearer <JWT>
   ▼
 Backend Express (/api/v1)  ──③ pg Pool (Supavisor, transaction mode) ──▶ Supabase Postgres
   │   auth middleware: xác minh JWT → tải profile + role                   (RLS bật, không policy
   │   requireRole('editor'|'admin')                                         cho anon/authenticated)
   │
   └──④ Storage API (service role key, chỉ ở server) ──▶ Supabase Storage
           • tạo signed upload URL / signed download URL           bucket `materials` (private)
           • kiểm tra file sau khi upload                          bucket `public-assets` (ảnh môn học)

 Trình duyệt ──⑤ PUT file trực tiếp bằng signed upload URL ──▶ Supabase Storage
```

## 3. Frontend

| Hạng mục | Quyết định |
|---|---|
| Routing | Chuyển từ `page` state sang `react-router-dom` (đã cài) để có URL chia sẻ được. `vercel.json` đã rewrite mọi route về `index.html`. |
| Gọi API | Một module `src/lib/api.js` dùng `fetch`, tự gắn JWT, base URL từ `VITE_API_URL`. Không thêm thư viện data-fetching ở giai đoạn đầu. |
| Auth | `@supabase/supabase-js` chỉ dùng phần `auth`: **email/mật khẩu + Google OAuth** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` – công khai theo thiết kế; migration 002 thu hồi quyền anon/authenticated + RLS chặn truy cập bảng). Frontend ẩn/hiện menu theo vai trò chỉ để tiện dùng – không phải lớp bảo vệ. |
| Xem PDF | Signed URL ngắn hạn mở trong `<iframe>`/tab mới (trình xem PDF của trình duyệt). DOCX/PPTX: chỉ tải xuống. |
| Cấu trúc | `src/features/<module>/` cho mỗi module mới: `subjects`, `materials`, `questions` (practice + flashcard), `exams`, `admin`, `dashboard`. Component chung giữ trong `src/components/`. |

Route dự kiến:

```
/                         Dashboard
/subjects                 Danh sách môn
/subjects/:code           Chi tiết môn: chương, chủ đề, tài liệu, đề thi
/materials                Tìm kiếm / lọc tài liệu toàn hệ thống
/materials/:id            Xem/tải tài liệu
/practice?subject=&chapter=   Luyện tập (Practice.jsx)
/flashcards?subject=      Flashcard
/exams/:id                Giới thiệu đề → bắt đầu
/attempts/:id             Làm bài / xem kết quả
/me                       Lịch sử, yêu thích, tiến độ
/admin/...                CMS (chỉ editor/admin)
/login
```

## 4. Backend

```
backend/
  index.js                 app, cors (allowlist), json limit, error handler
  config/db.js             pg Pool (giữ, thêm max/idle timeout)
  config/supabase.js       supabase-js server client (service role) – Auth verify + Storage
  middleware/auth.js       requireAuth, optionalAuth, requireRole
  middleware/validate.js   validate body/query
  routes/<module>.routes.js
  services/<module>.service.js   SQL + logic nghiệp vụ
  db/migrations/*.sql      migration SQL đánh số
  db/seed/                 seed môn học, danh mục tài liệu, import questions.json
  tests/                   Vitest + supertest
```

- **Xác thực:** middleware xác minh JWT cục bộ bằng JWKS của project (`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, khoá ký bất đối xứng – không gọi Auth server mỗi request), sau đó đọc `users` (profile) + `roles`. Người dùng có `status = 'blocked'` bị từ chối (403). Hệ quả: token của tài khoản bị khoá/đổi vai trò có hiệu lực ngay (đọc DB mỗi request); token đã đăng xuất vẫn dùng được tới khi hết hạn (mặc định 1 giờ).
- **Phân quyền** (khách + 3 vai trò cố định, kiểm soát hoàn toàn ở backend – vai trò đọc từ DB theo JWT, không bao giờ từ request):

  | Vai trò | Được phép |
  |---|---|
  | guest | Xem môn học, thông tin đề; xem và tải tài liệu **đã xuất bản** |
  | user | + luyện tập, làm bài, yêu thích, bookmark, theo dõi tiến độ |
  | editor | + tạo, sửa, upload nội dung ở trạng thái `draft`, gửi duyệt. **Không tự xuất bản** |
  | admin | Toàn quyền: duyệt/trả lại, xuất bản, ẩn, quản lý người dùng và vai trò |

  Quy trình trạng thái `draft → in_review → published ⇄ hidden` (chi tiết: `API_SPECIFICATION.md §1b`). Khi cần quyền tuỳ biến mới thêm bảng `permissions` (xem `DATABASE_DESIGN.md`).
- **Kiểm tra quyền sở hữu:** mọi endpoint theo `:attemptId`, bookmark, favorite lọc theo `user_id` của token – không tin `user_id` từ client.
- **Lỗi:** định dạng thống nhất `{ error: { code, message } }`; không trả stack trace.
- **Kết nối DB:** dùng connection string Supavisor (transaction mode, cổng 6543) khi chạy serverless; tắt prepared statement ở chế độ này.
- **Endpoint AI hiện có** (`/api/quiz/generate`) chuyển thành `POST /api/v1/admin/questions/generate` – chỉ editor/admin, kết quả là **câu hỏi nháp** để duyệt, không tự xuất bản.

### Triển khai backend

**Đã chốt:** frontend ở project Vercel hiện tại; backend là **một project Vercel riêng** (Root Directory = `backend/`), frontend gọi qua `VITE_API_URL`. Database: Supabase Postgres; file: Supabase Storage.

Tương thích Express đã kiểm tra theo tài liệu Vercel (https://vercel.com/docs/frameworks/backend/express, https://vercel.com/docs/functions/limitations, đọc ngày 2026-11-10):
- Express được hỗ trợ "zero configuration": tự nhận file `index.js`/`app.js`/`server.js` (gốc hoặc `src/`), chấp nhận `export default app` **hoặc** `app.listen(...)` → `backend/index.js` hiện tại dùng được, không cần `vercel.json`.
- Mỗi app chạy như một Vercel Function: body request/response tối đa **4.5 MB** → upload tài liệu đi thẳng Storage (§5.1); endpoint AI giới hạn PDF ≤ 4 MB.
- Thời gian tối đa 300 s (Hobby) / 800 s (Pro) mỗi request – đủ cho mọi API, kể cả gọi Gemini.
- `express.static()` không hoạt động (backend không phục vụ file tĩnh – không ảnh hưởng).
- Không có tiến trình nền thường trực → không dùng `setInterval`/cron trong Express; tác vụ định kỳ (vd: chốt bài quá hạn) xử lý lười khi đọc attempt, hoặc dùng Vercel Cron nếu cần.

Kết luận: **không cần Railway/Render.** Chỉ chuyển nếu sau này cần WebSocket ổn định hoặc job chạy lâu hơn giới hạn trên.

## 5. Luồng chính

### 5.1 Upload tài liệu

1. Editor gửi `POST /admin/materials/upload-url` với tên file, MIME, kích thước → server kiểm tra allowlist + giới hạn, sinh khoá ngẫu nhiên `materials/<uuid>.<ext>`, trả signed upload URL (hết hạn sau vài phút).
2. Trình duyệt PUT file trực tiếp lên Storage.
3. Editor gửi `POST /admin/materials` với metadata + `storage_path` → server xác nhận object tồn tại, đọc vài byte đầu để kiểm tra magic bytes khớp loại khai báo, ghi bản ghi `materials` ở trạng thái `draft`. Sai → xoá object, trả lỗi.
4. Editor gửi duyệt (`in_review`); admin duyệt → `published`. User thường không có endpoint upload.
5. Tải về/xem (guest được phép với tài liệu `published`; bản nháp chỉ editor/admin): `GET /materials/:id/download` → kiểm tra quyền + trạng thái xuất bản → signed URL ngắn hạn (`download=<tên gốc>` để ép `Content-Disposition: attachment` với file không phải PDF).

### 5.2 Làm bài thi

1. `POST /exams/:id/attempts` → server tạo `exam_attempts` với `deadline_at = now() + duration`, sinh thứ tự câu/đáp án (nếu đề bật trộn) và lưu vào attempt. Trả câu hỏi **không kèm đáp án đúng**.
2. `PUT /attempts/:id/answers/:questionId` lưu từng câu (tự động lưu; tải lại trang không mất bài).
3. `POST /attempts/:id/submit` → chấm điểm ở server. Quá `deadline_at` + 30 giây ân hạn: các câu lưu sau hạn bị bỏ qua, bài tự động chốt.
4. `GET /attempts/:id` → kết quả; đáp án đúng + giải thích chỉ trả khi cấu hình `answer_visibility` của đề cho phép.

### 5.3 Luyện tập (practice/flashcard)

Đọc câu hỏi đã xuất bản theo môn/chương; chấm từng câu qua `POST /practice/answers` (server trả đúng/sai + giải thích, cập nhật `learning_progress`). Không tạo `exam_attempts`.

## 6. Bảo mật

- Upload: allowlist (PDF, DOCX, PPTX, DOC, PPT, XLSX, TXT, PNG, JPG), tối đa 50 MB/file, khoá lưu trữ ngẫu nhiên (không dùng tên file người dùng làm path), kiểm tra magic bytes, bucket private, signed URL ngắn hạn. Quét malware: ngoài phạm vi giai đoạn này.
- Service role key, `DATABASE_URL`, `GEMINI_API_KEY` chỉ ở backend. Biến `VITE_*` coi như công khai.
- CORS allowlist domain frontend; rate limit cho endpoint ghi và AI.
- RLS bật trên mọi bảng public, không tạo policy; migration 002 thu hồi mọi grant của `anon`/`authenticated` (kể cả TRUNCATE – RLS không chặn) → publishable key không chạm được bảng. Migration nào tạo hàm trong `public` phải tự `revoke all on function ... from public, anon, authenticated`.
- Nhật ký thao tác admin vào `audit_logs`.
- TLS tới Supabase: bỏ `rejectUnauthorized: false`, dùng CA của Supabase.
