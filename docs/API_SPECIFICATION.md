# API SPECIFICATION – VNU AI Quiz

> Base URL: `${VITE_API_URL}/api/v1` · JSON UTF-8 · Xác thực: `Authorization: Bearer <Supabase access token>`

## 1. Quy ước chung

| Hạng mục | Quy ước |
|---|---|
| Quyền | `guest` (không đăng nhập: xem môn/đề và **xem, tải tài liệu đã xuất bản**) · `user` (học tập, làm bài, yêu thích, tiến độ) · `editor` (tạo/sửa nội dung `draft`, gửi duyệt; không tự xuất bản) · `admin` (toàn quyền: duyệt, xuất bản, ẩn, quản lý người dùng). Vai trò cao hơn có mọi quyền của vai trò thấp hơn. **Vai trò luôn lấy từ DB theo JWT; mọi trường `role` client gửi lên đều bị bỏ qua.** |
| Phân trang | `?page=1&limit=20` (limit ≤ 100). Trả `{ data: [...], meta: { page, limit, total } }` |
| Lỗi | `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} } }` – mã: `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `ACCOUNT_BLOCKED` 403, `INVALID_TRANSITION` 409, `EXAM_NOT_READY` 409, `NOT_VIEWABLE` 409, `NOT_FOUND` 404, `VALIDATION_ERROR` 422, `CONFLICT` 409, `ATTEMPT_CLOSED` 409, `RATE_LIMITED` 429, `INTERNAL` 500 |
| Nội dung chưa xuất bản | Với guest/user trả `404` (không tiết lộ sự tồn tại). |
| ID | UUID. Môn học truy cập bằng `id` hoặc `code` (định danh nghiệp vụ: `LSD`, `NNPL`, `TRIET`, `KTCT`, `CNSAI`). |

## 1b. Quy trình duyệt nội dung

Áp dụng cho `subjects`, `chapters`, `topics`, `materials`, `questions`, `exams` (`:type` là tên số nhiều tương ứng).

```
editor: tạo ──▶ draft ──submit──▶ in_review ──approve (admin)──▶ published ◀──hide/unhide (admin)──▶ hidden
                  ▲                    │
                  └──reject (admin, kèm note)
```

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/admin/:type/:id/submit` | editor | `draft → in_review` |
| POST | `/admin/:type/:id/publish` | admin | `draft → published` một bước (admin có toàn quyền; một transaction, một dòng `audit_logs`). Đề thi: kiểm tra như `approve` |
| POST | `/admin/:type/:id/approve` | admin | `in_review → published`. Đề thi: kiểm tra ≥ 1 câu và mọi câu đã `published` |
| POST | `/admin/:type/:id/reject` | admin | `in_review → draft`, body `{ note }` (lưu vào `audit_logs`) |
| POST | `/admin/:type/:id/hide` · `/unhide` | admin | `published ⇄ hidden` (câu hỏi: `archive`) |
| GET | `/admin/review-queue` | admin | Mọi nội dung `in_review`, lọc theo `type`, `subject_id` |

- Editor gọi `PATCH`/`DELETE` lên nội dung không ở `draft` → `409 CONTENT_NOT_EDITABLE`. Admin sửa được mọi trạng thái.
- Tạo mới luôn ở `draft`; trường `status` trong body tạo/sửa bị bỏ qua.

## 2. Auth & tài khoản

Đăng ký/đăng nhập/quên mật khẩu do Supabase Auth xử lý ở frontend, hai phương thức: **email/mật khẩu** và **Google OAuth** (mọi tài khoản Google, chưa giới hạn domain trường). Profile `users` được tạo tự động (trigger trên `auth.users`, vai trò mặc định `user`). Chỉ admin đổi được vai trò.

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/me` | user | Profile + vai trò |
| PATCH | `/me` | user | Sửa `full_name` (≤ 100), `student_code` (chữ/số ≤ 20, trùng → `409 CONFLICT`); chuỗi rỗng = xoá. Trường khác bị bỏ qua; không có trường hợp lệ nào → `422` |

## 3. Môn học, chương, chủ đề

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/subjects` | guest | Danh sách môn `published`, kèm `chapters` đã xuất bản (để lọc) và `material_count` (tài liệu hiển thị công khai). *Số câu hỏi/đề: P3/P5* |
| GET | `/admin/subjects` | editor | Mọi môn (mọi trạng thái) kèm mọi chương + `status` – cho trang quản trị |
| GET | `/subjects/:idOrCode` | guest | Chi tiết + chương + chủ đề |
| GET | `/subjects/:id/materials` | guest | = `/materials?subject_id=` |
| GET | `/subjects/:id/exams` | guest | Đề `published` của môn |
| POST | `/admin/subjects` | editor | Tạo môn (`draft`) `{ code, name, description, cover_image_path, sort_order }` |
| PATCH | `/admin/subjects/:id` | editor | Sửa nội dung (xem §1b); không đổi `status` qua endpoint này |
| DELETE | `/admin/subjects/:id` | admin | Chỉ khi môn chưa có chương/tài liệu/câu hỏi/đề; ngược lại `409` → dùng `/hide` |
| POST | `/admin/subjects/:id/cover-upload-url` | editor | Signed upload URL cho ảnh đại diện (PNG/JPG/WebP ≤ 2 MB) |
| POST | `/admin/subjects/:id/chapters` | editor | `{ title, description, position }` |
| PATCH / DELETE | `/admin/chapters/:id` | editor | DELETE `409` nếu còn nội dung tham chiếu |
| PUT | `/admin/subjects/:id/chapters/order` | editor | `{ chapter_ids: [..] }` sắp xếp lại |
| POST | `/admin/subjects/:id/topics` | editor | `{ name, chapter_id? }` |
| PATCH / DELETE | `/admin/topics/:id` | editor | |

