# QUALITY ASSURANCE – VNU AI Quiz

> Cập nhật: 2026-11-10 (P0.2). Mô tả bộ kiểm thử, cách chạy, và các lỗi đã sửa kèm bằng chứng kiểm chứng.

## 1. Bộ kiểm thử

| Tầng | Công cụ | Vị trí | Số test | Lệnh |
|---|---|---|---|---|
| Frontend unit / component | Vitest 5.1 + jsdom + Testing Library | `src/*.test.jsx` | **18** | `npm test` |
| Backend unit (middleware lỗi) | `node:test` | `backend/tests/errors.test.js` | **8** | `cd backend && npm test` |
| Backend integration (server thật) | `node:test` + `fetch` | `backend/tests/quiz.routes.test.js` | **7** | (cùng lệnh trên) |
| E2E trình duyệt | Playwright 1.65 (Chromium) | `e2e/tests/*.spec.ts` | **28** | `npm run test:e2e` |
| Kiểu dữ liệu | TypeScript | `tsconfig.json`, `e2e/tsconfig.json` | – | `npx tsc -p . && npx tsc -p e2e` |
| Bảo mật dependency | npm audit | cả hai project | – | `npm audit` |

Chạy một test: `npx vitest run src -t "<tên>"` · `npx playwright test exam.spec -g "<tên>"` · `node --test --test-name-pattern="<tên>" backend/tests/`.

### 1.1 E2E (Playwright)

- `playwright.config.ts`: project `chromium` (Desktop Chrome, 1440×900); `webServer` tự chạy `npm run build && npm run preview` cổng 4173 → kiểm thử **bản build production** ở local, không dùng dữ liệu hay server production.
- Mỗi test có browser context riêng → `localStorage` trống; dữ liệu "cũ" được gieo trong test. Không đụng dữ liệu người dùng thật.
- Fixture `e2e/fixtures.ts` (tự áp dụng mọi test): test **thất bại** nếu có lỗi JS, `console.error`, hoặc response HTTP ≥ 400.
- Khi thất bại: screenshot (`only-on-failure`), trace + video (`retain-on-failure`) trong `test-results/`; CI tải lên artifact `playwright-report`. Mở trace: `npx playwright show-trace test-results/<test>/trace.zip`.
- Cài browser lần đầu: `npx playwright install chromium` (CI: `--with-deps`).

| File | Nội dung |
|---|---|
| `dashboard.spec.ts` | Dashboard, không còn THPTQG, số liệu 200 câu / 5 chương; favicon khai báo và tải được |
| `navigation.spec.ts` | Điều hướng mọi trang; tải lại ở từng trang không lỗi |
| `study.spec.ts` | Ôn tập + giải thích + tiến độ; bookmark lưu theo khoá và còn sau reload; bookmark id 1 chương 1 không ảnh hưởng id 1 chương 2 (dữ liệu thật) |
| `flashcard.spec.ts` | Lật / tiếp / trước / xáo; 4 nút nằm trong màn hình ở 360 / 390 / 768 / 1440 px |
| `exam.spec.ts` | Thi 30 phút đến nộp bài + lịch sử; minimap; **regression id trùng** (8 đề ngẫu nhiên liên tiếp) |
| `responsive.spec.ts` | 360 / 390 / 768 / 1440 px: đúng loại menu, mọi trang + trang làm bài không tràn ngang |
| `legacy-data.spec.ts` | 6 key localStorage cũ giữ nguyên sau khi dùng app; lịch sử cũ được giữ; bookmark id mơ hồ không bị gán chương |

Kịch bản tạm của P0.1 (`scratchpad/e2e/run.mjs`) đã được chuyển hết thành các spec trên; trường hợp "đo tỉ lệ lỗi id trùng" được đổi thành assertion cứng.

## 2. Lỗi trùng ID câu hỏi (ưu tiên cao) – ĐÃ SỬA

### 2.1 Nguyên nhân

