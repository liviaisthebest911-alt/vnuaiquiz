#!/usr/bin/env bash
# ==========================================================================
# start.sh - Tự động cài đặt & chạy vnuaiquiz trên localhost
# Dùng cho: Linux (bash)
# Cách dùng:
#   chmod +x start.sh
#   ./start.sh
# ==========================================================================

set -euo pipefail  # dừng ngay nếu có lệnh lỗi, tránh chạy tiếp trên trạng thái sai

PORT=5173
REQUIRED_NODE_MAJOR=20
REQUIRED_NODE_MINOR=19

echo "=================================================="
echo " VNU Digital & AI Quiz - Khởi động môi trường local"
echo "=================================================="

# --- 1. Kiểm tra Node.js đã cài chưa ------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Không tìm thấy Node.js. Vui lòng cài Node.js >= 20.19 (khuyến nghị dùng nvm)."
  echo "   Cài nhanh qua nvm:"
  echo "     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "     nvm install --lts"
  exit 1
fi

# --- 2. Kiểm tra phiên bản Node đủ điều kiện (Vite 8 yêu cầu >= 20.19) --
NODE_VERSION=$(node -v | sed 's/^v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ] || \
   { [ "$NODE_MAJOR" -eq "$REQUIRED_NODE_MAJOR" ] && [ "$NODE_MINOR" -lt "$REQUIRED_NODE_MINOR" ]; }; then
  echo "⚠️  Phát hiện Node.js v${NODE_VERSION}. Dự án yêu cầu >= 20.19.0 (hoặc 22.12+)."
  echo "   Khuyến nghị nâng cấp: nvm install --lts && nvm use --lts"
fi

echo "✅ Node.js: v${NODE_VERSION}"
echo "✅ npm:     v$(npm -v)"

# --- 3. Chuẩn bị .env.local nếu chưa có ---------------------------------
if [ -f ".env.local.example" ] && [ ! -f ".env.local" ]; then
  cp .env.local.example .env.local
  echo "✅ Đã tạo .env.local từ file mẫu (hiện dự án chưa dùng biến nào, chỉ để dự phòng)."
fi

# --- 4. Cài đặt dependencies --------------------------------------------
echo "--------------------------------------------------"
echo "📦 Đang cài đặt thư viện (npm install)..."
npm install

# --- 5. Kiểm tra & giải phóng cổng nếu đang bị chiếm ---------------------
if command -v lsof >/dev/null 2>&1 && lsof -i :"$PORT" >/dev/null 2>&1; then
  echo "⚠️  Cổng ${PORT} đang được sử dụng bởi tiến trình khác:"
  lsof -i :"$PORT"
  echo "   Vite sẽ tự động chuyển sang cổng trống kế tiếp nếu cần."
fi

# --- 6. Khởi động dev server ---------------------------------------------
echo "--------------------------------------------------"
echo "🚀 Đang khởi động dev server tại http://localhost:${PORT}/"
echo "   Nhấn Ctrl+C để dừng server."
echo "--------------------------------------------------"
npm run dev -- --port "$PORT" --host