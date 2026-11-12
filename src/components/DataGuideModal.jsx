import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "vnuaiquiz_data_guide_seen";

export default function DataGuideModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Chỉ hiện popup nếu chưa từng hiển thị trước đó
    const hasSeenGuide = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenGuide) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        // Lớp nền mờ tối - KHÔNG có onClick để tránh đóng khi click ra ngoài
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(18_27_37/.45)] backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Hộp thoại - dùng stopPropagation phòng trường hợp sau này thêm onClick cho lớp nền */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-blossom-border bg-blossom-card p-6 text-blossom-text shadow-soft"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <h2 className="mb-2 text-lg font-extrabold">
              Hướng dẫn nạp dữ liệu
            </h2>

            <p className="mb-6 text-sm leading-relaxed text-blossom-muted">
              Để có câu hỏi làm bài, vui lòng điều hướng vào mục{" "}
              <span className="font-semibold text-blossom-text">Quản lý dữ liệu</span>,
              sau đó bấm chọn{" "}
              <span className="font-semibold text-blossom-text">Khôi phục mẫu</span>.
            </p>

            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="min-h-[44px] rounded-full bg-blossom-accent px-6 text-sm font-bold text-[rgb(var(--c-on-cta))] transition-all hover:bg-blossom-accent-hover active:scale-95"
              >
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}