---
name: VNU Quiz
description: "A Little Space for Learning" – không gian ôn tập Cute Academic để sinh viên thấy môn đang học và vào ôn tiếp.
colors:
  sky: "#A9D8F5"
  sky-soft: "#E5F4FC"
  sky-strong: "#D4ECFA"
  deep: "#527F9E"
  link: "#44708E"
  petal: "#F5C9D6"
  petal-soft: "#FCE8EE"
  petal-line: "#EBB3C4"
  petal-ink: "#9A4A63"
  lilac: "#E9E3F8"
  lilac-ink: "#5B4E8C"
  bg: "#F7FAFD"
  surface: "#FFFFFF"
  ink: "#283746"
  muted: "#627280"
  line: "#E5EDF3"
  cta: "#283746"
  cta-hover: "#1D2A37"
  on-cta: "#FFFFFF"
  bg-dark: "#121B25"
  surface-dark: "#1B2632"
  soft-dark: "#1D3242"
  line-dark: "#2C3B4B"
  ink-dark: "#E8F1F8"
  muted-dark: "#A5B4C2"
  cta-dark: "#A9D8F5"
  on-cta-dark: "#13202C"
  hero-dark: "#1F3B52"
typography:
  display:
    fontFamily: 'Nunito, "Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.6rem, 3vw, 2.4rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-.01em"
  headline:
    fontFamily: 'Nunito, "Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.25rem, 2.2vw, 1.55rem)"
    fontWeight: 800
    lineHeight: 1.25
  title:
    fontFamily: 'Nunito, "Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif'
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif'
    fontSize: "15px"
    lineHeight: 1.5
  label:
    fontFamily: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif'
    fontSize: "12–13px"
    fontWeight: 700
rounded:
  base: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "20px"
  3xl: "24px"
  full: "999px"
spacing:
  inline: "8px"
  row-gap: "12px"
  panel: "20px"
  panel-sm: "26px"
  section: "28px"
motion:
  fast: "150ms"
  base: "220ms"
  ease-out: "cubic-bezier(.2, .8, .2, 1)"
components:
  button-primary:
    backgroundColor: "{colors.cta}"
    textColor: "{colors.on-cta}"
    rounded: "{rounded.full}"
    padding: "0 20px; min-height 44px"
  button-primary-dark:
    backgroundColor: "{colors.cta-dark}"
    textColor: "{colors.on-cta-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
    border: "1px {colors.line} → {colors.sky} khi hover"
  input:
    rounded: "{rounded.xl}"
    padding: "10px 16px; min-height 46px"
    focus: "viền {colors.deep} + vòng 2px"
  chip:
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  navigation-item-current:
    backgroundColor: "{colors.sky-strong}"
    rounded: "{rounded.xl}"
  card:
    backgroundColor: "{colors.surface}"
    border: "1px {colors.line}"
    rounded: "{rounded.2xl}"
  course-block:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
    padding: "26px 32px"
  progress:
    backgroundColor: "rgba(255,255,255,.65)"
    fill: "{colors.ink}"
    height: "10px"
  mascot:
    background: "#FCFCFC"
    shape: "tròn, viền 4px {colors.sky-soft}"
    maxSize: "112px (không phóng to ảnh gốc)"
---

# Design System — VNU Quiz

## Overview

**Creative North Star: "A Little Space for Learning" – Cute Academic, Soft Pastel, Modern Minimalism.**

Không gian học cá nhân, trong trẻo, dễ chịu khi dùng lâu: dễ thương nhưng không trẻ con. Xanh da trời là màu chủ đạo, hồng pastel là điểm nhấn, lavender cho flashcard và thẻ phụ. Mascot (ảnh gốc chủ dự án cung cấp, `src/assets/mascot.png`) xuất hiện nhỏ và có chủ đích.

Ở Tổng quan, tên môn đang học, số câu đã làm (một thanh tiến độ duy nhất), nút **Ôn tiếp** và liên kết **Chọn chương** nằm chung một khối gọn.

**Key Characteristics**

- Một lớp token duy nhất: biến CSS kênh RGB trong `src/workspace.css` (`--c-*`), Tailwind đọc lại qua `tailwind.config.js` (`blossom-*`, `cloud`, `petal`, `lilac`). Biến tự đổi dưới `.dark`.
- Hai chế độ sáng/tối áp dụng cho mọi trang, hộp thoại, form và bảng.
- Chuyển động nhẹ, tắt khi `prefers-reduced-motion`.

## Colors

