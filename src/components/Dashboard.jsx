import {
    ArrowRight,
    BookOpen,
    Database,
    FileQuestion,
    Flag,
    History,
    PlayCircle,
    Target,
} from 'lucide-react'

import Reveal from './Reveal'

function StatCard({
                      icon: Icon,
                      label,
                      value,
                      note,
                  }) {
    return (
        // Card tối giản: chỉ viền mỏng, hover mới hiện shadow rất nhẹ + nhấc nhẹ lên
        <div className="rounded-xl border border-blossom-border bg-blossom-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-blossom-border-dark dark:bg-blossom-card-dark dark:hover:shadow-soft-dark">
            <div className="flex items-start justify-between">

                <div>
                    <div className="text-sm font-medium text-blossom-muted dark:text-blossom-muted-dark">
                        {label}
                    </div>

                    <div className="mt-2 text-3xl font-bold text-blossom-text dark:text-blossom-text-dark">
                        {value}
                    </div>

                    <div className="mt-1 text-xs text-blossom-muted dark:text-blossom-muted-dark">
                        {note}
                    </div>
                </div>

                <div className="rounded-lg bg-blossom-accent/10 p-3 text-blossom-accent dark:bg-blossom-accent-dark/15 dark:text-blossom-accent-dark">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    )
}