## 4. Tài liệu

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/materials` | guest | Lọc `subject_id, chapter_id, topic_id, category, q` (tìm theo tiêu đề), `sort=newest\|title`; phân trang |
| GET | `/materials/:id` | guest | Metadata |
| GET | `/materials/:id/view` | guest | `{ url, expires_at }` – signed URL 5 phút, chỉ cho PDF (xem inline); loại khác → `409 NOT_VIEWABLE` |
| GET | `/materials/:id/download` | guest | `{ url, expires_at }` – signed URL ép tải xuống với tên gốc |
| GET | `/material-categories` | guest | |
| GET | `/me/favorites/materials` | user | |
| PUT / DELETE | `/me/favorites/materials/:id` | user | Idempotent |
| GET | `/admin/materials` | editor | Mọi tài liệu (lọc `subject_id`, `status`), kèm `publicly_visible` (false nếu môn/chương chưa xuất bản) |
| POST | `/admin/materials/upload-url` | editor | `{ filename, mime_type, size_bytes }` → `{ upload_url, storage_path, content_type, expires_at }`. Trình duyệt `PUT upload_url` với header `Content-Type: content_type`. `422` nếu sai loại/MIME không khớp đuôi/quá 50 MB. 10 req/phút/người |
| POST | `/admin/materials` | editor | `{ storage_path, title, description, subject_id, chapter_id?, topic_id?, category_id, original_filename }` → kiểm tra object tồn tại + magic bytes, tạo bản ghi `draft` |
| PATCH | `/admin/materials/:id` | editor | Sửa metadata (xem §1b) |
| POST | `/admin/materials/:id/replace` | editor | Thay file: nhận `storage_path` mới, xoá object cũ sau khi ghi DB thành công |
| DELETE | `/admin/materials/:id` | editor (chỉ `draft`) / admin | Xoá bản ghi rồi xoá object Storage |

Loại cho phép: `application/pdf`, `.docx`, `.pptx`, `.xlsx`, `.doc`, `.ppt`, `text/plain`, `image/png`, `image/jpeg`.

Hiển thị công khai = tài liệu **và** môn **và** chương (nếu có) đều `published`; ngược lại `GET /materials/:id[/view|/download]` trả `404` cho guest/user (editor/admin xem trước được). Finalize (`POST /admin/materials`) đọc 16 byte đầu + kích thước + content-type thật từ Storage: sai chữ ký file, content-type khác MIME của đuôi, rỗng hoặc > 50 MB → `422` và xoá object. Mọi route công khai: có header `Authorization` thì token phải hợp lệ (sai → `401`, không bị coi là khách).

## 5. Câu hỏi & luyện tập

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/practice/questions` | user | `subject_id` (bắt buộc), `chapter_id?`, `topic_id?`, `bookmarked=true?`, `limit` – câu `published`, **không** kèm đáp án đúng |
| POST | `/practice/answers` | user | `{ question_id, selected_option_ids }` → `{ is_correct, correct_option_ids, explanation }`; cập nhật `learning_progress` |
| GET | `/flashcards` | user | Như practice nhưng kèm đáp án + giải thích (chế độ ôn) |
| GET | `/me/bookmarks` | user | |
| PUT / DELETE | `/me/bookmarks/:questionId` | user | Idempotent |
| GET | `/admin/questions` | editor | Lọc `subject_id, chapter_id, topic_id, status, type, q`; kèm đáp án |
| GET | `/admin/questions/:id` | editor | |
| POST | `/admin/questions` | editor | `{ subject_id, chapter_id?, topic_id?, type, content, explanation, difficulty?, options: [{ content, is_correct }] }` |
| PATCH | `/admin/questions/:id` | editor | `409 QUESTION_LOCKED` nếu đã có bài làm và sửa `content/options` |
| POST | `/admin/questions/:id/clone` | editor | Bản sao `draft` để sửa câu đã khoá |
| POST | `/admin/questions/bulk-review` | admin | `{ ids, action: 'approve'\|'reject'\|'hide' }` – duyệt hàng loạt |
| POST | `/admin/questions/import` | editor | JSON theo định dạng `questions.json` hiện tại (validate như `Admin.jsx`) + `subject_id`; trả số câu tạo/bỏ qua |
| GET | `/admin/questions/export` | editor | JSON theo môn |
| POST | `/admin/questions/generate` | editor | Thay `/api/quiz/generate` (**đang tạm khoá từ P0, trả 503**): multipart `document` (PDF ≤ 4 MB – giới hạn body 4.5 MB của Vercel) + `subject_id`, `count` → tạo câu `draft`, `source = 'ai'`. Rate limit. |

