# PROJECT AUDIT – VNU AI Quiz

> Cập nhật: 2026-11-10 · Phạm vi: toàn bộ repo tại commit `b7eb889` · Định hướng mới: nền tảng học tập đại học (không còn thi thử THPTQG).

## 1. Hiện trạng tổng quan

| Thành phần | Trạng thái |
|---|---|
| Frontend | React 19 + Vite 8 + Tailwind 3 + framer-motion, SPA thuần client, deploy Vercel. Không gọi API, mọi dữ liệu nằm trong `localStorage`. |
| Backend (`backend/`) | Express 5, 1 endpoint `POST /api/quiz/generate` (PDF → Gemini → câu hỏi). Chưa được frontend sử dụng, chưa deploy. |
| Database | Có `pg` Pool kết nối Supabase Postgres trong `backend/config/db.js`, nhưng **chưa có bảng, migration hay truy vấn nào**. |
| Lưu trữ file | Chưa có. |
| Xác thực / phân quyền | Chưa có. Trang Admin mở cho mọi người, chỉ ghi vào `localStorage` của trình duyệt đó. |
| Kiểm thử | Không có test runner, linter, CI. |

## 2. Lỗi chặn cần xử lý ngay

1. ✅ *(đã sửa ở P0)* **`package.json` gốc hỏng script.** Commit `b7eb889` thay `dev/build/preview` (Vite) bằng `node index.js`/`nodemon index.js` của backend; không có `index.js` ở gốc. Hệ quả: `npm run dev`, `./start.sh` lỗi, và **lần build Vercel tiếp theo sẽ thất bại** (Vercel chạy `npm run build`). Phải khôi phục trước mọi thay đổi khác.
2. ✅ *(đã khoá tạm ở P0 – trả 503)* **Endpoint AI không có xác thực.** `POST /api/quiz/generate` cho phép bất kỳ ai gọi Gemini bằng key của dự án (tốn chi phí), multer không giới hạn kích thước file (đọc toàn bộ vào RAM), không kiểm tra MIME, `cors()` mở mọi origin.
3. **Model `gemini-1.5-flash` đã ngừng hỗ trợ** – endpoint sẽ lỗi khi gọi thật. Cần đổi model nếu giữ tính năng.

4. ✅ *(đã sửa ở P0.2 – khoá `môn:chương:id`, xem `QUALITY_ASSURANCE.md §2`)* **`id` câu hỏi không duy nhất.** `questions.json` đánh `id` 1–40 lại từ đầu ở mỗi chương (chỉ 40 id cho 200 câu). Bookmark và tiến độ lưu theo `id` → đánh dấu câu 1 chương 1 cũng đánh dấu câu 1 của mọi chương. Không sửa ở bản tĩnh (sẽ thay bằng UUID ở P3). Khi seed, câu được phân biệt theo chương; bookmark/tiến độ cũ không được chuyển lên server.

## 3. Kiểm kê phân hệ THPTQG (cần loại bỏ)

Phân hệ chỉ tồn tại ở frontend. **Không có API, bảng database hay biến môi trường nào liên quan** → không cần migration dữ liệu.

| File | Xử lý | Lý do |
|---|---|---|
| `src/features/exam/examData.ts` | Xoá | Dựng đề 3 phần THPTQG; nhãn "Java Collections" sai so với ngân hàng câu hỏi thực. |
| `src/features/exam/scoring.ts` | Xoá | Quy tắc chấm điểm Phần II đặc thù THPT. |
| `src/features/exam/types.ts` | Xoá | Mô hình `part 1/2/3`, `TRUE_FALSE`, `SHORT_ANSWER` của đề THPT. Kiểu dữ liệu mới định nghĩa theo API (xem `API_SPECIFICATION.md`). |
| `src/features/exam/components/ExamLobby.tsx`, `ExamRoom.tsx`, `ExamReport.tsx`, `QuestionAnswerInput.tsx` | Xoá | Gắn cứng cấu trúc 3 phần. Ý tưởng UI (minimap, report theo chương) được tái hiện trong module đề thi mới. |
| `src/features/exam/examStorage.ts` | Xoá | Phiên thi/lịch sử lưu `localStorage` – thay bằng `exam_attempts` phía server. |
| `src/data/sample-exam.json` | Xoá | Dữ liệu mẫu đề THPT. |
| `src/features/exam/useExamTimer.ts`, `components/StickyTimer.tsx`, `QuestionMinimap.tsx`, `CircularScore.tsx` | **Giữ tại chỗ** (`QuestionMinimap` nay tự khai báo kiểu tối thiểu thay vì import `types.ts`) | Dùng chung cho thi trắc nghiệm đại học (P5). |
| `src/App.jsx` – case `'thptqg'`, state `thptqgStage`, `thptqgSubmission`, `buildThptqgExam` | Xoá | Điều hướng. |
| `src/components/Dashboard.jsx:118-122` – nút "Thi thử THPTQG" | Xoá | Điều hướng. |
| `localStorage` keys `vnuaiquiz_exam_session_*`, `vnuaiquiz_exam_history`, `vnuaiquiz_error_vault` | **Giữ nguyên, không xoá** | Dữ liệu người dùng; app chỉ ngừng đọc/ghi. |

