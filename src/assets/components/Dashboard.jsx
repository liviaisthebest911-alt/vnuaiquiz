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

function StatCard({
                      icon: Icon,
                      label,
                      value,
                      note,
                  }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between">

                <div>
                    <div className="text-sm font-medium text-slate-500">
                        {label}
                    </div>

                    <div className="mt-2 text-3xl font-bold text-slate-900">
                        {value}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                        {note}
                    </div>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon size={22} />
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

            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-soft sm:p-8">
                <div className="max-w-3xl">

                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                        <Target size={14} />
                        Dành cho sinh viên VNU
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
                        Ôn tập môn Nhập môn công nghệ số & Trí tuệ nhân tạo
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                        Học theo chương, đánh dấu câu khó và thi thử trong 30 phút.
                        Mọi tiến độ được lưu ngay trên trình duyệt.
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                        <button
                            onClick={() => onNavigate('practice')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
                        >
                            <BookOpen size={18} />
                            Ôn tập ngay
                        </button>

                        <button
                            onClick={() => onNavigate('exam')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                        >
                            <PlayCircle size={18} />
                            Thi thử 30 phút
                        </button>

                        <button
                            onClick={() => onNavigate('admin')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                        >
                            <Database size={18} />
                            Quản lý dữ liệu
                        </button>

                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

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

            </section>

            <section className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
                    <div className="flex items-center justify-between gap-4">

                        <div>
                            <h2 className="font-bold text-slate-900">
                                Tiến độ ôn tập
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Số câu đã xem/làm trong chế độ Ôn tập.
                            </p>
                        </div>

                        <span className="text-2xl font-bold text-blue-700">
              {completion}%
            </span>

                    </div>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{
                                width: `${completion}%`,
                            }}
                        />
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                        {progress.length}/{questions.length || 0} câu đã được ghi nhận.
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">

                    <h2 className="font-bold text-slate-900">
                        Bắt đầu nhanh
                    </h2>

                    <div className="mt-4 space-y-2">

                        <button
                            onClick={() => onNavigate('practice')}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium hover:border-blue-200 hover:bg-blue-50"
                        >
              <span className="inline-flex items-center gap-3">
                <BookOpen size={18} className="text-blue-600" />
                Ôn tập theo chương
              </span>

                            <ArrowRight size={17} />
                        </button>

                        <button
                            onClick={() => onNavigate('exam')}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium hover:border-blue-200 hover:bg-blue-50"
                        >
              <span className="inline-flex items-center gap-3">
                <PlayCircle size={18} className="text-blue-600" />
                Thi thử 30 phút
              </span>

                            <ArrowRight size={17} />
                        </button>

                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">

                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div>
                        <h2 className="font-bold text-slate-900">
                            Lịch sử thi thử
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Các bài gần đây được lưu trong LocalStorage.
                        </p>
                    </div>
                </div>

                {recent.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-slate-500">
                        Chưa có bài thi nào. Hãy thử một đề 30 phút.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {recent.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                            >
                                <div>
                                    <div className="font-medium text-slate-900">
                                        Đề thi thử · {item.totalQuestions} câu
                                    </div>

                                    <div className="text-xs text-slate-500">
                                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                </div>

                                <div className="text-left sm:text-right">
                                    <div className="font-bold text-blue-700">
                                        {item.score.toFixed(1)}/10
                                    </div>

                                    <div className="text-xs text-slate-500">
                                        {item.correct}/{item.totalQuestions} đúng ·{' '}
                                        {item.accuracy}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

        </div>
    )
}