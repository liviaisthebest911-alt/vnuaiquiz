import {
    Bookmark,
    BookmarkCheck,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    CircleCheck,
    LayoutGrid,
} from 'lucide-react'

import { useMemo, useState } from 'react'
import { questionKey } from '../utils/questionKey'
import Mascot from './Mascot'
import QuestionMap from './QuestionMap'

const pill = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100'

export default function Practice({
                                     questions,
                                     bookmarks,
                                     onToggleBookmark,
                                     onMarkProgress,
                                     progress = [],
                                     resume = false,
                                     initialChapter,
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

    const [chapter, setChapter] = useState(() => chapterOptions.some(([position]) => String(position) === initialChapter) ? initialChapter : 'all')
    const [index, setIndex] = useState(() => {
        if (!resume) return 0
        const initial = chapter === 'all' ? questions : questions.filter((question) => question.chapter === Number(chapter))
        const completed = new Set(progress)
        return Math.max(0, initial.findIndex((question) => !completed.has(questionKey(question))))
    })
    const [selected, setSelected] = useState(null)
    const [mapOpen, setMapOpen] = useState(false)

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
    const done = new Set(progress)
    const marked = new Set(bookmarks)

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
        onMarkProgress(questionKey(current))
    }

    const optionClass = (optionIndex) => {
        if (!answered) return ''
        if (optionIndex === current.answer) return ' is-correct'
        if (optionIndex === selected) return ' is-wrong'
        return ' opacity-60'
    }

    if (!current) {
        return (
            <div className="study-empty justify-center p-10">
                <Mascot size={48} />
                Chưa có câu hỏi để ôn tập.
            </div>
        )
    }

    const isMarked = marked.has(questionKey(current))
    const correct = selected === current.answer
    const map = (id) => (
        <QuestionMap id={id} current={index} showMarked
                     items={filtered.map((q) => ({ key: questionKey(q), answered: done.has(questionKey(q)), marked: marked.has(questionKey(q)) }))}
                     onSelect={(position) => { go(position); setMapOpen(false) }} />
    )

    return (
        <div className="space-y-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-blossom-text sm:text-[34px]">
                        Ôn tập theo chương
                    </h1>
                    <p className="mt-1 text-blossom-muted">
                        Chọn đáp án để xem ngay kết quả và lời giải.
                    </p>
                </div>

                <label className="grid w-full min-w-0 gap-1.5 text-[13px] font-semibold text-blossom-muted sm:w-80 sm:flex-none">
                    Chương
                    <select
                        aria-label="Chương ôn tập"
                        value={chapter}
                        onChange={(e) => chooseChapter(e.target.value)}
                        className="min-h-[48px] w-full min-w-0 rounded-xl border border-blossom-border bg-blossom-card px-3.5 text-[15px] font-medium text-blossom-text outline-none transition-colors focus:border-cloud-deep focus:ring-2 focus:ring-cloud-deep/25"
                    >
                        <option value="all">Tất cả chương</option>

                        {chapterOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">

                <section aria-label="Câu hỏi" className="study-question rounded-2xl border border-blossom-border bg-blossom-card p-4 sm:p-7">

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
                        <span className="font-bold tabular-nums">
                            Câu {index + 1}<span className="font-medium text-blossom-muted">/{filtered.length}</span>
                        </span>
                        <span className="bar order-last w-full sm:order-none sm:w-auto sm:flex-1" aria-hidden="true">
                            <i style={{ width: `${(index + 1) / filtered.length * 100}%` }} />
                        </span>
                        <button type="button" aria-expanded={mapOpen} aria-controls="practice-map-mobile" onClick={() => setMapOpen(!mapOpen)}
                                className={`${pill} border border-blossom-border px-3 lg:hidden`}>
                            <LayoutGrid size={17} aria-hidden="true" />
                            Danh sách câu
                        </button>
                        <button
                            type="button"
                            aria-label={isMarked ? 'Đã đánh dấu' : 'Đánh dấu câu khó'}
                            aria-pressed={isMarked}
                            onClick={() =>
                                onToggleBookmark(questionKey(current))
                            }
                            className={`${pill} ml-auto min-w-[44px] border px-3 sm:px-4 ${isMarked ? 'border-petal-line bg-petal-soft text-petal-ink' : 'border-blossom-border text-blossom-text'}`}
                        >
                            {isMarked ? (
                                <BookmarkCheck size={17} aria-hidden="true" />
                            ) : (
                                <Bookmark size={17} aria-hidden="true" />
                            )}

                            <span className="hidden sm:inline">
                                {isMarked
                                    ? 'Đã đánh dấu'
                                    : 'Đánh dấu câu khó'}
                            </span>
                        </button>
                    </div>

                    {mapOpen && <div className="rounded-2xl border border-blossom-border bg-blossom-bg p-3 lg:hidden">{map('practice-map-mobile')}</div>}

                    <span className="chip chip-lilac justify-self-start">
                        {current.chapterName}
                    </span>

                    <h2 className="text-xl font-extrabold leading-relaxed sm:text-[23px]">
                        {current.question}
                    </h2>

                    <div className="space-y-3">

                        {current.options.map(
                            (option, optionIndex) => (
                                <button
                                    type="button"
                                    key={`${questionKey(current)}-${optionIndex}`}
                                    onClick={() => handleAnswer(optionIndex)}
                                    disabled={answered}
                                    className={`study-option w-full text-left text-[15px] font-medium disabled:cursor-default${optionClass(optionIndex)}`}
                                >
                                    <span className={`grid h-8 w-8 flex-none place-items-center rounded-[10px] border text-[13px] font-bold ${
                                        answered && optionIndex === current.answer ? 'border-blossom-accent bg-blossom-accent text-[rgb(var(--c-on-cta))]' : 'border-blossom-border bg-blossom-card'}`}>
                                        {String.fromCharCode(65 + optionIndex)}
                                    </span>

                                    <span>{option}</span>

                                    {answered &&
                                        optionIndex ===
                                        current.answer && (
                                            <CircleCheck size={20} className="flex-none" aria-label="Đáp án đúng" />
                                        )}

                                    {answered &&
                                        optionIndex === selected &&
                                        optionIndex !== current.answer && (
                                            <CircleAlert size={20} className="flex-none" aria-label="Bạn chọn, chưa đúng" />
                                        )}
                                </button>
                            ),
                        )}
                    </div>

                    {answered && (
                        <div role="status" className={`study-feedback ${correct ? 'is-correct' : 'is-wrong'}`}>
                            <Mascot size={56} mood={correct ? 'success' : 'encourage'} />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="study-feedback-title">
                                    {correct ? 'Chính xác!' : 'Chưa đúng'}
                                </div>
                                <p className="text-sm text-blossom-muted">{correct ? 'Giỏi lắm, sang câu tiếp nào!' : 'Không sao đâu, đọc lời giải rồi thử câu tiếp nhé.'}</p>
                                <div className="text-sm">
                                    Đáp án đúng:{' '}
                                    <strong>
                                        {current.options[current.answer]}
                                    </strong>
                                </div>
                                <div className={`mt-2 border-t pt-3 text-sm leading-6 ${correct ? 'border-cloud' : 'border-petal-line'}`}>
                                    <strong>Lời giải thích:</strong>{' '}
                                    {current.explanation}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
                        <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => go(index - 1)}
                            className={`${pill} min-h-[48px] border border-blossom-border bg-blossom-card px-4 text-blossom-text`}
                        >
                            <ChevronLeft size={17} aria-hidden="true" />
                            Câu trước
                        </button>
                        <button
                            type="button"
                            disabled={index === filtered.length - 1}
                            onClick={() => go(index + 1)}
                            className={`${pill} min-h-[48px] bg-blossom-accent px-4 font-bold text-[rgb(var(--c-on-cta))] hover:bg-blossom-accent-hover`}
                        >
                            Câu tiếp
                            <ChevronRight size={17} aria-hidden="true" />
                        </button>
                    </div>
                </section>
                <aside className="hidden rounded-2xl border border-blossom-border bg-blossom-card p-5 lg:block">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 font-extrabold">
                            <LayoutGrid size={17} className="text-cloud-ink" aria-hidden="true" />
                            Danh sách câu
                        </h3>
                        <span className="text-[13px] text-blossom-muted">{filtered.filter((q) => done.has(questionKey(q))).length} đã làm</span>
                    </div>
                    {map('practice-map')}
                </aside>
            </div>
        </div>
    )
}