- **Xanh trời** (`sky`, `sky-soft`, `sky-strong`, `deep`): nền khối môn học, mục điều hướng đang chọn, trạng thái “đúng”/“đã làm”, vạch tiến độ.
- **Hồng pastel** (`petal*`): chip “Môn đang học”, trạng thái “sai”, câu đã đánh dấu, cảnh báo thời gian thi.
- **Lavender** (`lilac*`): mặt sau flashcard, chip chương, cảnh báo nhẹ.
- **Trung tính**: nền `bg`, thẻ `surface`, chữ `ink`, chữ phụ `muted`, viền `line`.
- Hex của brief giữ cho nền và viền. Chữ phụ (#81909C → #627280) và chữ liên kết (#527F9E → #44708E) được đậm hơn để đạt WCAG AA 4.5:1.
- Nút chính: navy + chữ trắng (sáng); xanh trời + chữ navy đậm (tối).

## Typography

Nunito (700–800) cho tiêu đề h1–h3 và số liệu; Be Vietnam Pro (400–700) cho nội dung – cả hai hỗ trợ đầy đủ dấu tiếng Việt. Tiến độ, số liệu và đồng hồ thi dùng chữ số cùng chiều rộng.

## Layout

Vùng nội dung tối đa 1180px. Từ 1024px: thanh bên trắng 248px (nhóm “Học tập” / “Cài đặt”) + thanh trên có breadcrumb, nút sáng/tối, chip tài khoản. 768–1023px: thanh bên 80px chỉ icon. Dưới 768px: thanh trên gọn (logo, sáng/tối, tài khoản) và **thanh tab dưới** cố định: Tổng quan, Ôn tập, Thi thử, Tài liệu, Thêm (bảng “Thêm” chứa Môn học, Flashcard, Quản lý dữ liệu, Tài khoản). Nội dung chừa đáy `96px + safe-area` để thanh tab không che nút (đã có E2E kiểm tra nút “Câu tiếp”).

## Elevation & Depth

Phân lớp bằng nền, viền 1px và khoảng cách. Bóng mềm chỉ xuất hiện khi hover thẻ và ở flashcard/hộp thoại. Không glassmorphism, không gradient trang trí.

## Shapes

Nút và chip bo tròn hoàn toàn. Trường nhập 14px, thẻ 20px, khối môn học và flashcard 24px. Ô danh sách câu 12px.

## Components

- **Nút**: chính (navy/xanh trời), phụ (viền), nhỏ. Hover scale 1.02, nhấn 0.97, `focus-visible` viền xanh 2px. Vùng chạm ≥ 44px.
- **Thẻ có thể bấm** (`.lift`, `button.study-row`): hover nhấc 4px, viền chuyển xanh trời, bóng nhẹ, icon phóng 1.08, mũi tên trượt 4px.
- **Khối môn đang học**: chip hồng, tên môn, một thanh tiến độ + “x/y câu đã làm”, nút Ôn tiếp (“Ôn tập ngay” khi chưa làm), “Chọn chương” mở trang chương của đúng môn đang học (môn trên thiết bị → `?local=1`). Có đốm sáng theo con trỏ trên thiết bị có hover.
- **Đáp án**: đã chọn = viền xanh đậm; đúng = nền xanh nhạt + icon check; sai = nền hồng nhạt + icon cảnh báo. Ô phản hồi có mascot và lời động viên.
- **Danh sách câu** (`QuestionMap`): đang làm (nền nút chính), đã làm (xanh nhạt), đã đánh dấu (vòng hồng). Trên di động mở bằng nút “Danh sách câu” cạnh bộ đếm.
- **Mascot** (`Mascot.jsx`): ảnh gốc, chỉ cắt khung bằng CSS và chỉ thu nhỏ (≤ 112px). Trạng thái chuyển động: `greet` (Tổng quan), `success`/`encourage` (phản hồi, kết quả thi), `loading`. Hover nghiêng đầu. Không tự vẽ biến thể.
- **Chuyển trang**: fade + trượt 10px, 220ms.

## Do's and Don'ts

- **Do** Hiển thị tên môn và tiến độ từ dữ liệu thật; số liệu minh hoạ chỉ dùng trong mockup.
- **Do** Dùng token (`blossom-*`, `cloud`, `petal`, `lilac`, `--c-*`) thay cho mã màu cứng.
- **Do** Giữ viền tiêu điểm bàn phím và tôn trọng giảm chuyển động.
- **Don't** Phóng to ảnh mascot, đặt mascot nhiều hơn một lần trên một vùng, hoặc che nội dung trên di động.
- **Don't** Dùng hồng và xanh với tỷ lệ ngang nhau; xanh là chủ đạo.
