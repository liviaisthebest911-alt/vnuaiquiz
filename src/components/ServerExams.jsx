import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock, ClipboardList } from 'lucide-react'
import { api } from '../lib/api'
import { useStudyData } from '../hooks/useStudyData'
import { useExamTimer } from '../features/exam/useExamTimer'
import { card, muted, Notice, primary, secondary } from './ui'

function RequestStatus({ request }) {
    if (request.loading) return <p className="study-empty" role="status">Đang tải…</p>
    if (request.error) return <p className="study-alert" role="alert">{request.error.message} <button type="button" onClick={request.reload}>Thử lại</button></p>
    return null
}

export function ServerExams({ examId, session, navigateTo, onSignIn }) {
    const exam = useStudyData(session !== undefined ? examId ? `/exams/${encodeURIComponent(examId)}` : '/exams' : null, session?.user.id)
    const [historyPage, setHistoryPage] = useState(1)
    const history = useStudyData(session && !examId ? `/me/attempts?page=${historyPage}` : null, session?.user.id)
    const [starting, setStarting] = useState(false)
    const [startError, setStartError] = useState(null)

    async function start() {
        setStarting(true)
        setStartError(null)
        try {
            const { data } = await api(`/exams/${examId}/attempts`, { method: 'POST' })
            navigateTo(`/attempts/${data.id}`)
        } catch (error) {
            setStartError({ error: true, text: error.message })
        } finally {
            setStarting(false)
        }
    }

    if (examId) {
        const item = exam.data
        const isClosed = item?.closes_at && Date.parse(item.closes_at) <= Date.now()
        const noAttempts = item?.max_attempts != null && item.attempts_count >= item.max_attempts
        return (
            <div className="study-page">
                <button type="button" className="study-text-button" onClick={() => navigateTo('/exams')}><ArrowLeft size={16} /> Tất cả đề thi</button>
                <h1>{item?.title ?? 'Đề thi'}</h1>
                <RequestStatus request={exam} />
                {item && <section className={`${card} space-y-4`}>
                    <p className={muted}>{item.subject_name} · {item.question_count} câu · {item.duration_minutes} phút</p>
                    {item.description && <p>{item.description}</p>}
                    {item.closes_at && <p className={muted}>Đóng đề lúc {new Date(item.closes_at).toLocaleString('vi-VN')}</p>}
                    {item.max_attempts != null && <p className={muted}>Đã dùng {item.attempts_count}/{item.max_attempts} lượt</p>}
                    <Notice message={startError} />
                    {item.active_attempt_id ? <button type="button" className={primary} onClick={() => navigateTo(`/attempts/${item.active_attempt_id}`)}>Mở lượt làm bài <ArrowRight size={16} /></button>
                        : isClosed || noAttempts || item.question_count === 0
                            ? <p className="study-empty">{isClosed ? 'Đề thi đã đóng.' : noAttempts ? 'Bạn đã hết lượt làm.' : 'Đề thi chưa có câu hỏi.'}</p>
                            : session ? <button type="button" className={primary} disabled={starting} onClick={start}>{starting ? 'Đang mở đề…' : 'Bắt đầu làm bài'}</button>
                                : <button type="button" className={primary} onClick={onSignIn}>Đăng nhập để làm bài</button>}
                </section>}
            </div>
        )
    }

    return (
        <div className="study-page">
            <div className="study-home-heading">
                <h1>Thi thử</h1>
                <button type="button" className="study-outline" onClick={() => navigateTo('/exams?local=1')}>Thi thử 30 phút trên thiết bị này <ArrowRight size={16} /></button>
            </div>
            <RequestStatus request={exam} />
            {exam.data?.length === 0 && <p className="study-empty">Chưa có đề thi đã xuất bản.</p>}
            {exam.data?.length > 0 && <ul className="study-rows">
                {exam.data.map((item) => <li key={item.id}>
                    <button type="button" className="study-row" onClick={() => navigateTo(`/exams/${item.id}`)}>
                        <span className="study-row-icon"><ClipboardList size={20} /></span>
                        <span className="study-row-text"><strong>{item.title}</strong><small>{item.subject_name} · {item.question_count} câu · {item.duration_minutes} phút</small></span>
                        <ArrowRight size={16} />
                    </button>
                </li>)}
            </ul>}
            {session && <section>
                <div className="study-section-heading"><h2>Lượt thi theo tài khoản</h2></div>
                <RequestStatus request={history} />
                {history.data?.length === 0 && <p className="study-empty">Bạn chưa làm đề thi nào bằng tài khoản này.</p>}
                {history.data?.length > 0 && <ul className="study-rows">
                    {history.data.map((item) => <li key={item.id}>
                        <button type="button" className="study-row" onClick={() => navigateTo(`/attempts/${item.id}`)}>
                            <span className="study-row-text"><strong>{item.title}</strong><small>{new Date(item.started_at).toLocaleString('vi-VN')}</small></span>
                            <span className={muted}>{item.status === 'in_progress' ? 'Mở lượt làm' : `${item.score} điểm`}</span>
                            <ArrowRight size={16} />
                        </button>
                    </li>)}
                </ul>}
                {(historyPage > 1 || history.meta?.has_more) && <nav aria-label="Trang lịch sử" className="mt-3 flex items-center gap-3">
                    <button type="button" className={secondary} disabled={historyPage === 1 || history.loading} onClick={() => setHistoryPage(historyPage - 1)}>Trước</button>
                    <span>Trang {historyPage}</span>
                    <button type="button" className={secondary} disabled={!history.meta?.has_more || history.loading} onClick={() => setHistoryPage(historyPage + 1)}>Sau</button>
                </nav>}
            </section>}
        </div>
    )
}

