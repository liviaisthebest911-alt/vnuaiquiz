---
name: VNU Quiz
description: Không gian ôn tập để sinh viên thấy môn đang học và vào ôn tiếp.
colors:
  primary: "#25563b"
  primary-hover: "#1e4731"
  primary-dark: "#a7cd8f"
  primary-dark-hover: "#c3e5a6"
  rail: "#18291f"
  rail-dark: "#121c15"
  rail-text: "#d7e2d6"
  lime: "#d9edaa"
  lime-hover: "#ecf8cc"
  hero: "#183627"
  hero-text: "#f5f8ee"
  paper: "#f5f5ee"
  panel: "#fffef8"
  ink: "#202920"
  muted: "#556254"
  line: "#dce1d5"
  soft-green: "#e7efde"
  paper-dark: "#151d17"
  panel-dark: "#202a21"
  ink-dark: "#e9efe5"
  muted-dark: "#b6c3b4"
  line-dark: "#39483a"
  soft-green-dark: "#293e2d"
  focus: "#457a51"
  on-primary: "#ffffff"
  warning-surface: "#f9ead4"
  warning-text: "#603b18"
  warning-surface-dark: "#3c3024"
  warning-text-dark: "#ffdaa4"
typography:
  display:
    fontFamily: '"DM Sans", Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2.05rem, 4vw, 3.1rem)"
    fontWeight: 760
    lineHeight: 1.15
    letterSpacing: "-.035em"
  headline:
    fontFamily: '"DM Sans", Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.65rem, 3.1vw, 2.55rem)"
    fontWeight: 720
    lineHeight: 1.18
    letterSpacing: "-.035em"
  title:
    fontSize: "22px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontSize: "14px"
    lineHeight: "20px"
  label:
    fontSize: "12px"
    lineHeight: "16px"
rounded:
  base: "7px"
  icon: "8px"
  lg: "9px"
  xl: "12px"
  rows: "13px"
  2xl: "15px"
  3xl: "16px"
  full: "999px"
spacing:
  inline: "8px"
  row-gap: "12px"
  field-inline: "16px"
  panel: "20px"
  panel-sm: "24px"
  section: "26px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.paper-dark}"
  button-primary-dark-hover:
    backgroundColor: "{colors.primary-dark-hover}"
  button-secondary:
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.soft-green}"
  button-small:
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  button-study:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.rail}"
    rounded: "{rounded.lg}"
    padding: "9px 14px"
  button-study-hover:
    backgroundColor: "{colors.lime-hover}"
  input:
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  status-chip:
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  navigation-item:
    textColor: "{colors.rail-text}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  navigation-item-current:
    backgroundColor: "{colors.lime}"
    textColor: "#193325"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.panel}"
  panel-dark:
    backgroundColor: "{colors.panel-dark}"
  course-list:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.rows}"
  course-feature:
    backgroundColor: "{colors.hero}"
    textColor: "{colors.hero-text}"
    rounded: "{rounded.3xl}"
    padding: "clamp(22px, 3.3vw, 43px)"
  progress:
    backgroundColor: "#54705d"
    rounded: "{rounded.full}"
    height: "6px"
---

# Design System — VNU Quiz

## Overview

**Creative North Star: "Không gian học tập VNU"**

Giao diện phục vụ thao tác học hằng ngày (Operate). Thanh điều hướng xanh rừng tạo khung cố định, vùng làm việc dùng nền giấy sáng hoặc nền xanh sẫm khi bật chế độ tối. Tiêu đề, hàng nội dung và đường phân cách giúp sinh viên tìm mục cần dùng khi lướt nhanh.

Ở trang Tổng quan, tên môn đang học, số câu đã ôn trên tổng số câu và nút ôn nằm chung một khối. Ảnh minh họa do ImageGen tạo mô tả một góc bàn học trong thư viện và được dùng làm nền trang trí.

**Key Characteristics**

- Điều hướng cố định, vùng nội dung có đường phân cách mảnh.
- Hỗ trợ hai chế độ sáng và tối.
- Môn đang học và hành động ôn tiếp được ưu tiên ở Tổng quan.

## Colors

### Primary

- **Xanh rừng** dùng cho thanh điều hướng, khối môn đang học và nút chính trên nền sáng.
- **Xanh non** dùng cho mục điều hướng hiện tại, nút ôn và phần đã hoàn thành trên thanh tiến độ. Nút chính thông thường dùng xanh nhạt trên nền tối.