## 6. Đề thi & làm bài

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/exams/:id` | guest | Thông tin đề: tiêu đề, mô tả, môn, số câu, thời gian, điểm tối đa, số lượt đã làm của tôi |
| POST | `/exams/:id/attempts` | user | Bắt đầu. Nếu đã có attempt `in_progress` còn hạn → trả lại attempt đó. `409` nếu hết lượt/đề đóng |
| GET | `/attempts/:id` | user (chủ) | Đang làm: câu hỏi theo `question_order`, đáp án đã lưu, `deadline_at`, `server_now`. Đã nộp: điểm, từng câu đúng/sai; đáp án đúng + giải thích theo `answer_visibility` |
| PUT | `/attempts/:id/answers/:questionId` | user (chủ) | `{ selected_option_ids }`. `409 ATTEMPT_CLOSED` nếu đã nộp/quá hạn |
| POST | `/attempts/:id/submit` | user (chủ) | Chấm điểm, cập nhật `learning_progress`. Idempotent |
| GET | `/me/attempts` | user | Lịch sử: `exam_id?`, phân trang |
| GET | `/admin/exams` | editor | Lọc `subject_id, status` |
| POST | `/admin/exams` | editor | `{ subject_id, title, description, duration_minutes, max_score, shuffle_questions, shuffle_options, answer_visibility, closes_at?, max_attempts? }` |
| PATCH | `/admin/exams/:id` | editor | Không đổi câu hỏi/điểm khi đề đã có bài làm (`409`) – nhân bản đề |
| PUT | `/admin/exams/:id/questions` | editor | Gán thủ công `[{ question_id, points, position }]` |
| POST | `/admin/exams/:id/questions/generate` | editor | Rút ngẫu nhiên từ ngân hàng: `{ rules: [{ chapter_id?, topic_id?, difficulty?, count }], points_each }` → ghi vào `exam_questions` để editor xem lại |
| POST | `/admin/exams/:id/clone` | editor | |
| GET | `/admin/exams/:id/results` | editor | Danh sách attempt + phân bố điểm + tỉ lệ đúng từng câu |

Chấm điểm: `earned = Σ points của câu đúng` (single: chọn đúng option đúng; multiple: tập chọn = tập đáp án đúng, không điểm từng phần), `score = round(earned / total_points × max_score, 2)`.

## 7. Dashboard & thống kê

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/dashboard` | guest/user | `{ totals: { subjects, materials, exams }, recent_materials[5], available_exams[5] }`; nếu đăng nhập thêm `{ attempts_count, progress_by_subject[], recent_activity[10] }` |
| GET | `/admin/stats` | editor | Số người dùng (tổng, mới 7 ngày), nội dung theo trạng thái, attempt theo ngày (30 ngày), top tài liệu được yêu thích |

## 8. Người dùng & quyền (admin)

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/admin/users` | admin | Lọc `q, role, status` |
| PATCH | `/admin/users/:id` | admin | `{ role, status }`; không tự hạ quyền admin cuối cùng (`409`). Ghi `audit_logs` |
| GET | `/admin/roles` | admin | Vai trò + mô tả quyền |
| GET | `/admin/audit-logs` | admin | Lọc `actor_id, entity_type, from, to` |

## 9. Bảo vệ chung

- Rate limit: 60 req/phút/IP cho guest; 10 req/phút/người cho `/admin/questions/generate` và các endpoint upload URL.
- `express.json({ limit: '1mb' })`; multer chỉ còn ở endpoint generate, `limits.fileSize` 4 MB, chỉ `application/pdf`.
- CORS: chỉ domain frontend (production + preview Vercel + localhost dev).
- Mọi endpoint `/admin/*` ghi `audit_logs` cho thao tác thay đổi dữ liệu.