export default function Dashboard({
                                      questions,
                                      history,
                                      progress,
                                      bookmarks,
                                      onNavigate,
                                  }) {
    const chapters = [
        ...new Set(questions.map((q) => q.chapter)),
    ]

    const completion = questions.length
        ? Math.round((progress.length / questions.length) * 100)
        : 0

    const avg = history.length
        ? (
            history.reduce(
                (sum, item) => sum + item.score,
                0,
            ) / history.length
        ).toFixed(1)
        : '—'

    const recent = history.slice(0, 5)

    return (
        <div className="space-y-6">

            {/* Banner chào mừng — tối giản, KHÔNG dùng gradient rực rỡ, dùng khối màu accent phẳng */}
            <Reveal as="section" className="overflow-hidden rounded-2xl bg-blossom-accent p-6 text-white dark:bg-blossom-accent-dark sm:p-8">
                <div className="max-w-3xl">

                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                        <Target size={14} />
                        Dành cho sinh viên VNU
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
                        Ôn tập môn Nhập môn công nghệ số & Trí tuệ nhân tạo
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                        Học theo chương, đánh dấu câu khó và thi thử trong 30 phút.
                        Mọi tiến độ được lưu ngay trên trình duyệt.
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                        <button
                            onClick={() => onNavigate('practice')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blossom-accent transition-transform hover:scale-[1.03] hover:bg-blossom-card-soft active:scale-95"
                        >
                            <BookOpen size={18} />
                            Ôn tập ngay
                        </button>

                        <button
                            onClick={() => onNavigate('exam')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.03] hover:bg-white/20 active:scale-95"
                        >
                            <PlayCircle size={18} />
                            Thi thử 30 phút
                        </button>

                        <button
                            onClick={() => onNavigate('admin')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.03] hover:bg-white/20 active:scale-95"
                        >
                            <Database size={18} />
                            Quản lý dữ liệu
                        </button>

                    </div>
                </div>
            </Reveal>

            <Reveal
                as="section"
                delay={80}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                <StatCard
                    icon={FileQuestion}
                    label="Tổng câu hỏi"
                    value={questions.length}
                    note="Trong ngân hàng hiện tại"
                />

                <StatCard
                    icon={BookOpen}
                    label="Số chương"
                    value={chapters.length}
                    note="Theo dữ liệu đang nạp"
                />

                <StatCard
                    icon={History}
                    label="Bài đã làm"
                    value={history.length}
                    note={`Điểm trung bình: ${avg}/10`}
                />

                <StatCard
                    icon={Flag}
                    label="Câu đã đánh dấu"
                    value={bookmarks.length}
                    note="Có thể xem lại trong Ôn tập"
                />
            </Reveal>

            <Reveal
                as="section"
                delay={140}
                className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]"
            >
                <div className="rounded-2xl border border-blossom-border bg-blossom-card p-5 dark:border-blossom-border-dark dark:bg-blossom-card-dark sm:p-6">
                    <div className="flex items-center justify-between gap-4">

                        <div>
                            <h2 className="font-bold text-blossom-text dark:text-blossom-text-dark">
                                Tiến độ ôn tập
                            </h2>

                            <p className="mt-1 text-sm text-blossom-muted dark:text-blossom-muted-dark">
                                Số câu đã xem/làm trong chế độ Ôn tập.
                            </p>
                        </div>

                        <span className="text-2xl font-bold text-blossom-accent dark:text-blossom-accent-dark">
              {completion}%
            </span>

                    </div>

                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-blossom-card-soft dark:bg-blossom-card-soft-dark">
                        <div
                            className="h-full rounded-full bg-blossom-accent transition-all duration-500 dark:bg-blossom-accent-dark"
                            style={{
                                width: `${completion}%`,
                            }}
                        />
                    </div>

                    <div className="mt-3 text-xs text-blossom-muted dark:text-blossom-muted-dark">
                        {progress.length}/{questions.length || 0} câu đã được ghi nhận.
                    </div>
                </div>

                <div className="rounded-2xl border border-blossom-border bg-blossom-card p-5 dark:border-blossom-border-dark dark:bg-blossom-card-dark sm:p-6">

                    <h2 className="font-bold text-blossom-text dark:text-blossom-text-dark">
                        Bắt đầu nhanh
                    </h2>

                    <div className="mt-4 space-y-2">

                        <button
                            onClick={() => onNavigate('practice')}
                            className="flex w-full items-center justify-between rounded-xl border border-blossom-border px-4 py-3 text-left text-sm font-medium text-blossom-text transition-all hover:scale-[1.01] hover:border-blossom-accent/40 hover:bg-blossom-card-soft dark:border-blossom-border-dark dark:text-blossom-text-dark dark:hover:bg-blossom-card-soft-dark"
                        >
              <span className="inline-flex items-center gap-3">
                <BookOpen size={18} className="text-blossom-accent dark:text-blossom-accent-dark" />
                Ôn tập theo chương
              </span>

                            <ArrowRight size={17} />
                        </button>

                        <button
                            onClick={() => onNavigate('exam')}
                            className="flex w-full items-center justify-between rounded-xl border border-blossom-border px-4 py-3 text-left text-sm font-medium text-blossom-text transition-all hover:scale-[1.01] hover:border-blossom-accent/40 hover:bg-blossom-card-soft dark:border-blossom-border-dark dark:text-blossom-text-dark dark:hover:bg-blossom-card-soft-dark"
                        >
              <span className="inline-flex items-center gap-3">
                <PlayCircle size={18} className="text-blossom-accent dark:text-blossom-accent-dark" />
                Thi thử 30 phút
              </span>

                            <ArrowRight size={17} />
                        </button>

                    </div>
                </div>
            </Reveal>

            <Reveal
                as="section"
                delay={200}
                className="rounded-2xl border border-blossom-border bg-blossom-card dark:border-blossom-border-dark dark:bg-blossom-card-dark"
            >

                <div className="flex items-center justify-between border-b border-blossom-border px-5 py-4 dark:border-blossom-border-dark sm:px-6">
                    <div>
                        <h2 className="font-bold text-blossom-text dark:text-blossom-text-dark">
                            Lịch sử thi thử
                        </h2>

                        <p className="mt-1 text-sm text-blossom-muted dark:text-blossom-muted-dark">
                            Các bài gần đây được lưu trong LocalStorage.
                        </p>
                    </div>
                </div>

                {recent.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-blossom-muted dark:text-blossom-muted-dark">
                        Chưa có bài thi nào. Hãy thử một đề 30 phút.
                    </div>
                ) : (
                    <div className="divide-y divide-blossom-border dark:divide-blossom-border-dark">
                        {recent.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-blossom-card-soft dark:hover:bg-blossom-card-soft-dark sm:flex-row sm:items-center sm:justify-between sm:px-6"
                            >
                                <div>
                                    <div className="font-medium text-blossom-text dark:text-blossom-text-dark">
                                        Đề thi thử · {item.totalQuestions} câu
                                    </div>

                                    <div className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
                                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                </div>

                                <div className="text-left sm:text-right">
                                    <div className="font-bold text-blossom-accent dark:text-blossom-accent-dark">
                                        {item.score.toFixed(1)}/10
                                    </div>

                                    <div className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
                                        {item.correct}/{item.totalQuestions} đúng ·{' '}
                                        {item.accuracy}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Reveal>

        </div>
    )
}