export function ServerAttempt({ attemptId, session, navigateTo, onSignIn }) {
    const request = useStudyData(session ? `/attempts/${encodeURIComponent(attemptId)}` : null, session?.user.id)
    const [submitted, setSubmitted] = useState(null)
    const attempt = submitted ?? request.data
    return (
        <div className="study-page">
            <button type="button" className="study-text-button" onClick={() => navigateTo('/exams')}><ArrowLeft size={16} /> Các đề thi</button>
            <h1>{attempt?.title ?? 'Lượt làm bài'}</h1>
            <RequestStatus request={request} />
            {session === null && <button type="button" className={primary} onClick={onSignIn}>Đăng nhập để mở bài thi</button>}
            {attempt && (attempt.status === 'in_progress'
                ? <ActiveAttempt key={attempt.id} attempt={attempt} onSubmit={setSubmitted} onExpire={request.reload} />
                : <AttemptResult attempt={attempt} />)}
        </div>
    )
}

function ActiveAttempt({ attempt, onSubmit, onExpire }) {
    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState(() => Object.fromEntries(attempt.questions.map((question) => [question.id, question.selected_option_ids])))
    const [started] = useState(() => Date.now())
    const [busy, setBusy] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [error, setError] = useState(null)
    const duration = Math.max(0, Math.ceil((Date.parse(attempt.deadline_at) - Date.parse(attempt.server_now)) / 1000)) / 60
    const remaining = useExamTimer(duration, started, onExpire)
    const current = attempt.questions[index]
    const ids = selected[current.id]
    const multiple = current.type === 'multiple_choice'
    const done = Object.values(selected).filter((values) => values.length).length

    async function save(id) {
        const next = ids.includes(id) ? ids.filter((value) => value !== id) : multiple ? [...ids, id] : [id]
        setBusy(true)
        setError(null)
        try {
            await api(`/attempts/${attempt.id}/answers/${current.id}`, { method: 'PUT', body: { selected_option_ids: next } })
            setSelected((previous) => ({ ...previous, [current.id]: next }))
        } catch (err) {
            if (err.code === 'ATTEMPT_CLOSED') onExpire()
            else setError({ error: true, text: err.message })
        } finally {
            setBusy(false)
        }
    }

    async function submit() {
        setBusy(true)
        setError(null)
        try {
            const { data } = await api(`/attempts/${attempt.id}/submit`, { method: 'POST' })
            onSubmit(data)
        } catch (err) {
            setError({ error: true, text: err.message })
        } finally {
            setBusy(false)
        }
    }

    const clock = [Math.floor(remaining / 60), Math.floor(remaining % 60)].map((value) => String(value).padStart(2, '0')).join(':')
    return (
        <div className="study-exam-grid">
            <section className={`${card} study-question`}>
                <div className="study-question-top"><span className={muted}>Câu {index + 1}/{attempt.questions.length}</span>
                    <span className="study-clock" aria-label="Thời gian còn lại"><Clock size={16} /> {clock}</span>
                </div>
                <h2 className="text-xl font-bold">{current.content}</h2>
                <fieldset className="space-y-2" disabled={busy || remaining <= 0}>
                    <legend className={`mb-2 ${muted}`}>{multiple ? 'Chọn tất cả đáp án đúng' : 'Chọn một đáp án'}</legend>
                    {current.options.map((option) => <button type="button" key={option.id} aria-pressed={ids.includes(option.id)}
                        className="study-option w-full text-left" onClick={() => save(option.id)}>
                        <span>{option.content}</span>{ids.includes(option.id) && <Check size={17} />}
                    </button>)}
                </fieldset>
                <Notice message={error} />
                <div className="study-question-top">
                    <button type="button" className={secondary} disabled={index === 0 || busy} onClick={() => setIndex(index - 1)}>Câu trước</button>
                    <button type="button" className={secondary} disabled={index === attempt.questions.length - 1 || busy} onClick={() => setIndex(index + 1)}>Câu tiếp</button>
                </div>
            </section>
            <aside className={`${card} space-y-4 self-start`} aria-label="Điều hướng bài thi">
                <h2 className="font-bold">Đã trả lời {done}/{attempt.questions.length}</h2>
                <div className="study-exam-map">
                    {attempt.questions.map((question, position) => (
                        <button type="button" key={question.id} aria-label={`Câu ${position + 1}`} aria-current={position === index ? 'step' : undefined}
                                data-answered={Boolean(selected[question.id].length)} disabled={busy} onClick={() => setIndex(position)}>{position + 1}</button>
                    ))}
                </div>
                {confirming ? (
                    <div className="space-y-2">
                        <p className={muted}>Nộp bài với {done} câu đã trả lời?</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={primary} disabled={busy} onClick={submit}>Xác nhận nộp</button>
                            <button type="button" className={secondary} disabled={busy} onClick={() => setConfirming(false)}>Làm tiếp</button>
                        </div>
                    </div>
                ) : <button type="button" className={primary} disabled={busy} onClick={() => setConfirming(true)}>Nộp bài</button>}
            </aside>
        </div>
    )
}