### Secondary

- **Hổ phách** báo tình trạng cần chú ý, như lỗi tải dữ liệu hoặc tài liệu đang chờ duyệt. Nhãn văn bản mô tả trạng thái cùng với màu.

### Neutral

- **Giấy** là nền vùng làm việc. **Mặt thẻ** là nền danh sách và nhóm nội dung.
- **Mực** dùng cho tiêu đề và nội dung chính. **Mực nhạt** dùng cho thông tin bổ trợ. **Đường viền** phân cách các nhóm và hàng.
- Chế độ tối đổi nền, chữ, đường viền, trạng thái tương tác và cảnh báo. Khối môn đang học giữ nền xanh rừng và chữ sáng.

## Typography

Dùng DM Sans, với Inter và các phông sans-serif hệ thống làm dự phòng. Tiêu đề trang dùng cỡ linh hoạt theo viewport. Tên môn cho phép xuống dòng và có chiều rộng tối đa 24ch trong khối Tổng quan.

- **Tiêu đề trang** (760) mở đầu màn hình.
- **Tên môn nổi bật** (720) dẫn khối tiến độ ở Tổng quan.
- **Tiêu đề nhóm** (22px, 750) giúp tìm nhanh môn học, công cụ và lịch sử.
- **Nội dung** (14px) dùng cho thao tác và hàng dữ liệu. **Nhãn phụ** (12–13px) dùng cho số câu, mô tả ngắn và trạng thái.
- Tiến độ, số liệu tổng hợp và đồng hồ thi dùng chữ số cùng chiều rộng.

## Layout

Vùng nội dung rộng tối đa 1360px. Màn hình từ 1024px dùng thanh bên 232px. Từ 768 đến 1023px, thanh bên rộng 76px và chỉ hiển thị biểu tượng, với nhãn vẫn có thể đọc qua công nghệ hỗ trợ. Dưới 768px, thanh đầu trang mở menu theo yêu cầu.

Tổng quan dùng khoảng cách 26px giữa các khối, giảm còn 21px trên điện thoại. Hai cột môn học và công cụ chuyển thành một cột trên điện thoại. Ảnh của khối môn học nằm bên phải trên màn hình rộng và chuyển xuống dưới nút ôn trên điện thoại.

## Elevation & Depth

Thẻ nội dung và danh sách chủ yếu dùng màu nền, đường viền và khoảng cách để phân lớp. Bóng mềm xuất hiện ở mặt flashcard và hộp thoại kết quả thi thử.

## Shapes

Góc bo nhẹ cho điều hướng và nút ôn (9px). Trường nhập và nút dùng chung bo 12px, danh sách môn 13px, thẻ 15px và khối môn đang học 16px. Thanh tiến độ và nhãn trạng thái dùng góc bo tròn.

## Components

- **Nút** dùng động từ tiếng Việt. Nút chính dùng nền xanh, nút phụ dùng đường viền, nút nhỏ dùng cho thao tác trong hàng. Nút ôn trong Tổng quan hiển thị “Ôn tiếp” khi đã trả lời câu hỏi và “Ôn tập ngay” khi chưa bắt đầu.
- **Trường nhập** dùng nền trong suốt và đường viền mảnh. Khi nhận tiêu điểm, đường viền và vòng sáng đổi màu.
- **Điều hướng** ghép biểu tượng nét và nhãn. Mục đang mở có nền xanh non và thuộc tính `aria-current="page"`.
- **Danh sách môn** gom các hàng dưới cùng một viền. Mỗi hàng có biểu tượng, tên môn, số câu hỏi và số câu đã ôn nếu có.
- **Tiến độ ôn tập** dùng thanh 6px và dòng số đã ôn trên tổng số câu. Khối ảnh nằm ngoài nội dung cần đọc.
- **Nhãn trạng thái** dùng chữ ngắn trên nền màu dịu cho quy trình duyệt tài liệu.

## Do's and Don'ts

- **Do** Hiển thị tên môn đang học và số câu đã ôn từ dữ liệu hiện có.
- **Do** Duy trì viền tiêu điểm khi dùng bàn phím và tôn trọng cài đặt giảm chuyển động.
- **Don't** Đặt tác vụ phụ ngang mức ưu tiên với nút ôn trong khối môn đang học.
