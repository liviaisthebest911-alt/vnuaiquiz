# SECURITY AUDIT – P0.1

> Ngày kiểm tra: 2026-11-10 · Phạm vi: dependency frontend (gốc repo) + backend (`backend/`), endpoint AI đã khoá, cấu hình CI.
> Mọi kết quả dưới đây được chạy thực tế; lệnh tái hiện ghi kèm từng mục.

## 1. Tóm tắt

| | Trước | Sau |
|---|---|---|
| Frontend | **3** (2 high, 1 moderate) | **0** |
| Backend | **7** (1 critical, 3 high, 3 moderate) | **0** |

- Không dùng `npm audit fix --force`, không dùng `--omit`, `audit-level` hay ignore để che cảnh báo.
- Không thay đổi phiên bản khai báo của dependency trực tiếp nào. 9/10 lỗ hổng được vá bằng `npm audit fix` trong phạm vi semver hiện có (chỉ đổi `package-lock.json`).
- 1 lỗ hổng (`minimatch` qua `nodemon`) không có bản vá trong phạm vi của nodemon → xử lý bằng `overrides` sau khi kiểm chứng tương thích (§3.3).

## 2. Báo cáo `npm audit` trước khi sửa

Lệnh: `npm audit --json` (gốc) và `cd backend && npm audit --json`.

### 2.1 Frontend

| Package | Bản cài | Mức | Trực tiếp? | Đường dẫn | Advisory | Bản vá |
|---|---|---|---|---|---|---|
| `vite` | 8.2.2 | high (gộp) | **Trực tiếp** (`dependencies`) | `vite` (+ `@vitejs/plugin-react` → vite, `vitest` → vite) | GHSA-587h-7wmj-h5pm (high, launch-editor, Windows), GHSA-r825-w8mm-5pxw, GHSA-698v-4r3x-3vcv (launch-editor), GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg (lộ file ngoài `server.fs`), GHSA-9jrq-w75r-8gcw (low) | ≥ 8.2.4 |
| `source-map-js` | 1.2.1 | high | Gián tiếp | `postcss` → `source-map-js` | GHSA-68fv-2mgg-jv7q (DoS event loop) | 1.2.2 |
| `postcss-selector-parser` | 6.1.4 | moderate | Gián tiếp | `tailwindcss` → `postcss-selector-parser` | GHSA-rj75-hqrm-r3gf (DoS độ phức tạp bậc hai) | 6.1.5 |

Đánh giá phơi nhiễm: cả ba chỉ chạy lúc **dev/build**, không nằm trong bundle gửi tới trình duyệt. Lỗ hổng Vite ảnh hưởng dev server (`npm run dev` với `host: true` mở ra mạng LAN) – rủi ro thật với máy dev, không ảnh hưởng site đã deploy.

### 2.2 Backend

| Package | Bản cài | Mức | Trực tiếp? | Đường dẫn | Advisory | Bản vá |
|---|---|---|---|---|---|---|
| `proxy-addr` | 2.0.7 | **critical** | Gián tiếp | `express` → `proxy-addr` | GHSA-jqcg-44mw-7w3h (giả mạo IP qua IPv4-mapped IPv6) | 2.0.8 |
| `multer` | 2.3.0 | high | **Trực tiếp** | `multer` | GHSA-q7qp-rjg7-q26m (high, DoS fileFilter), GHSA-3pph-fpjx-jg34 (moderate, ghi đĩa mồ côi) | 2.5.0 |
| `body-parser` | 2.3.0 | high | Gián tiếp | `express` → `body-parser` | GHSA-27r3-jxmh-p828 (DoS body nén có byte thừa) | 2.4.0 |
| `brace-expansion` | 5.0.9 | high | Gián tiếp (dev) | `nodemon` → `minimatch` → `brace-expansion` | GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p (high, đệ quy), GHSA-q2hr-2g5m-vwhr (moderate) | 5.0.12 |
| `qs` | 6.16.0 | moderate | Gián tiếp | `express` → `qs`, `body-parser` → `qs` | GHSA-6pq8-jhm2-2vcw (DoS `stringify`) | 6.17.0 |
| `minimatch` | 10.2.6 | moderate | Gián tiếp (dev) | `nodemon` → `minimatch` | GHSA-g3hv-75wg-m249 (DoS globparts) | **11.0.1** (major) |
| `nodemon` | 3.1.14 | moderate | **Trực tiếp** (dev) | – | kế thừa từ `minimatch` | – (bản mới nhất 3.1.14 vẫn yêu cầu `minimatch ^10.2.1`) |