function AttemptResult({ attempt }) {
    return (
        <>
            <div className={`${card} flex flex-wrap items-baseline gap-4`}>
                <strong className="text-3xl">{attempt.score}/{attempt.max_score} điểm</strong>
                <span>{attempt.correct_count}/{attempt.questions.length} câu đúng</span>
                {attempt.status === 'expired' && <span className={muted}>Bài đã chốt khi hết giờ.</span>}
            </div>
            <section className="space-y-3">
                <h2 className="text-xl font-bold">Xem lại bài làm</h2>
                {attempt.questions.map((question, index) => (
                    <details key={question.id} className={card}>
                        <summary className="cursor-pointer font-semibold">Câu {index + 1} · {question.selected_option_ids.length === 0 ? 'Bỏ trống' : question.is_correct ? 'Đúng' : 'Sai'}</summary>
                        <p className="my-3">{question.content}</p>
                        <ul className="space-y-1 text-sm">
                            {question.options.map((option) => <li key={option.id}>
                                {option.content}{question.selected_option_ids.includes(option.id) && ' · Bạn chọn'}
                                {question.correct_option_ids?.includes(option.id) && ' · Đáp án đúng'}
                            </li>)}
                        </ul>
                        {question.explanation && <p className="study-explanation mt-3">{question.explanation}</p>}
                    </details>
                ))}
            </section>
        </>
    )
}
