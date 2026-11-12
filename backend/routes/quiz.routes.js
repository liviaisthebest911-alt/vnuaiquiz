import express from 'express';

const router = express.Router();

// Tạm khoá (P0): endpoint chưa có xác thực nên ai cũng gọi được Gemini bằng key của dự án.
// Trả 503 trước khi đọc file upload. Mở lại ở P2 dưới dạng POST /api/v1/admin/questions/generate
// (chỉ editor/admin) – controller giữ nguyên ở controllers/quiz.controller.js.
router.post('/generate', (req, res) => {
  res.status(503).json({
    error: {
      code: 'FEATURE_DISABLED',
      message: 'Chức năng tạo câu hỏi bằng AI đang tạm khoá.',
    },
  });
});

export default router;
