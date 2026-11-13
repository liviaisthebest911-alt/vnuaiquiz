import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Flag,
    LayoutGrid,
    ListChecks,
    Send,
    Sparkles,
    Trophy,
    XCircle,
} from 'lucide-react'

import confetti from 'canvas-confetti'
import { questionKey } from '../utils/questionKey'
import Mascot from './Mascot'

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
        <div className="rounded-xl border border-blossom-border bg-blossom-card p-5 dark:border-blossom-border-dark dark:bg-blossom-card-dark">
            <div className="flex items-start gap-3">

                {correct ? (
                    <CheckCircle2
                        className="mt-0.5 shrink-0 text-cloud-ink"
                        size={20}
                    />
                ) : (
                    <XCircle
                        className="mt-0.5 shrink-0 text-petal-ink"
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
                        <strong className="text-cloud-ink">
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
            colors: ['#A9D8F5', '#F5C9D6', '#E9E3F8', '#FFFFFF'],
        })

        // Bắn thêm 1 đợt nhỏ lệch 2 bên cho hiệu ứng "confetti cannon"
        const timer = window.setTimeout(() => {
            confetti({
                particleCount: 60,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.7 },
                colors: ['#A9D8F5', '#F5C9D6'],
            })

            confetti({
                particleCount: 60,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.7 },
                colors: ['#A9D8F5', '#F5C9D6'],
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
                // id chỉ duy nhất trong chương → đáp án phải gắn với questionKey
                key: questionKey(q),
                number: index + 1,
            })),
        [examQuestions],
    )

    const submit = () => {
        const correct =
            preparedQuestions.reduce(
                (sum, q) =>
                    sum +
                    (answers[q.key] === q.answer
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

                <div className="rounded-3xl border border-blossom-border bg-blossom-card p-6 text-center dark:border-blossom-border-dark dark:bg-blossom-card-dark sm:p-10">

                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-petal-soft text-petal-ink">
                        <Clock3 size={30} />
                    </div>

                    <div className="mt-5 text-xs font-bold uppercase tracking-wider text-cloud-ink">
                        Chế độ thi
                    </div>

                    <h1 className="mt-2 text-3xl font-extrabold text-blossom-text">
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
                            <div className="mt-5 flex items-start gap-3 rounded-xl bg-lilac p-4 text-left text-sm text-lilac-ink">

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
                        className="mt-7 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-blossom-accent px-7 text-[15px] font-bold text-[rgb(var(--c-on-cta))] transition-all hover:scale-[1.02] hover:bg-blossom-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
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

                <section className="rounded-3xl border border-blossom-border bg-blossom-card p-6 dark:border-blossom-border-dark dark:bg-blossom-card-dark sm:p-8">

                    <div className="text-xs font-bold uppercase tracking-wider text-cloud-ink">
                        Kết quả
                    </div>

                    <div className="mt-3 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">

                        <div className="grid h-32 w-32 place-items-center rounded-full border-8 border-cloud bg-cloud-soft">
                            <div className="text-center">

                                <div className="font-display text-4xl font-extrabold text-blossom-text">
                                    {result.score.toFixed(1)}
                                </div>

                                <div className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
                                    / 10
                                </div>

                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-3">
                                <Mascot size={56} mood={result.score >= 5 ? 'success' : 'encourage'} />
                                <h1 className="text-2xl font-extrabold text-blossom-text">
                                    Bạn hoàn thành bài thi!
                                </h1>
                            </div>

                            <p className="mt-2 text-sm text-blossom-muted dark:text-blossom-muted-dark">
                                Đúng {result.correct}/
                                {result.totalQuestions} câu ·
                                Độ chính xác {result.accuracy}%
                            </p>

                            <p className="mt-1 text-sm text-blossom-text">
                                {result.score >= 5 ? 'Làm tốt lắm! Xem lại các câu sai để chắc hơn nhé.' : 'Không sao đâu, xem lại lời giải rồi thử đề mới nhé.'}
                            </p>

                            <button
                                onClick={startExam}
                                className="mt-5 min-h-[44px] rounded-full bg-blossom-accent px-5 text-sm font-bold text-[rgb(var(--c-on-cta))] transition-all hover:scale-[1.02] hover:bg-blossom-accent-hover active:scale-[0.97]"
                            >
                                Làm đề mới
                            </button>
                        </div>

                    </div>

                    {result.score >= 8 && (
                        <div className="mt-6 flex items-center gap-4 overflow-hidden rounded-xl border border-petal-line bg-petal-soft p-4">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-petal text-[#283746]">
                                <Trophy size={22} />
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5 font-semibold text-blossom-text dark:text-blossom-text-dark">
                                    Xuất sắc!
                                    <Sparkles size={15} className="text-blossom-gold dark:text-blossom-gold-dark" />
                                </div>
                                <p className="text-sm text-blossom-muted dark:text-blossom-muted-dark">
                                    Bạn nằm trong nhóm điểm cao — hãy giữ phong độ này ở đề tiếp theo!
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                <section className="space-y-3">

                    <h2 className="flex items-center gap-2 text-lg font-bold text-blossom-text dark:text-blossom-text-dark">
                        <ListChecks size={19} className="text-cloud-ink" />
                        Xem lại chi tiết
                    </h2>

                    {preparedQuestions.map((q) => (
                        <ReviewItem
                            key={q.key}
                            question={q}
                            answer={
                                result.answers[q.key] ?? null
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

            <section className="rounded-2xl border border-blossom-border bg-blossom-card p-5 dark:border-blossom-border-dark dark:bg-blossom-card-dark sm:p-7">

                <div className="flex flex-wrap items-center justify-between gap-3">

                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-cloud-ink">
                            Thi thử
                        </div>

                        <div className="mt-1 text-sm text-blossom-muted dark:text-blossom-muted-dark">
                            Câu {current + 1}/
                            {preparedQuestions.length}
                        </div>
                    </div>

                    <div
                        className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 font-mono text-sm font-bold tabular-nums transition-colors ${
                            minutesWarning
                                ? 'bg-petal-soft text-petal-ink'
                                : 'bg-blossom-card-soft text-blossom-text dark:bg-blossom-card-soft-dark dark:text-blossom-text-dark'
                        }`}
                    >
                        <Clock3 size={18} />
                        {formatTime(secondsLeft)}
                    </div>

                </div>

                <div className="mt-7 font-display text-xl font-extrabold leading-8 text-blossom-text sm:text-[22px]">
                    {q.question}
                </div>

                <div className="mt-6 space-y-3">

                    {q.options.map(
                        (option, optionIndex) => {
                            const selected =
                                answers[q.key] === optionIndex

                            return (
                                <button
                                    key={option}
                                    onClick={() =>
                                        setAnswers(
                                            (old) => ({
                                                ...old,
                                                [q.key]:
                                                optionIndex,
                                            }),
                                        )
                                    }
                                    className={`flex w-full items-start gap-3 rounded-2xl border-[1.5px] p-4 text-left text-[15px] font-medium transition-all ${
                                        selected
                                            ? 'border-cloud-deep bg-cloud-soft ring-2 ring-cloud/60'
                                            : 'border-blossom-border hover:border-cloud hover:bg-cloud-soft'
                                    }`}
                                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-blossom-card text-[13px] font-bold ring-1 ring-blossom-border">
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
                        className="min-h-[48px] rounded-full border border-blossom-border bg-blossom-card px-5 text-sm font-semibold text-blossom-text transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30 disabled:hover:scale-100"
                    >
                        Câu trước
                    </button>

                    {current ===
                    preparedQuestions.length - 1 ? (
                        <button
                            onClick={() =>
                                setConfirmSubmit(true)
                            }
                            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-blossom-accent px-5 text-sm font-bold text-[rgb(var(--c-on-cta))] transition-all hover:scale-[1.02] hover:bg-blossom-accent-hover active:scale-[0.97]"
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
                            className="min-h-[48px] rounded-full bg-blossom-accent px-5 text-sm font-bold text-[rgb(var(--c-on-cta))] transition-all hover:scale-[1.02] hover:bg-blossom-accent-hover active:scale-[0.97]"
                        >
                            Câu tiếp
                        </button>
                    )}

                </div>
            </section>

            <aside className="h-fit rounded-2xl border border-blossom-border bg-blossom-card p-5 dark:border-blossom-border-dark dark:bg-blossom-card-dark lg:sticky lg:top-24">

                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold text-blossom-text dark:text-blossom-text-dark">
                        <LayoutGrid size={17} className="text-cloud-ink" />
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
                                key={item.key}
                                onClick={() =>
                                    setCurrent(index)
                                }
                                aria-current={current === index ? 'step' : undefined}
                                data-answered={answers[item.key] !== undefined}
                                className={`aspect-square rounded-xl border text-[13px] font-bold transition-all hover:scale-[1.06] active:scale-[0.97] ${
                                    current === index
                                        ? 'border-blossom-accent bg-blossom-accent text-[rgb(var(--c-on-cta))]'
                                        : answers[item.key] !== undefined
                                            ? 'border-cloud bg-cloud-soft text-cloud-ink'
                                            : 'border-blossom-border bg-blossom-bg text-blossom-muted hover:text-blossom-text'
                                }`}
                            >
                                {index + 1}
                            </button>
                        ),
                    )}

                </div>

                <div className="mt-5 border-t border-blossom-border pt-4 text-xs text-blossom-muted dark:border-blossom-border-dark dark:text-blossom-muted-dark">
                    Xanh nhạt = đã trả lời · Ô đậm = câu hiện tại.
                </div>

                <button
                    onClick={() =>
                        setConfirmSubmit(true)
                    }
                    className="mt-4 min-h-[44px] w-full rounded-full border border-petal-line bg-petal-soft px-4 text-sm font-bold text-petal-ink transition-all hover:scale-[1.02] active:scale-[0.97]"
                >
                    Nộp bài
                </button>

            </aside>

            {confirmSubmit && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(18_27_37/.4)] p-4 backdrop-blur-sm">

                    <div className="w-full max-w-md rounded-2xl bg-blossom-card p-6 shadow-soft animate-fade-in-up dark:bg-blossom-card-dark dark:shadow-soft-dark">

                        <div className="flex items-start gap-3">

                            <div className="rounded-xl bg-lilac p-2 text-lilac-ink">
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
                                className="min-h-[44px] rounded-full px-4 text-sm font-semibold text-blossom-text transition-colors hover:bg-blossom-card-soft"
                            >
                                Tiếp tục làm
                            </button>

                            <button
                                onClick={submit}
                                className="min-h-[44px] rounded-full bg-blossom-accent px-5 text-sm font-bold text-[rgb(var(--c-on-cta))] transition-all hover:scale-[1.02] hover:bg-blossom-accent-hover active:scale-[0.97]"
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