- `src/data/questions.json`: 200 câu, 5 chương × 40; `id` đánh lại **1–40 ở mỗi chương** → chỉ 40 giá trị `id`. JSON không có trường định danh nào khác (`id, chapter, chapterName, question, options, answer, explanation`); cặp `(chapter, id)` là duy nhất (đã kiểm: 200 cặp khác nhau).
- `Exam.jsx` lưu `answers[q.id]`, chấm `answers[q.id] === q.answer`, tô minimap theo `answers[item.id]`, xem lại theo `result.answers[q.id]`, `key={q.id}`. Đề 40 câu rút ngẫu nhiên từ 200 câu gần như luôn chứa câu cùng `id` khác chương → hai câu dùng chung một ô đáp án.
- `Practice.jsx` + `App.jsx`: bookmark và tiến độ lưu mảng `id` → đánh dấu câu 1 chương 1 = đánh dấu câu 1 của cả 5 chương; tiến độ đếm sai.
- `App.jsx` lọc bookmark/tiến độ theo tập `id` khi thay ngân hàng câu hỏi.
- Lịch sử thi (`vnu-ai-quiz:history`) chỉ lưu tổng kết (`id` bài thi UUID, số câu, số đúng, điểm) – **không chứa id câu hỏi**, nên định dạng lịch sử không bị ảnh hưởng; các bài cũ có thể đã bị chấm sai trước đây và được giữ nguyên như lịch sử.

### 2.2 Cách khắc phục

- `src/utils/questionKey.js`: `questionKey(q) = "<môn>:c<chapter>:q<id>"`, môn lấy từ `q.subject` nếu có, mặc định `CNSAI` (môn của ngân hàng hiện tại). Khoá **tính từ dữ liệu**, ổn định qua các lần tải, không ngẫu nhiên; không sửa nội dung 200 câu.
- Mọi nơi nhận diện câu hỏi dùng chung `questionKey`: lưu đáp án, đếm câu đã làm, chấm điểm, minimap, xem lại (`Exam.jsx`); bookmark, tiến độ, danh sách câu (`Practice.jsx`); lọc khi thay ngân hàng (`App.jsx`).
- `Admin.jsx`: import ngân hàng mới bị từ chối nếu trùng `id` **trong cùng chương** (để khoá luôn duy nhất); hướng dẫn sửa thành "không trùng trong cùng một chương".
- Lưu trữ (`src/utils/storage.js`): bookmark/tiến độ ghi vào key mới `vnu-ai-quiz:bookmarks.v2` / `vnu-ai-quiz:progress.v2`. Key cũ `vnu-ai-quiz:bookmarks` / `vnu-ai-quiz:progress` **chỉ đọc, không bao giờ ghi đè hay xoá**.
- Chuyển đổi dữ liệu cũ (chạy một lần, khi chưa có key v2): `id` cũ khớp **đúng một** câu trong ngân hàng hiện tại → chuyển sang khoá mới; `id` khớp nhiều câu (mọi id của ngân hàng mặc định, vì mỗi id có ở 5 chương) → **không đoán chương**, dữ liệu vẫn nằm ở key cũ (theo quyết định "không tự động chuyển bookmark trùng ID khi không xác định được chương").

**Hệ quả người dùng cần biết:** với ngân hàng mặc định, bookmark/tiến độ được tạo trước bản sửa sẽ **không hiển thị** sau khi cập nhật (dữ liệu vẫn còn trong trình duyệt, không bị xoá). Đây là đánh đổi có chủ đích: các bookmark đó vốn đã không xác định được câu nào.

### 2.3 Regression tests và kết quả

| Ca | Test (Vitest – ngân hàng 2 câu cùng id khác chương) | Sau sửa | Trên code cũ |
|---|---|---|---|
| A | Hai câu cùng id, đáp án khác nhau → trả lời đúng cả hai được 2/2 | ✅ | ❌ |
| B | Trả lời câu chương A không làm câu chương B có đáp án (không đáp án nào được chọn, ô minimap không xanh) | ✅ | ❌ |
| C | Bộ đếm "1/2" và đúng một ô xanh | ✅ | ❌ |
| D | Trả lời 1 câu (đúng) trong 2 câu cùng id, cùng đáp án → 1/2, 50%, 5 điểm (code cũ: 2/2) | ✅ | ❌ |
| E | Xem lại: câu đã làm hiện đúng đáp án đã chọn, câu chưa làm hiện "Chưa trả lời" | ✅ | ❌ |
| F | Bookmark câu id 1 chương 1 không đánh dấu câu id 1 chương 2 | ✅ | ❌ |
| – | Tiến độ chỉ ghi nhận đúng câu; dữ liệu cũ không bị ghi đè; id mơ hồ không được gán; id duy nhất được chuyển; lịch sử cũ được giữ và bài mới thêm vào đầu; 200 khoá duy nhất trên dữ liệu thật | ✅ | 2 ❌ (phần phụ thuộc Exam/Practice) |

