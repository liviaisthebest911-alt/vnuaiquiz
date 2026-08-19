import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Flag,
    Send,
    XCircle,
} from 'lucide-react'

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
        <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">

                {correct ? (
                    <CheckCircle2
                        className="mt-0.5 shrink-0 text-emerald-600"
                        size={20}
                    />
                ) : (
                    <XCircle
                        className="mt-0.5 shrink-0 text-rose-600"
                        size={20}
                    />
                )}

                <div className="min-w-0">

                    <div className="text-xs font-semibold text-slate-500">
                        Câu {question.number}
                    </div>

                    <div className="mt-1 font-semibold leading-6 text-slate-900">
                        {question.question}
                    </div>

                    <div className="mt-3 text-sm text-slate-600">
                        Bạn chọn:{' '}
                        <strong>
                            {answer === null
                                ? 'Chưa trả lời'
                                : question.options[answer]}
                        </strong>
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                        Đáp án đúng:{' '}
                        <strong className="text-emerald-700">
                            {question.options[question.answer]}
                        </strong>
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
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

                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-soft sm:p-10">

                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                        <Clock3 size={30} />
                    </div>

                    <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-blue-600">
                        Exam Mode
                    </div>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900">
                        Thi thử 30 phút
                    </h1>

                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                        Đề được lấy ngẫu nhiên từ toàn bộ
                        ngân hàng câu hỏi. Bạn có{' '}
                        {EXAM_MINUTES} phút để hoàn thành.
                    </p>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">

                        <div className="rounded-xl bg-slate-50 p-4">
                            <div className="text-2xl font-bold">
                                {actualSize}
                            </div>
                            <div className="text-xs text-slate-500">
                                Câu trong đề
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                            <div className="text-2xl font-bold">
                                30'
                            </div>
                            <div className="text-xs text-slate-500">
                                Thời gian
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                            <div className="text-2xl font-bold">
                                10
                            </div>
                            <div className="text-xs text-slate-500">
                                Thang điểm
                            </div>
                        </div>

                    </div>

                    {questions.length <
                        EXAM_SIZE && (
                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800">

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
                        className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-blue-700"
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

                <section className="rounded-3xl bg-white p-6 shadow-soft sm:p-8">

                    <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                        Kết quả
                    </div>

                    <div className="mt-3 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">

                        <div className="grid h-32 w-32 place-items-center rounded-full border-8 border-blue-100 bg-blue-50">
                            <div className="text-center">

                                <div className="text-4xl font-black text-blue-700">
                                    {result.score.toFixed(1)}
                                </div>

                                <div className="text-xs text-slate-500">
                                    / 10
                                </div>

                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Bạn hoàn thành bài thi!
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Đúng {result.correct}/
                                {result.totalQuestions} câu ·
                                Độ chính xác {result.accuracy}%
                            </p>

                            <button
                                onClick={startExam}
                                className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                            >
                                Làm đề mới
                            </button>
                        </div>

                    </div>
                </section>

                <section className="space-y-3">

                    <h2 className="text-lg font-bold text-slate-900">
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

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7">

                <div className="flex flex-wrap items-center justify-between gap-3">

                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                            Thi thử
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                            Câu {current + 1}/
                            {preparedQuestions.length}
                        </div>
                    </div>

                    <div
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm font-bold ${
                            minutesWarning
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                        <Clock3 size={18} />
                        {formatTime(secondsLeft)}
                    </div>

                </div>

                <div className="mt-7 text-xl font-bold leading-8 text-slate-900">
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
                                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm font-medium transition ${
                                        selected
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                                            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
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
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:opacity-30"
                    >
                        Câu trước
                    </button>

                    {current ===
                    preparedQuestions.length - 1 ? (
                        <button
                            onClick={() =>
                                setConfirmSubmit(true)
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
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
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            Câu tiếp
                        </button>
                    )}

                </div>
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-soft lg:sticky lg:top-24">

                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">
                        Danh sách câu
                    </h3>

                    <span className="text-xs text-slate-500">
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
                                className={`aspect-square rounded-lg text-xs font-bold transition ${
                                    current === index
                                        ? 'bg-blue-600 text-white'
                                        : answers[item.id] !== undefined
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                                }`}
                            >
                                {index + 1}
                            </button>
                        ),
                    )}

                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    Xanh lá = đã trả lời · Xanh dương = câu hiện tại.
                </div>

                <button
                    onClick={() =>
                        setConfirmSubmit(true)
                    }
                    className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                    Nộp bài
                </button>

            </aside>

            {confirmSubmit && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">

                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

                        <div className="flex items-start gap-3">

                            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                                <AlertTriangle size={20} />
                            </div>

                            <div>

                                <h3 className="font-bold">
                                    Xác nhận nộp bài?
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
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
                                className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
                            >
                                Tiếp tục làm
                            </button>

                            <button
                                onClick={submit}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
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