`Layout.jsx` không có mục THPTQG trong menu – không cần sửa.

## 4. Tài sản cần giữ và tái sử dụng

| Tài sản | Ghi chú |
|---|---|
| `src/data/questions.json` – **200 câu**, môn "Nhập môn Công nghệ số và Ứng dụng AI", 5 chương × 40 câu, 1 đáp án đúng/câu, có giải thích | Là dữ liệu thật duy nhất. Được seed vào DB: mỗi câu UUID mới, phân biệt theo chương (`chapter_id` + số cũ). Không xoá file cho tới khi bản DB chạy ổn định trên production. |
| `Practice.jsx` (lọc theo chương, bookmark), `Flashcard.jsx`, `Exam.jsx` (trộn câu, đếm giờ, chấm điểm, xem lại) | Giữ UI, đổi nguồn dữ liệu từ props/`localStorage` sang API. `Exam.jsx` là nền cho module đề thi đại học. |
| `Admin.jsx` + `DataGuideModal.jsx` (nhập JSON có validate) | Logic validate tái dùng cho chức năng import câu hỏi hàng loạt của CMS. |
| `Layout`, `ThemeToggle`, `useTheme`, `Reveal`, `Pagetransition`, `AppBackground` | Giữ nguyên. |
| `react-router-dom` (đã cài, chưa dùng) + rewrite SPA trong `vercel.json` | Dùng để có URL chia sẻ được cho môn học/tài liệu/đề thi. |
| Backend Express + Supabase | Giữ làm nền tảng API. Supabase cung cấp luôn Auth và Storage → không thêm nhà cung cấp mới. |
| `localStorage` bookmarks/tiến độ (`vnu-ai-quiz:*`) của người dùng hiện tại | Giữ nguyên trong trình duyệt; **không** chuyển lên server vì id cũ không xác định được chương (`DATABASE_DESIGN.md §6`). |

"Tài liệu hiện có": repo **chưa chứa file tài liệu nào** (PDF/DOCX…). Không có gì cần migrate ngoài ngân hàng câu hỏi.

## 5. Khoảng cách so với yêu cầu mới

| Yêu cầu | Hiện có | Thiếu |
|---|---|---|
| Quản lý môn học động | 1 môn ngầm định trong JSON | Toàn bộ (DB, API, UI) |
| Quản lý tài liệu | Không | Toàn bộ, gồm storage và xem PDF |
| Ngân hàng câu hỏi | JSON tĩnh + thay thế qua Admin cục bộ | DB, CRUD, phân loại môn/chương/chủ đề |
| Đề thi đại học | `Exam.jsx` chọn ngẫu nhiên câu từ ngân hàng | Đề cấu hình được, lưu bài, chấm phía server, lịch sử |
| Admin CMS | Trang Admin cục bộ, không bảo vệ | Xác thực, phân quyền, CRUD thật, thống kê |
| Dashboard | Thống kê từ `localStorage` | Số liệu từ server, bỏ THPTQG |
| Kiểm thử | Không | Test runner cho backend và frontend |

## 6. Rủi ro

- **Bookmark/tiến độ cũ không theo người dùng lên server:** do lỗi id ở §2, dữ liệu này không chuyển được chính xác. Dữ liệu không bị xoá, nhưng người dùng sẽ bắt đầu lại trên server (nên hiện thông báo ngắn ở P3)., không xoá key `vnu-ai-quiz:*` cho tới khi import xong.
- **Giới hạn body 4.5 MB của Vercel Functions:** không upload file qua backend; dùng signed upload URL trực tiếp lên Supabase Storage.
- **Gian lận thời gian làm bài:** đồng hồ phía client không đáng tin → hạn nộp phải tính ở server.
- **Sửa câu hỏi sau khi đã có bài làm** làm sai lệch phần xem lại → câu hỏi đã dùng trong bài làm bị khoá chỉnh sửa đáp án (xem `DATABASE_DESIGN.md`).

## 7. Kết quả P0 (2026-11-10)

| Hạng mục | Kết quả |
|---|---|
| Script build | Khôi phục `dev/build/preview` (Vite), thêm `test`. `npm run build` đạt; bundle JS 541 kB → 516 kB sau khi bỏ THPTQG. |
| THPTQG | Đã xoá 9 file + case `thptqg` trong `App.jsx` + nút trên Dashboard. Không còn chuỗi "THPT" trong `src/` và bundle production. |
| Endpoint AI | `POST /api/quiz/generate` trả 503 trước khi đọc file. |
| Kiểm thử | Frontend 6 test (Vitest/jsdom), backend 2 test (`node --test`), `tsc` sạch. CI: `.github/workflows/ci.yml`. |
| Còn tồn tại | Cảnh báo chunk > 500 kB (có từ trước); lỗi id trùng ở §2 mục 4 (sửa ở P3); `npm audit` báo lỗ hổng trong dependency (chưa xử lý); model Gemini cũ (P2). |