"Trên code cũ": đã chạy lại bộ test với `Exam.jsx`/`Practice.jsx` của commit `b7eb889` → 7 test thất bại, chứng minh test phát hiện đúng lỗi; sau đó khôi phục bản sửa. Tương tự với E2E: `exam.spec` (regression id) và 3 test `study.spec` thất bại trên code cũ.

## 3. Xử lý lỗi backend – ĐÃ SỬA

- `backend/middleware/errors.js`: `notFound` + `errorHandler` tập trung; `backend/app.js` tách khỏi `index.js` (index chỉ `listen`).
- Mọi lỗi trả `{ "error": { "code", "message", "details"? } }`:

| Tình huống | Status | code |
|---|---|---|
| JSON hỏng | 400 | `INVALID_JSON` |
| Body quá lớn | 413 | `PAYLOAD_TOO_LARGE` |
| Charset/encoding không hỗ trợ | 415 | `UNSUPPORTED_ENCODING` |
| Lỗi validation (`validationError(message, details)`) | 422 | `VALIDATION_ERROR` |
| Route không tồn tại | 404 | `NOT_FOUND` |
| Endpoint AI bị khoá | 503 | `FEATURE_DISABLED` |
| Mọi lỗi khác (kể cả async) | 500 | `INTERNAL` – thông báo chung |

- Lỗi 5xx: stack + message gốc ghi vào log server (`console.error`); 4xx ghi `console.warn` một dòng. Không ghi body/header request.
- Thông tin debug trong response **chỉ** khi đồng thời `DEBUG_ERRORS=true`, `NODE_ENV=development` và không có biến `VERCEL` (Vercel đặt biến này ở preview và production). `NODE_ENV` thiếu → coi như production. Không còn phụ thuộc vào việc deploy đặt đúng `NODE_ENV`.
- Bỏ header `X-Powered-By`.
- Test kiểm chứng: response không chứa stack trace, đường dẫn file (`/home/`, `node_modules`) hay giá trị secret dò (sentinel) ở 3 môi trường: `NODE_ENV` không đặt, `production + DEBUG_ERRORS=true`, `VERCEL=1 + development + DEBUG_ERRORS=true`. Khi gỡ `errorHandler` khỏi `app.js`, 3 test integration thất bại (đã thử), xác nhận test phụ thuộc đúng middleware.

## 4. Giao diện – ĐÃ SỬA

| Lỗi | Sửa | Kiểm chứng |
|---|---|---|
| 404 `/favicon.ico` | `index.html` thêm `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` (file đã có sẵn) | `dashboard.spec`: link đúng, tải 200 `image/svg+xml`; fixture không còn lỗi HTTP 404 ở mọi test |
| Flashcard tràn 25 px ở 360 px | Dưới 640 px, nút "Xáo bài" và "Lật thẻ" chỉ hiện icon; nhãn giữ dạng `sr-only` nên vẫn là tên truy cập (screen reader, test `getByRole`). ≥ 640 px giữ nguyên như cũ. Chỉ sửa `Flashcard.jsx`. | `flashcard.spec` 360/390/768/1440: 4 nút nằm trong màn hình, không tràn ngang; trên code cũ test 360 px thất bại. Ảnh chụp 360 px đã kiểm tra bằng mắt. |

## 5. CI

`.github/workflows/ci.yml` – job `frontend`: `npm ci` → `npm audit --audit-level=moderate` → `tsc` (app) → `tsc` (e2e) → unit → build → `playwright install --with-deps chromium` → E2E → (khi lỗi) upload `playwright-report` + `test-results`. Job `backend`: `npm ci` → audit → test (unit + integration).

| Mức kiểm chứng | Trạng thái |
|---|---|
| Cú pháp workflow (`actionlint`) | ✅ |
| CI test thành công **ở local** (mọi bước của cả 2 job, container `node:22` sạch, `CI=true`) | ✅ |
| CI đã chạy thành công **trên GitHub** | ❌ **Chưa** – chưa push |
