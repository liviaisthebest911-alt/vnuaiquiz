import {
    Bookmark,
    BookmarkCheck,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleX,
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

    const optionClass = (optionIndex) => {
        if (!answered) {
            return 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
        }

        if (optionIndex === current.answer) {
            return 'border-emerald-300 bg-emerald-50 text-emerald-800'
        }

        if (optionIndex === selected) {
            return 'border-rose-300 bg-rose-50 text-rose-800'
        }

        return 'border-slate-200 bg-slate-50 text-slate-500'
    }

    if (!current) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                Chưa có câu hỏi để ôn tập.
            </div>
        )
    }

    return (
        <div className="space-y-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>

          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Practice Mode
          </span>

                    <h1 className="mt-1 text-2xl font-bold text-slate-900">
                        Ôn tập theo chương
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Chọn đáp án để xem ngay kết quả và lời giải.
                    </p>
                </div>

                <select
                    value={chapter}
                    onChange={(e) => chooseChapter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7">

                    <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-slate-500">
                            Câu {index + 1}/{filtered.length}
                        </div>

                        <button
                            onClick={() =>
                                onToggleBookmark(current.id)
                            }
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                bookmarks.includes(current.id)
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

                    <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs font-semibold text-blue-700">
                        {current.chapterName}
                    </div>

                    <h2 className="mt-5 text-xl font-bold leading-8 text-slate-900">
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
                                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm font-medium transition ${optionClass(
                                        optionIndex,
                                    )} ${
                                        answered &&
                                        optionIndex === current.answer
                                            ? 'animate-pop'
                                            : ''
                                    }`}
                                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold shadow-sm ring-1 ring-slate-200">
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
                                                className="ml-auto mt-1 shrink-0 text-emerald-600"
                                            />
                                        )}

                                    {answered &&
                                        optionIndex === selected &&
                                        optionIndex !== current.answer && (
                                            <CircleX
                                                size={20}
                                                className="ml-auto mt-1 shrink-0 text-rose-600"
                                            />
                                        )}
                                </button>
                            ),
                        )}
                    </div>

                    {answered && (
                        <div
                            className={`mt-6 rounded-xl border p-5 ${
                                selected === current.answer
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : 'border-rose-200 bg-rose-50'
                            }`}
                        >
                            <div className="font-bold text-slate-900">
                                {selected === current.answer
                                    ? 'Chính xác!'
                                    : 'Chưa đúng'}
                            </div>

                            <div className="mt-1 text-sm text-slate-700">
                                Đáp án đúng:{' '}
                                <strong>
                                    {current.options[current.answer]}
                                </strong>
                            </div>

                            <div className="mt-4 border-t border-black/5 pt-4 text-sm leading-6 text-slate-700">
                                <strong>Lời giải thích:</strong>{' '}
                                {current.explanation}
                            </div>
                        </div>
                    )}

                    <div className="mt-7 flex items-center justify-between gap-3">

                        <button
                            disabled={index === 0}
                            onClick={() => go(index - 1)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
                        >
                            <ChevronLeft size={17} />
                            Câu trước
                        </button>

                        <button
                            disabled={index === filtered.length - 1}
                            onClick={() => go(index + 1)}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-blue-700"
                        >
                            Câu tiếp
                            <ChevronRight size={17} />
                        </button>

                    </div>
                </section>

                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

                    <h3 className="font-bold text-slate-900">
                        Danh sách câu
                    </h3>

                    <div className="mt-4 grid grid-cols-5 gap-2">

                        {filtered.map((q, qIndex) => (
                            <button
                                key={q.id}
                                onClick={() => go(qIndex)}
                                className={`relative aspect-square rounded-lg text-xs font-bold ${
                                    qIndex === index
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                                } ${
                                    bookmarks.includes(q.id)
                                        ? 'ring-2 ring-amber-300 ring-offset-1'
                                        : ''
                                }`}
                            >
                                {qIndex + 1}
                            </button>
                        ))}

                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                        Viền vàng = câu đã đánh dấu.
                    </div>
                </aside>
            </div>
        </div>
    )
}