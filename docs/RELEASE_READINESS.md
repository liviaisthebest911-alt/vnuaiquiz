# RELEASE READINESS – P0 + P0.1 + P0.2

> Cập nhật: 2026-11-10 · Thay đổi **chưa commit, chưa push, chưa deploy**. Chi tiết kiểm thử: `QUALITY_ASSURANCE.md`; bảo mật: `SECURITY_AUDIT.md`.

## 1. Kết luận

**Sẵn sàng phát hành lên production, chờ chủ dự án cho phép.** Mọi kiểm tra đều đạt ở local và trong container CI mô phỏng. Lỗi nghiêm trọng duy nhất của P0.1 (chấm điểm sai do trùng id) đã được sửa và có regression test. **CI chưa chạy trên GitHub.**

| Hạng mục | Kết quả |
|---|---|
| Lỗi trùng ID câu hỏi | ✅ Đã sửa – 6 ca regression A–F đạt, thất bại trên code cũ |
| Xử lý lỗi backend | ✅ JSON thống nhất, không lộ stack/đường dẫn/secret ở mọi môi trường |
| Favicon, Flashcard 360 px | ✅ Đã sửa |
| `npm audit` | ✅ 0 lỗ hổng (frontend, backend) |
| TypeScript (app + e2e) | ✅ |
| Build production | ✅ |
| Frontend unit | ✅ **18/18** |
| Backend unit + integration | ✅ **15/15** |
| E2E Playwright (Chromium) | ✅ **28/28**, 0 flaky |
| CI | ✅ local (container `node:22`, `CI=true`) · ❌ **chưa chạy trên GitHub** |

## 2. Kết quả kiểm chứng cuối (sau `npm ci`)

| Bước | Local (Node 24.22) | Container CI (`node:22` v22.23.4, `CI=true`) |
|---|---|---|
| `npm ci` + `npm audit` frontend | 0 vulnerabilities | 0 vulnerabilities |
| `npx tsc -p .` / `npx tsc -p e2e` | OK / OK | OK / OK |
| `npm test` (Vitest) | 18 passed | 18 passed |
| `npm run build` | OK – JS 516.93 kB (gzip 147.94 kB), CSS 33.69 kB | OK |
| `npx playwright install --with-deps chromium` | (đã cài) | OK |
| `npm run test:e2e` | 28 passed (21.0 s) | 28 passed (36.6 s) |
| `npm ci` + `npm audit` backend | 0 vulnerabilities | 0 vulnerabilities |
| `cd backend && npm test` | 15 passed | 15 passed |

## 3. Kiểm thử trình duyệt (Playwright, bản build production)

| Luồng | Spec | Kết quả |
|---|---|---|
| Dashboard, không THPTQG, favicon | `dashboard.spec` (2) | ✅ |
| Điều hướng + tải lại ở mọi trang | `navigation.spec` (5) | ✅ |
| Ôn tập, giải thích, tiến độ, bookmark (kể cả giữa các chương) | `study.spec` (3) | ✅ |
| Flashcard + 360/390/768/1440 px | `flashcard.spec` (5) | ✅ |
| Thi 30 phút → nộp → lịch sử; minimap; regression id (8 đề) | `exam.spec` (3) | ✅ |
| Responsive 360/390/768/1440 mọi trang + trang làm bài | `responsive.spec` (8) | ✅ |
| LocalStorage cũ còn nguyên, lịch sử cũ giữ, bookmark mơ hồ không gán | `legacy-data.spec` (2) | ✅ |

Mọi test tự động thất bại nếu có lỗi JS, `console.error` hoặc HTTP ≥ 400 → 28/28 đạt nghĩa là không còn lỗi console nào (kể cả 404 favicon của P0.1).

Responsive: không tràn ngang ở 360, 390, 768, 1440 px trên mọi trang. 360 và 390 px dùng menu di động; 768 và 1440 px dùng menu desktop (breakpoint `md` của Tailwind).

## 4. Thay đổi package ở P0.2

| File | Thay đổi |
|---|---|
| `package.json` | devDependencies `@playwright/test@1.65.0`, `@types/node@^22` (kiểu cho cấu hình/test e2e); script `test:e2e`. |
| `package-lock.json` | Cây của 2 package trên. `npm audit`: 0. |
| `backend/package.json` | Không đổi ở P0.2. |

## 5. Lưu ý khi phát hành

1. **Bookmark/tiến độ cũ không hiển thị sau cập nhật** (ngân hàng mặc định): chúng được lưu bằng `id` trùng giữa 5 chương nên không xác định được câu; dữ liệu vẫn nằm nguyên trong trình duyệt (`vnu-ai-quiz:bookmarks`, `vnu-ai-quiz:progress`), không bị xoá. Nên thông báo ngắn cho người dùng. Lịch sử thi cũ hiển thị bình thường (bài cũ có thể từng bị chấm sai trước bản sửa).
2. Endpoint AI vẫn khoá (503) tới P2. Response lỗi của backend đổi sang dạng `{ error: { code, message } }` – frontend hiện chưa gọi backend nên không ảnh hưởng.
3. Nên deploy preview Vercel trước, xác nhận build với lockfile mới, rồi mới lên production.

## 6. Vấn đề còn tồn tại

| # | Vấn đề | Mức | Xử lý ở |
|---|---|---|---|
| 1 | CI chưa chạy trên GitHub (chưa push) | – | Lần push đầu tiên; kiểm tra tab Actions |
| 2 | Bookmark/tiến độ cũ không hiển thị (§5.1) – theo quyết định không đoán chương | Thấp | Có thể thêm thông báo ở P3 |
| 3 | Tải lại trang luôn về Dashboard; tải lại giữa bài thi mất bài đang làm (hành vi có sẵn) | Thấp | P2 (router), P5 (lưu bài thi ở server) |
| 4 | Bundle JS > 500 kB (cảnh báo có từ trước) | Thấp | Code-splitting cùng router (P2) |
| 5 | `overrides` minimatch cho nodemon | Thấp | Gỡ khi nodemon phụ thuộc minimatch ≥ 11.0.1 |
| 6 | multer 2.5.0 chưa được thực thi (route khoá) | Thấp | Test lại khi mở endpoint ở P2 |
| 7 | CORS mở (`*`), `ssl.rejectUnauthorized: false` | Thấp | P2 / P1 (đã có trong roadmap) |
| 8 | E2E chỉ chạy Chromium (chưa Firefox/WebKit) | Thấp | Thêm project khi cần |
