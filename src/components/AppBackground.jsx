// Nền chiều sâu cho toàn ứng dụng: 3 khối "gradient orb" lớn, mờ cực mạnh,
// đặt cố định (fixed) ở các góc màn hình. Luôn nằm dưới nội dung (-z-10),
// không chặn tương tác (pointer-events-none), không đổi theo scroll.
export default function AppBackground() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
            {/* Orb 1 — hồng pastel, góc trên-trái */}
            <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-rose-200 opacity-40 blur-3xl dark:bg-rose-500/20 dark:opacity-30" />

            {/* Orb 2 — vàng Champagne, góc trên-phải */}
            <div className="absolute -top-40 right-[-120px] h-[480px] w-[480px] rounded-full bg-amber-100/70 opacity-40 blur-3xl dark:bg-amber-400/10 dark:opacity-40" />

            {/* Orb 3 — hồng nhạt hơn, góc dưới, lệch giữa để cân bố cục dài */}
            <div className="absolute bottom-[-160px] left-1/3 h-[520px] w-[520px] rounded-full bg-rose-100 opacity-50 blur-3xl dark:bg-rose-400/10 dark:opacity-25" />
        </div>
    )
}
