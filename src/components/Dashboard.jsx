import {
    ArrowRight,
    BookOpen,
    Database,
    FileQuestion,
    Flag,
    History,
    Inbox,
    PartyPopper,
    PlayCircle,
    Target,
    TrendingUp,
    Zap,
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
        <div className="rounded-xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-blossom-card-dark/60 dark:hover:shadow-soft-dark">
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

            {/* Banner chào mừng — khối màu accent phẳng + minh hoạ SVG abstract bên phải */}
            <Reveal as="section" className="card-accent overflow-hidden rounded-2xl bg-blossom-accent p-6 text-white dark:bg-blossom-accent-dark sm:p-8">
                <div className="flex items-center justify-between gap-8">
                    <div className="max-w-3xl">

                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                            <Target size={14} />
                            Dành cho sinh viên VNU
                        </div>

                        <h1 className="text-2xl font-medium tracking-tight sm:text-4xl">
                            Ôn tập môn Nhập môn công nghệ số & Trí tuệ nhân tạo
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                            Học theo chương, đánh dấu câu khó và thi thử trong 30 phút.
                            Mọi tiến độ được lưu ngay trên trình duyệt.
                        </p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                            <button
                                onClick={() => onNavigate('practice')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blossom-accent transition-transform hover:scale-[1.015] hover:bg-blossom-card-soft active:scale-[0.985]"
                            >
                                <BookOpen size={18} />
                                Ôn tập ngay
                            </button>

                            <button
                                onClick={() => onNavigate('exam')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.015] hover:bg-white/20 active:scale-[0.985]"
                            >
                                <PlayCircle size={18} />
                                Thi thử 30 phút
                            </button>

                            <button
                                onClick={() => onNavigate('admin')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.015] hover:bg-white/20 active:scale-[0.985]"
                            >
                                <Database size={18} />
                                Quản lý dữ liệu
                            </button>

                        </div>
                    </div>

                    {/* Minh hoạ SVG abstract — hình khối trừu tượng, ẩn trên mobile để không chật */}
                    <svg
                        viewBox="0 0 200 200"
                        className="hidden h-44 w-44 shrink-0 opacity-90 lg:block xl:h-52 xl:w-52"
                        aria-hidden="true"
                    >
                        <circle cx="100" cy="70" r="55" fill="white" fillOpacity="0.12" />
                        <circle cx="140" cy="130" r="34" fill="white" fillOpacity="0.16" />
                        <rect x="45" y="115" width="60" height="60" rx="16" fill="white" fillOpacity="0.14" transform="rotate(-8 75 145)" />
                        <path
                            d="M60 70 L100 50 L140 70 L100 90 Z"
                            fill="white"
                            fillOpacity="0.22"
                        />
                        <circle cx="100" cy="70" r="8" fill="white" fillOpacity="0.6" />
                    </svg>
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
                <div className="rounded-2xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 dark:border-white/10 dark:bg-blossom-card-dark/60 sm:p-6">
                    <div className="flex items-center justify-between gap-4">

                        <div>
                            <h2 className="flex items-center gap-2 font-bold text-blossom-text dark:text-blossom-text-dark">
                                <TrendingUp size={18} className="text-blossom-gold dark:text-blossom-gold-dark" />
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

                <div className="rounded-2xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 dark:border-white/10 dark:bg-blossom-card-dark/60 sm:p-6">

                    <h2 className="flex items-center gap-2 font-bold text-blossom-text dark:text-blossom-text-dark">
                        <Zap size={18} className="text-blossom-gold dark:text-blossom-gold-dark" />
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
                className="rounded-2xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm dark:border-white/10 dark:bg-blossom-card-dark/60"
            >

                <div className="flex items-center justify-between border-b border-blossom-border px-5 py-4 dark:border-blossom-border-dark sm:px-6">
                    <div>
                        <h2 className="flex items-center gap-2 font-bold text-blossom-text dark:text-blossom-text-dark">
                            <History size={18} className="text-blossom-gold dark:text-blossom-gold-dark" />
                            Lịch sử thi thử
                        </h2>

                        <p className="mt-1 text-sm text-blossom-muted dark:text-blossom-muted-dark">
                            Các bài gần đây được lưu trong LocalStorage.
                        </p>
                    </div>

                    {recent.length > 0 && recent[0].score >= 8 && (
                        <div className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-blossom-gold/15 to-blossom-accent/15 px-3 py-1.5 text-xs font-semibold text-blossom-accent dark:text-blossom-accent-dark sm:flex">
                            <PartyPopper size={14} />
                            Điểm gần nhất rất cao!
                        </div>
                    )}
                </div>

                {recent.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blossom-accent/10 text-blossom-accent dark:bg-blossom-accent-dark/15 dark:text-blossom-accent-dark">
                            <Inbox size={30} />
                        </div>

                        <div>
                            <div className="font-semibold text-blossom-text dark:text-blossom-text-dark">
                                Bạn chưa hoàn thành bài thi nào
                            </div>
                            <p className="mt-1 max-w-sm text-sm text-blossom-muted dark:text-blossom-muted-dark">
                                Làm một đề thi thử 30 phút để xem điểm số và theo dõi tiến bộ của bạn ở đây.
                            </p>
                        </div>

                        <button
                            onClick={() => onNavigate('exam')}
                            className="inline-flex items-center gap-2 rounded-xl bg-blossom-accent px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:bg-blossom-accent-hover active:scale-[0.98] dark:bg-blossom-accent-dark dark:hover:bg-blossom-accent-dark-hover"
                        >
                            <PlayCircle size={17} />
                            Bắt đầu thi thử
                        </button>
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
                                    <div className="flex items-center gap-1.5 font-bold text-blossom-accent dark:text-blossom-accent-dark sm:justify-end">
                                        {item.score >= 8 && (
                                            <PartyPopper size={14} className="text-blossom-gold dark:text-blossom-gold-dark" />
                                        )}
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