Đánh giá phơi nhiễm: `proxy-addr`, `body-parser`, `qs` chạy trong mọi request của Express (production). `multer` hiện **không được route nào dùng** (endpoint AI đã khoá ở P0) nhưng sẽ dùng lại ở P2. `nodemon`/`minimatch`/`brace-expansion` chỉ là công cụ dev, pattern do chính dự án cấu hình → không bị kẻ tấn công điều khiển, nhưng vẫn được vá.

## 3. Khắc phục

### 3.1 `npm audit fix` (không `--force`) – frontend

`package.json` **không đổi**. Thay đổi trong `package-lock.json`:

| Package | Trước → Sau | Ghi chú tương thích |
|---|---|---|
| `vite` | 8.2.2 → **8.3.7** | Minor trong `^8.1.0`. `@vitejs/plugin-react@6.1.0` và `vitest@5.1.0` dùng chung bản này (deduped). Build, dev, preview, test đều chạy. |
| `rolldown` (+ 15 binding nền tảng) | 1.2.5 → 1.2.18 | Kéo theo Vite. |
| `postcss` | 8.5.26 → 8.5.32 | Patch. |
| `postcss-selector-parser` | 6.1.4 → 6.1.6 | Patch; bỏ phụ thuộc `cssesc`. |
| `source-map-js` | 1.2.1 → 1.2.2 | Patch. |
| `nanoid`, `@oxc-project/types`, `vite/picomatch` | patch/minor | Kéo theo. |

### 3.2 `npm audit fix` (không `--force`) – backend

`package.json` không đổi ở bước này. Thay đổi trong `backend/package-lock.json`:

| Package | Trước → Sau | Ghi chú tương thích |
|---|---|---|
| `proxy-addr` | 2.0.7 → **2.0.8** | Patch, dưới `express@5.2.1`. |
| `multer` | 2.3.0 → **2.5.0** | Minor trong `^2.3.0`. API `multer({ storage: memoryStorage() }).single()` mà controller dùng không đổi; multer 2.5 bỏ `concat-stream` và các phụ thuộc kéo theo (6 package bị gỡ khỏi lockfile). Route hiện đang khoá nên chưa thực thi đường code multer – **cần test lại khi mở endpoint ở P2**. |
| `body-parser` | 2.3.0 → **2.4.0** | Minor, dưới `express`. `express.json()` đã kiểm tra: JSON hỏng → 400, body > 100 kB → 413. |
| `qs` | 6.16.0 → **6.17.1** | Minor. |
| `brace-expansion` | 5.0.9 → 5.0.12 | Patch. |

### 3.3 `overrides` cho `minimatch` (dev dependency)

Vì sao không dùng `npm audit fix --force`: npm đề xuất **hạ** `nodemon` xuống 3.1.11 (đánh dấu "breaking") – vừa là hạ cấp, vừa không giải quyết gốc rễ.

Giải pháp đã áp dụng trong `backend/package.json`:

```json
"overrides": { "nodemon": { "minimatch": "^11.0.1" } }
```

Kiểm chứng tương thích trước khi áp dụng:
- nodemon chỉ dùng `const { minimatch } = require('minimatch')` và gọi `minimatch(file, pattern, opts)` (`node_modules/nodemon/lib/monitor/match.js`) – API này giữ nguyên ở minimatch 11; `engines.node` giống hệt bản 10 (`18 || 20 || >=22`).
- Chạy thật `npx nodemon index.js` với minimatch 11.0.5: khởi động OK; sửa file `.js` → restart; sửa file `.json` → restart; tạo file `.txt` → **không** restart (đúng bộ lọc extension `js,mjs,cjs,json`).

