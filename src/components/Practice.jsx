import {
    Bookmark,
    BookmarkCheck,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleX,
    LayoutGrid,
} from 'lucide-react'

import { useMemo, useState } from 'react'

export default function Practice({
                                     questions,
                                     bookmarks,
                                     onToggleBookmark,
                                     onMarkProgress,
                                 }) {
    const chapterOptions = useMemo(() => {
        const byChapter = new Map()

        questions.forEach((q) => {
            if (!byChapter.has(q.chapter)) {
                byChapter.set(q.chapter, q.chapterName)
            }
        })

        return [...byChapter.entries()].sort(
            (a, b) => a[0] - b[0],
        )
    }, [questions])

    const [chapter, setChapter] = useState('all')
    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState(null)

    const filtered = useMemo(
        () =>
            chapter === 'all'
                ? questions
                : questions.filter(
                    (q) => q.chapter === Number(chapter),
                ),
        [chapter, questions],
    )

    const current = filtered[index] || null
    const answered = selected !== null

    const chooseChapter = (value) => {
        setChapter(value)
        setIndex(0)
        setSelected(null)
    }

    const go = (nextIndex) => {
        setIndex(nextIndex)
        setSelected(null)
    }

    const handleAnswer = (optionIndex) => {
        if (answered || !current) return

        setSelected(optionIndex)
        onMarkProgress(current.id)
    }

    // Trạng thái màu cho từng đáp án — dùng tông hồng/xanh lá/đỏ nhẹ, không rực rỡ
    const optionClass = (optionIndex) => {
        if (!answered) {
            return 'card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm hover:border-blossom-accent/50 hover:bg-blossom-card-soft dark:border-white/10 dark:bg-blossom-card-dark/60 dark:hover:bg-blossom-card-soft-dark'
        }

        if (optionIndex === current.answer) {
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        }

        if (optionIndex === selected) {
            return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
        }

        return 'card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm-soft text-blossom-muted dark:border-blossom-border-dark dark:bg-blossom-card-soft-dark dark:text-blossom-muted-dark'
    }

    if (!current) {
        return (
            <div className="rounded-2xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm p-10 text-center text-blossom-muted dark:border-white/10 dark:bg-blossom-card-dark/60 dark:text-blossom-muted-dark">
                Chưa có câu hỏi để ôn tập.
            </div>
        )
    }

    return (
        <div className="space-y-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>

          <span className="text-xs font-semibold uppercase tracking-wider text-blossom-accent dark:text-blossom-accent-dark">
            Practice Mode
          </span>

                    <h1 className="mt-1 text-2xl font-medium text-blossom-text dark:text-blossom-text-dark">
                        Ôn tập theo chương
                    </h1>

                    <p className="mt-1 text-sm text-blossom-muted dark:text-blossom-muted-dark">
                        Chọn đáp án để xem ngay kết quả và lời giải.
                    </p>
                </div>

                {/* Input focus ring đổi màu hồng — micro-interaction mục 4 */}
                <select
                    value={chapter}
                    onChange={(e) => chooseChapter(e.target.value)}
                    className="rounded-xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-blossom-text outline-none transition-colors focus:border-blossom-accent focus:ring-2 focus:ring-blossom-accent/20 dark:border-white/10 dark:bg-blossom-card-dark/60 dark:text-blossom-text-dark dark:focus:border-blossom-accent-dark dark:focus:ring-blossom-accent-dark/20"
                >
                    <option value="all">Tất cả chương</option>

                    {chapterOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">

                <section className="rounded-2xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 dark:border-white/10 dark:bg-blossom-card-dark/60 sm:p-7">

                    <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-blossom-muted dark:text-blossom-muted-dark">
                            Câu {index + 1}/{filtered.length}
                        </div>

                        <button
                            onClick={() =>
                                onToggleBookmark(current.id)
                            }
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:scale-[1.015] active:scale-[0.985] ${
                                bookmarks.includes(current.id)
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                    : 'bg-blossom-card-soft text-blossom-muted hover:text-blossom-text dark:bg-blossom-card-soft-dark dark:text-blossom-muted-dark dark:hover:text-blossom-text-dark'
                            }`}
                        >
                            {bookmarks.includes(current.id) ? (
                                <BookmarkCheck size={17} />
                            ) : (
                                <Bookmark size={17} />
                            )}

                            {bookmarks.includes(current.id)
                                ? 'Đã đánh dấu'
                                : 'Đánh dấu câu khó'}
                        </button>
                    </div>

                    <div className="mt-6 rounded-xl bg-blossom-card-soft p-4 text-xs font-semibold text-blossom-accent dark:bg-blossom-card-soft-dark dark:text-blossom-accent-dark">
                        {current.chapterName}
                    </div>

                    <h2 className="mt-5 text-xl font-bold leading-8 text-blossom-text dark:text-blossom-text-dark">
                        {current.question}
                    </h2>

                    <div className="mt-6 space-y-3">

                        {current.options.map(
                            (option, optionIndex) => (
                                <button
                                    key={option}
                                    disabled={answered}
                                    onClick={() =>
                                        handleAnswer(optionIndex)
                                    }
                                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                                        !answered ? 'hover:scale-[1.008]' : ''
                                    } ${optionClass(
                                        optionIndex,
                                    )} ${
                                        answered &&
                                        optionIndex === current.answer
                                            ? 'animate-pop'
                                            : ''
                                    }`}
                                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blossom-card text-xs font-bold ring-1 ring-blossom-border dark:bg-blossom-card-dark dark:ring-blossom-border-dark">
                    {String.fromCharCode(
                        65 + optionIndex,
                    )}
                  </span>

                                    <span className="pt-1">
                    {option}
                  </span>

                                    {answered &&
                                        optionIndex ===
                                        current.answer && (
                                            <CircleCheck
                                                size={20}
                                                className="ml-auto mt-1 shrink-0 text-emerald-600 dark:text-emerald-400"
                                            />
                                        )}

                                    {answered &&
                                        optionIndex === selected &&
                                        optionIndex !== current.answer && (
                                            <CircleX
                                                size={20}
                                                className="ml-auto mt-1 shrink-0 text-rose-600 dark:text-rose-400"
                                            />
                                        )}
                                </button>
                            ),
                        )}
                    </div>

                    {answered && (
                        <div
                            className={`mt-6 rounded-xl border p-5 animate-fade-in-up ${
                                selected === current.answer
                                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                                    : 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30'
                            }`}
                        >
                            <div className="font-bold text-blossom-text dark:text-blossom-text-dark">
                                {selected === current.answer
                                    ? 'Chính xác!'
                                    : 'Chưa đúng'}
                            </div>

                            <div className="mt-1 text-sm text-blossom-text/80 dark:text-blossom-text-dark/80">
                                Đáp án đúng:{' '}
                                <strong>
                                    {current.options[current.answer]}
                                </strong>
                            </div>

                            <div className="mt-4 border-t border-black/5 pt-4 text-sm leading-6 text-blossom-text/80 dark:border-white/10 dark:text-blossom-text-dark/80">
                                <strong>Lời giải thích:</strong>{' '}
                                {current.explanation}
                            </div>
                        </div>
                    )}

                    <div className="mt-7 flex items-center justify-between gap-3">

                        <button
                            disabled={index === 0}
                            onClick={() => go(index - 1)}
                            className="inline-flex items-center gap-2 rounded-xl border border-blossom-border px-4 py-2.5 text-sm font-medium text-blossom-text transition-all hover:scale-[1.015] hover:bg-blossom-card-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:border-blossom-border-dark dark:text-blossom-text-dark dark:hover:bg-blossom-card-soft-dark"
                        >
                            <ChevronLeft size={17} />
                            Câu trước
                        </button>

                        <button
                            disabled={index === filtered.length - 1}
                            onClick={() => go(index + 1)}
                            className="inline-flex items-center gap-2 rounded-xl bg-blossom-accent px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.015] hover:bg-blossom-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:bg-blossom-accent-dark dark:hover:bg-blossom-accent-dark-hover"
                        >
                            Câu tiếp
                            <ChevronRight size={17} />
                        </button>

                    </div>
                </section>

                <aside className="h-fit rounded-2xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 dark:border-white/10 dark:bg-blossom-card-dark/60">

                    <h3 className="flex items-center gap-2 font-bold text-blossom-text dark:text-blossom-text-dark">
                        <LayoutGrid size={17} className="text-blossom-gold dark:text-blossom-gold-dark" />
                        Danh sách câu
                    </h3>

                    <div className="mt-4 grid grid-cols-5 gap-2">

                        {filtered.map((q, qIndex) => (
                            <button
                                key={q.id}
                                onClick={() => go(qIndex)}
                                className={`relative aspect-square rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.985] ${
                                    qIndex === index
                                        ? 'bg-blossom-accent text-white dark:bg-blossom-accent-dark'
                                        : 'bg-blossom-card-soft text-blossom-muted hover:text-blossom-text dark:bg-blossom-card-soft-dark dark:text-blossom-muted-dark dark:hover:text-blossom-text-dark'
                                } ${
                                    bookmarks.includes(q.id)
                                        ? 'ring-2 ring-amber-300 ring-offset-1 dark:ring-offset-blossom-card-dark'
                                        : ''
                                }`}
                            >
                                {qIndex + 1}
                            </button>
                        ))}

                    </div>

                    <div className="mt-4 text-xs text-blossom-muted dark:text-blossom-muted-dark">
                        Viền vàng = câu đã đánh dấu.
                    </div>
                </aside>
            </div>
        </div>
    )
}
