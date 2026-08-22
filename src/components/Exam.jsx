import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Flag,
    Send,
    XCircle,
} from 'lucide-react'

import confetti from 'canvas-confetti'

import {
    useEffect,
    useMemo,
    useState,
} from 'react'

const EXAM_MINUTES = 30
const EXAM_SIZE = 40

function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5)
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')

    const s = (seconds % 60)
        .toString()
        .padStart(2, '0')

    return `${m}:${s}`
}

function ReviewItem({
                        question,
                        answer,
                    }) {
    const correct = answer === question.answer

    return (
        <div className="rounded-xl border border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 dark:border-white/10 dark:bg-blossom-card-dark/60">
            <div className="flex items-start gap-3">

                {correct ? (
                    <CheckCircle2
                        className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                        size={20}
                    />
                ) : (
                    <XCircle
                        className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400"
                        size={20}
                    />
                )}

                <div className="min-w-0">

                    <div className="text-xs font-semibold text-blossom-muted dark:text-blossom-muted-dark">
                        Câu {question.number}
                    </div>

                    <div className="mt-1 font-semibold leading-6 text-blossom-text dark:text-blossom-text-dark">
                        {question.question}
                    </div>

                    <div className="mt-3 text-sm text-blossom-text/80 dark:text-blossom-text-dark/80">
                        Bạn chọn:{' '}
                        <strong>
                            {answer === null
                                ? 'Chưa trả lời'
                                : question.options[answer]}
                        </strong>
                    </div>

                    <div className="mt-1 text-sm text-blossom-text/80 dark:text-blossom-text-dark/80">
                        Đáp án đúng:{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                            {question.options[question.answer]}
                        </strong>
                    </div>

                    <div className="mt-3 rounded-lg bg-blossom-card-soft p-3 text-sm leading-6 text-blossom-text/80 dark:bg-blossom-card-soft-dark dark:text-blossom-text-dark/80">
                        {question.explanation}
                    </div>

                </div>
            </div>
        </div>
    )
}

export default function Exam({
                                 questions,
                                 onFinish,
                             }) {
    const [started, setStarted] = useState(false)

    const [examQuestions, setExamQuestions] =
        useState([])

    const [answers, setAnswers] =
        useState({})

    const [current, setCurrent] =
        useState(0)

    const [secondsLeft, setSecondsLeft] =
        useState(EXAM_MINUTES * 60)

    const [result, setResult] =
        useState(null)

    const [confirmSubmit, setConfirmSubmit] =
        useState(false)

    // Bắn pháo hoa khi đạt điểm cao (>= 8/10) — chỉ bắn 1 lần khi result vừa xuất hiện
    useEffect(() => {
        if (!result || result.score < 8) {
            return
        }

        confetti({
            particleCount: 140,
            spread: 80,
            startVelocity: 45,
            origin: { y: 0.6 },
            colors: ['#FDA4AF', '#C9A66B', '#E8D9BC', '#FFFFFF'],
        })

        // Bắn thêm 1 đợt nhỏ lệch 2 bên cho hiệu ứng "confetti cannon"
        const timer = window.setTimeout(() => {
            confetti({
                particleCount: 60,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.7 },
                colors: ['#FDA4AF', '#C9A66B'],
            })

            confetti({
                particleCount: 60,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.7 },
                colors: ['#FDA4AF', '#C9A66B'],
            })
        }, 250)

        return () => window.clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result])

    const actualSize = Math.min(
        EXAM_SIZE,
        questions.length,
    )

    const preparedQuestions = useMemo(
        () =>
            examQuestions.map((q, index) => ({
                ...q,
                number: index + 1,
            })),
        [examQuestions],
    )

    const submit = () => {
        const correct =
            preparedQuestions.reduce(
                (sum, q) =>
                    sum +
                    (answers[q.id] === q.answer
                        ? 1
                        : 0),
                0,
            )

        const accuracy =
            preparedQuestions.length
                ? Math.round(
                    (correct /
                        preparedQuestions.length) *
                    100,
                )
                : 0

        const score =
            preparedQuestions.length
                ? (correct /
                    preparedQuestions.length) *
                10
                : 0

        const examResult = {
            id: crypto.randomUUID(),

            createdAt:
                new Date().toISOString(),

            totalQuestions:
            preparedQuestions.length,

            correct,

            accuracy,

            score,

            questions: preparedQuestions,

            answers,
        }

        setResult(examResult)

        onFinish(examResult)

        setConfirmSubmit(false)
    }

    useEffect(() => {
        if (!started || result) {
            return undefined
        }

        if (secondsLeft <= 0) {
            submit()

            return undefined
        }

        const timer =
            window.setInterval(
                () =>
                    setSecondsLeft(
                        (value) => value - 1,
                    ),
                1000,
            )

        return () =>
            window.clearInterval(timer)
    }, [
        started,
        secondsLeft,
        result,
    ])

    const startExam = () => {
        const picked = shuffle(questions).slice(
            0,
            EXAM_SIZE,
        )

        setExamQuestions(picked)
        setAnswers({})
        setCurrent(0)
        setSecondsLeft(EXAM_MINUTES * 60)
        setResult(null)
        setStarted(true)
    }

    if (!started) {
        return (
            <div className="mx-auto max-w-3xl">

                <div className="rounded-3xl border border-white/40 bg-blossom-card/60 backdrop-blur-sm p-6 text-center dark:border-white/10 dark:bg-blossom-card-dark/60 sm:p-10">

                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blossom-accent/10 text-blossom-accent dark:bg-blossom-accent-dark/15 dark:text-blossom-accent-dark">
                        <Clock3 size={30} />
                    </div>

                    <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-blossom-accent dark:text-blossom-accent-dark">
                        Exam Mode
                    </div>

                    <h1 className="mt-2 text-3xl font-medium text-blossom-text dark:text-blossom-text-dark">
                        Thi thử 30 phút
                    </h1>

                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-blossom-muted dark:text-blossom-muted-dark">
                        Đề được lấy ngẫu nhiên từ toàn bộ
                        ngân hàng câu hỏi. Bạn có{' '}
                        {EXAM_MINUTES} phút để hoàn thành.
                    </p>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">

                        <div className="rounded-xl bg-blossom-card-soft p-4 dark:bg-blossom-card-soft-dark">
                            <div className="text-2xl font-bold text-blossom-text dark:text-blossom-text-dark">
                                {actualSize}
                            </div>
                            <div className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
                                Câu trong đề
                            </div>
                        </div>

                        <div className="rounded-xl bg-blossom-card-soft p-4 dark:bg-blossom-card-soft-dark">
                            <div className="text-2xl font-bold text-blossom-text dark:text-blossom-text-dark">
                                30'
                            </div>
                            <div className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
                                Thời gian
                            </div>
                        </div>

                        <div className="rounded-xl bg-blossom-card-soft p-4 dark:bg-blossom-card-soft-dark">
                            <div className="text-2xl font-bold text-blossom-text dark:text-blossom-text-dark">
                                10
                            </div>
                            <div className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
                                Thang điểm
                            </div>
                        </div>

                    </div>

                    {questions.length <
                        EXAM_SIZE && (
                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">

                                <AlertTriangle
                                    className="mt-0.5 shrink-0"
                                    size={18}
                                />

                                <span>
                Ngân hàng hiện chỉ có{' '}
                                    {questions.length} câu, nên đề
                sẽ dùng {questions.length} câu.
                Hãy import thêm ít nhất 40 câu
                để có đề đủ 40 câu.
              </span>

                            </div>
                        )}

                    <button
                        disabled={questions.length === 0}
                        onClick={startExam}
                        className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-blossom-accent px-6 py-3 text-sm font-bold text-white transition-all hover:scale-[1.015] hover:bg-blossom-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:bg-blossom-accent-dark dark:hover:bg-blossom-accent-dark-hover"
                    >
                        <Flag size={18} />
                        Bắt đầu làm bài
                    </button>
                </div>
            </div>
        )
    }

    if (result) {
        return (
            <div className="space-y-5">

                <section className="rounded-3xl border border-white/40 bg-blossom-card/60 backdrop-blur-sm p-6 dark:border-white/10 dark:bg-blossom-card-dark/60 sm:p-8">

                    <div className="text-xs font-semibold uppercase tracking-wider text-blossom-accent dark:text-blossom-accent-dark">
                        Kết quả
                    </div>

                    <div className="mt-3 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">

                        <div className="grid h-32 w-32 place-items-center rounded-full border-8 border-blossom-accent/15 bg-blossom-accent/5 dark:border-blossom-accent-dark/20 dark:bg-blossom-accent-dark/10">
                            <div className="text-center">

                                <div className="text-4xl font-black text-blossom-accent dark:text-blossom-accent-dark">
                                    {result.score.toFixed(1)}
                                </div>

                                <div className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
                                    / 10
                                </div>

                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl font-medium text-blossom-text dark:text-blossom-text-dark">
                                Bạn hoàn thành bài thi!
                            </h1>

                            <p className="mt-2 text-sm text-blossom-muted dark:text-blossom-muted-dark">
                                Đúng {result.correct}/
                                {result.totalQuestions} câu ·
                                Độ chính xác {result.accuracy}%
                            </p>

                            <button
                                onClick={startExam}
                                className="mt-5 rounded-xl bg-blossom-accent px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.015] hover:bg-blossom-accent-hover dark:bg-blossom-accent-dark dark:hover:bg-blossom-accent-dark-hover"
                            >
                                Làm đề mới
                            </button>
                        </div>

                    </div>
                </section>

                <section className="space-y-3">

                    <h2 className="text-lg font-bold text-blossom-text dark:text-blossom-text-dark">
                        Xem lại chi tiết
                    </h2>

                    {preparedQuestions.map((q) => (
                        <ReviewItem
                            key={q.id}
                            question={q}
                            answer={
                                result.answers[q.id] ?? null
                            }
                        />
                    ))}

                </section>
            </div>
        )
    }

    const q = preparedQuestions[current]

    if (!q) return null

    const answeredCount =
        Object.keys(answers).length

    const minutesWarning =
        secondsLeft <= 5 * 60

    return (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">

            <section className="rounded-2xl border border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 dark:border-white/10 dark:bg-blossom-card-dark/60 sm:p-7">

                <div className="flex flex-wrap items-center justify-between gap-3">

                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-blossom-accent dark:text-blossom-accent-dark">
                            Thi thử
                        </div>

                        <div className="mt-1 text-sm text-blossom-muted dark:text-blossom-muted-dark">
                            Câu {current + 1}/
                            {preparedQuestions.length}
                        </div>
                    </div>

                    <div
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm font-bold transition-colors ${
                            minutesWarning
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                : 'bg-blossom-card-soft text-blossom-text dark:bg-blossom-card-soft-dark dark:text-blossom-text-dark'
                        }`}
                    >
                        <Clock3 size={18} />
                        {formatTime(secondsLeft)}
                    </div>

                </div>

                <div className="mt-7 text-xl font-bold leading-8 text-blossom-text dark:text-blossom-text-dark">
                    {q.question}
                </div>

                <div className="mt-6 space-y-3">

                    {q.options.map(
                        (option, optionIndex) => {
                            const selected =
                                answers[q.id] === optionIndex

                            return (
                                <button
                                    key={option}
                                    onClick={() =>
                                        setAnswers(
                                            (old) => ({
                                                ...old,
                                                [q.id]:
                                                optionIndex,
                                            }),
                                        )
                                    }
                                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-all hover:scale-[1.008] ${
                                        selected
                                            ? 'border-blossom-accent bg-blossom-accent/10 ring-2 ring-blossom-accent/20 dark:border-blossom-accent-dark dark:bg-blossom-accent-dark/15 dark:ring-blossom-accent-dark/20'
                                            : 'border-blossom-border hover:border-blossom-accent/40 hover:bg-blossom-card-soft dark:border-blossom-border-dark dark:hover:bg-blossom-card-soft-dark'
                                    }`}
                                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blossom-card text-xs font-bold ring-1 ring-blossom-border dark:bg-blossom-card-dark dark:ring-blossom-border-dark">
                    {String.fromCharCode(
                        65 + optionIndex,
                    )}
                  </span>

                                    <span className="pt-1 text-blossom-text dark:text-blossom-text-dark">
                    {option}
                  </span>
                                </button>
                            )
                        },
                    )}

                </div>

                <div className="mt-7 flex items-center justify-between gap-3">

                    <button
                        disabled={current === 0}
                        onClick={() =>
                            setCurrent(
                                (value) => value - 1,
                            )
                        }
                        className="rounded-xl border border-blossom-border px-4 py-2.5 text-sm font-medium text-blossom-text transition-all hover:scale-[1.015] disabled:opacity-30 disabled:hover:scale-100 dark:border-blossom-border-dark dark:text-blossom-text-dark"
                    >
                        Câu trước
                    </button>

                    {current ===
                    preparedQuestions.length - 1 ? (
                        <button
                            onClick={() =>
                                setConfirmSubmit(true)
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-blossom-accent px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.015] hover:bg-blossom-accent-hover dark:bg-blossom-accent-dark dark:hover:bg-blossom-accent-dark-hover"
                        >
                            <Send size={17} />
                            Nộp bài
                        </button>
                    ) : (
                        <button
                            onClick={() =>
                                setCurrent(
                                    (value) => value + 1,
                                )
                            }
                            className="rounded-xl bg-blossom-accent px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.015] hover:bg-blossom-accent-hover dark:bg-blossom-accent-dark dark:hover:bg-blossom-accent-dark-hover"
                        >
                            Câu tiếp
                        </button>
                    )}

                </div>
            </section>

            <aside className="h-fit rounded-2xl border border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 dark:border-white/10 dark:bg-blossom-card-dark/60 lg:sticky lg:top-24">

                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-blossom-text dark:text-blossom-text-dark">
                        Danh sách câu
                    </h3>

                    <span className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
            {answeredCount}/
                        {preparedQuestions.length}
          </span>
                </div>

                <div className="mt-4 grid grid-cols-5 gap-2">

                    {preparedQuestions.map(
                        (item, index) => (
                            <button
                                key={item.id}
                                onClick={() =>
                                    setCurrent(index)
                                }
                                className={`aspect-square rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.985] ${
                                    current === index
                                        ? 'bg-blossom-accent text-white dark:bg-blossom-accent-dark'
                                        : answers[item.id] !== undefined
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : 'bg-blossom-card-soft text-blossom-muted hover:text-blossom-text dark:bg-blossom-card-soft-dark dark:text-blossom-muted-dark dark:hover:text-blossom-text-dark'
                                }`}
                            >
                                {index + 1}
                            </button>
                        ),
                    )}

                </div>

                <div className="mt-5 border-t border-blossom-border pt-4 text-xs text-blossom-muted dark:border-blossom-border-dark dark:text-blossom-muted-dark">
                    Xanh lá = đã trả lời · Hồng = câu hiện tại.
                </div>

                <button
                    onClick={() =>
                        setConfirmSubmit(true)
                    }
                    className="mt-4 w-full rounded-xl border border-blossom-accent/30 bg-blossom-accent/10 px-4 py-2.5 text-sm font-bold text-blossom-accent transition-all hover:scale-[1.015] hover:bg-blossom-accent/15 dark:border-blossom-accent-dark/30 dark:bg-blossom-accent-dark/15 dark:text-blossom-accent-dark"
                >
                    Nộp bài
                </button>

            </aside>

            {confirmSubmit && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">

                    <div className="w-full max-w-md rounded-2xl bg-blossom-card p-6 shadow-soft animate-fade-in-up dark:bg-blossom-card-dark dark:shadow-soft-dark">

                        <div className="flex items-start gap-3">

                            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                <AlertTriangle size={20} />
                            </div>

                            <div>

                                <h3 className="font-bold text-blossom-text dark:text-blossom-text-dark">
                                    Xác nhận nộp bài?
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-blossom-muted dark:text-blossom-muted-dark">
                                    Bạn đã trả lời{' '}
                                    {answeredCount}/
                                    {preparedQuestions.length}{' '}
                                    câu. Sau khi nộp sẽ không thể chỉnh sửa.
                                </p>

                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">

                            <button
                                onClick={() =>
                                    setConfirmSubmit(false)
                                }
                                className="rounded-xl px-4 py-2.5 text-sm font-medium text-blossom-text transition-colors hover:bg-blossom-card-soft dark:text-blossom-text-dark dark:hover:bg-blossom-card-soft-dark"
                            >
                                Tiếp tục làm
                            </button>

                            <button
                                onClick={submit}
                                className="rounded-xl bg-blossom-accent px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.015] hover:bg-blossom-accent-hover dark:bg-blossom-accent-dark dark:hover:bg-blossom-accent-dark-hover"
                            >
                                Nộp bài
                            </button>

                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