**Gỡ override khi** nodemon phát hành bản phụ thuộc `minimatch >= 11.0.1` (kiểm tra bằng `npm view nodemon dependencies.minimatch`).

## 4. Kiểm tra endpoint AI đã khoá

Kiểm tra trực tiếp bằng `curl` với `GEMINI_API_KEY`/`DATABASE_URL` là giá trị dò (sentinel), và tự động trong `backend/tests/quiz.routes.test.js` (4 test).

| Kiểm tra | Kết quả |
|---|---|
| `POST /api/quiz/generate` | **503** `{"success":false,"message":"Chức năng tạo câu hỏi bằng AI đang tạm khoá."}` |
| Không xử lý file upload | Gửi 30 MB: server trả 503 sau **3.7 ms**, mới nhận ~1.1 MB rồi đóng – không đọc hết body, không có multer/pdf-parse/Gemini trong luồng. Test tự động với 5 MB. |
| Không lộ API key / thông tin nhạy cảm | Sentinel không xuất hiện trong body, header (test tự động) hay log server. Controller (nơi dùng key) không còn được import vào route. |
| `GET /api/quiz/generate`, route không tồn tại | 404 – server hoạt động bình thường. |

### Phát hiện phụ (không thuộc endpoint AI)

| # | Mức | Phát hiện | Đề xuất |
|---|---|---|---|
| B1 | Medium – ✅ **đã sửa ở P0.2** | Khi `NODE_ENV` ≠ `production`, gửi JSON hỏng tới **bất kỳ** route nào → Express trả trang lỗi HTML kèm **stack trace và đường dẫn tuyệt đối trên server**. Với `NODE_ENV=production` chỉ trả "Bad Request" (đã kiểm chứng). | Đảm bảo `NODE_ENV=production` trên môi trường deploy; ở P2 thêm error handler JSON chuẩn (`API_SPECIFICATION.md §1`) để không phụ thuộc biến môi trường. |
| B2 | Low – ✅ **đã sửa ở P0.2** | Header `X-Powered-By: Express` lộ framework. | `app.disable('x-powered-by')` (đã áp dụng). |
| B3 | Low | `Access-Control-Allow-Origin: *` (CORS mở). | Allowlist domain frontend ở P2 (đã có trong `ARCHITECTURE.md §6`). |
| B4 | Info – ✅ **đã sửa ở P0.2** | Trang 404 mặc định dạng HTML "Cannot GET …". | 404 JSON `NOT_FOUND` (đã áp dụng). |
| B5 | Info | `config/db.js` dùng `ssl.rejectUnauthorized: false`. | Đã ghi trong roadmap P1. |

P0.1 không sửa B1–B5. **P0.2 đã sửa B1, B2, B4** bằng middleware lỗi tập trung (`backend/middleware/errors.js`, chi tiết: `QUALITY_ASSURANCE.md §3`); B3 (CORS) và B5 (TLS) vẫn chờ P2/P1.

## 5. Kiểm soát trong CI

`.github/workflows/ci.yml` chạy `npm audit --audit-level=moderate` ở cả hai job → build CI **thất bại** khi xuất hiện lỗ hổng moderate trở lên mới. Đây là chủ ý: lỗ hổng mới phải được xử lý (hoặc ghi nhận có lý do) chứ không bị bỏ qua. Hệ quả: một advisory mới công bố có thể làm CI đỏ dù code không đổi.

## 6. Tái hiện

```bash
npm ci && npm audit                       # frontend → found 0 vulnerabilities
cd backend && npm ci && npm audit         # backend  → found 0 vulnerabilities
npm ls minimatch                          # nodemon → minimatch@11.0.5 (overridden)
npm test                                  # 4 test, gồm khoá endpoint AI
```
