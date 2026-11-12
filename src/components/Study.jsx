import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, BookmarkCheck, CircleAlert, CircleCheck, LayoutGrid, Layers, RotateCcw } from 'lucide-react'
import { api, apiConfigured } from '../lib/api'
import { useStudyData } from '../hooks/useStudyData'
import { card, input, muted, Notice, primary, secondary } from './ui'
import { localSubject } from './Dashboard'
import Mascot from './Mascot'
import QuestionMap from './QuestionMap'

function StudyStatus({ request }) {
    if (request.loading) return <p role="status" className="study-empty">Đang tải…</p>
    if (request.error) return <p role="alert" className="study-alert">{request.error.message} <button type="button" onClick={request.reload}>Thử lại</button></p>
    return null
}

export function Subjects({ code, questions, onStudy, onNavigate, session, localMode = false }) {
    const path = code ? `/subjects/${encodeURIComponent(code)}` : '/subjects'
    const remote = apiConfigured && !localMode
    const request = useStudyData(remote ? path : null, session?.user.id)
    const localChapters = [...new Map(questions.map((q) => [q.chapter, q.chapterName])).entries()]
        .sort(([a], [b]) => a - b)
        .map(([position, title]) => ({ id: position, title, position }))
    const local = { ...localSubject, chapters: localChapters }
    const subject = code ? (remote ? request.data : code === local.code ? local : null) : null
    const subjects = remote ? request.data : [local]
    // ?local=1: môn trên thiết bị → mở ôn tập cục bộ (subject null) thay vì môn trên máy chủ
    const studyCode = localMode ? null : code

    if (code) {
        return (
            <div className="study-page">
                <button type="button" className="study-text-button" onClick={() => onNavigate('subjects')}><ArrowLeft size={16} /> Tất cả môn</button>
                <h1>{subject?.name ?? 'Môn học'}</h1>
                <StudyStatus request={request} />
                {!request.loading && !request.error && !subject && <p className="study-empty">Không tìm thấy môn học.</p>}
                {subject && <>
                    {subject.description && <p className={muted}>{subject.description}</p>}
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={primary} onClick={() => onStudy('practice', studyCode, true)}>Ôn tập <ArrowRight size={16} /></button>
                        <button type="button" className={secondary} onClick={() => onStudy('flashcard', studyCode)}><Layers size={16} /> Flashcard</button>
                        {subject.id && <button type="button" className={secondary} onClick={() => onNavigate('materials', subject.id)}>Tài liệu của môn</button>}
                    </div>
                    <div className="study-section-heading"><h2>Chương học</h2></div>
                    {subject.chapters.length === 0 ? <p className="study-empty">Môn học này chưa có chương đã xuất bản.</p> : (
                        <ul className="study-rows">
                            {subject.chapters.map((chapter) => (
                                <li key={chapter.id}>
                                    <button type="button" className="study-row lift" onClick={() => onStudy('practice', studyCode, true, false, chapter.id)}>
                                        <span className="study-row-icon tile-icon"><BookOpen size={19} aria-hidden="true" /></span>
                                        <span className="study-row-text"><strong>{chapter.title}</strong>
                                            {chapter.question_count !== undefined && <small>{chapter.question_count} câu hỏi</small>}
                                        </span>
                                        <ArrowRight className="go" size={16} aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>}
            </div>
        )
    }

    return (
        <div className="study-page">
            <h1>Môn học</h1>
            <StudyStatus request={request} />
            {subjects?.length === 0 && <p className="study-empty">Chưa có môn học đã xuất bản.</p>}
            {subjects?.length > 0 && <ul className="study-rows">
                {subjects.map((subject) => (
                    <li key={subject.code}>
                        <button type="button" className="study-row lift" onClick={() => onStudy('subjects', subject.code)}>
                            <span className="study-row-icon tile-icon"><BookOpen size={19} aria-hidden="true" /></span>
                            <span className="study-row-text"><strong>{subject.name}</strong><small>{subject.chapters.length} chương{subject.material_count > 0 ? ` · ${subject.material_count} tài liệu` : ''}</small></span>
                            <ArrowRight className="go" size={16} aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>}
        </div>
    )
}

export function Study({ mode, code, initialChapter, resume, onlyBookmarks, session, onStudy, onNavigate, renderLocal, localMode }) {
    const isFlashcard = mode === 'flashcard'
    const title = isFlashcard ? 'Thẻ ghi nhớ nhanh' : 'Ôn tập theo chương'
    const [chapterId, setChapterId] = useState(initialChapter || '')
    const [bookmarked, setBookmarked] = useState(onlyBookmarks)
    const [page, setPage] = useState(null)
    const subjects = useStudyData(apiConfigured && !localMode && session ? '/subjects' : null, session?.user.id)
    const subject = subjects.data?.find((item) => item.code === code)
    const active = subject ?? (!code ? subjects.data?.find((item) => item.code === localSubject.code) ?? subjects.data?.[0] : null)
    const validChapter = active?.chapters.some((chapter) => chapter.id === chapterId) ? chapterId : ''
    const params = active ? new URLSearchParams({
        subject_id: active.id, page: String(page ?? 1),
        ...(resume && page === null && { resume: 'true' }),
        ...(validChapter && { chapter_id: validChapter }),
        ...(bookmarked && { bookmarked: 'true' }),
    }) : null
    const request = useStudyData(params ? `/${isFlashcard ? 'flashcards' : 'practice/questions'}?${params}` : null, session?.user.id)
    const currentPage = request.meta?.page ?? page ?? 1

    if (!apiConfigured || localMode || (session === null && (!code || code === localSubject.code))) return renderLocal()
    if (session === undefined) return <div className="study-page"><h1>{title}</h1><p role="status" className="study-empty">Đang tải phiên đăng nhập…</p></div>
    if (!session) {
        return (
            <div className="study-page">
                <h1>{title}</h1>
                <p className="study-empty">Đăng nhập để ôn môn này và lưu tiến độ vào tài khoản.</p>
                <button type="button" className={primary} onClick={() => onNavigate('account')}>Đăng nhập</button>
            </div>
        )
    }

    return (
        <div className="study-page">
            <h1>{title}</h1>
            <StudyStatus request={subjects} />
            {subjects.data && !active && <p className="study-empty">{code ? 'Không tìm thấy môn học.' : 'Chưa có môn học đã xuất bản.'}</p>}
            {active && (
                <>
                    <div className="study-filters">
                        <label>Môn học
                            <select className={input} value={active.code} onChange={(event) => onStudy(mode, event.target.value)}>
                                {subjects.data.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
                            </select>
                        </label>
                        <label>Chương
                            <select className={input} value={validChapter} onChange={(event) => { setChapterId(event.target.value); setPage(1) }}>
                                <option value="">Tất cả chương</option>
                                {active.chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                            </select>
                        </label>
                        <label className="study-check">
                            <input type="checkbox" checked={bookmarked} onChange={(event) => { setBookmarked(event.target.checked); setPage(1) }} />
                            Chỉ câu đánh dấu
                        </label>
                    </div>
                    <StudyStatus request={request} />
                    {request.data?.length === 0 && <p className="study-empty">{bookmarked ? 'Chưa có câu đã đánh dấu trong phần này.' : 'Chưa có câu hỏi đã xuất bản trong phần này.'}</p>}
                    {request.data?.length > 0 && <StudySession key={params.toString()} questions={request.data} flashcard={isFlashcard} resume={resume && page === null} />}
                    {(currentPage > 1 || request.meta?.has_more) && <nav className="flex items-center gap-3" aria-label="Trang câu hỏi">
                        <button type="button" className={secondary} disabled={currentPage === 1 || request.loading} onClick={() => setPage(currentPage - 1)}>Nhóm trước</button>
                        <span className={muted}>Nhóm {currentPage}</span>
                        <button type="button" className={secondary} disabled={!request.meta?.has_more || request.loading} onClick={() => setPage(currentPage + 1)}>Nhóm sau</button>
                    </nav>}
                </>
            )}
        </div>
    )
}

function StudySession({ questions, flashcard, resume }) {
    const [index, setIndex] = useState(() => resume ? Math.max(0, questions.findIndex((question) => !question.answered)) : 0)
    const [saved, setSaved] = useState(() => new Set(questions.filter((question) => question.bookmarked).map((question) => question.id)))
    const [saving, setSaving] = useState(new Set())
    const [bookmarkError, setBookmarkError] = useState(null)
    const [mapOpen, setMapOpen] = useState(false)
    const question = questions[index]
    const isSaved = saved.has(question.id)

    async function toggleBookmark() {
        const id = question.id
        setSaving((ids) => new Set(ids).add(id))
        setBookmarkError(null)
        try {
            await api(`/me/bookmarks/${id}`, { method: isSaved ? 'DELETE' : 'PUT' })
            setSaved((ids) => {
                const next = new Set(ids)
                if (isSaved) next.delete(id)
                else next.add(id)
                return next
            })
        } catch (error) {
            setBookmarkError({ error: true, text: error.message })
        } finally {
            setSaving((ids) => {
                const next = new Set(ids)
                next.delete(id)
                return next
            })
        }
    }

    return (
        <section className={`${card} study-question`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-bold tabular-nums">Câu {index + 1}<span className="font-medium text-blossom-muted">/{questions.length}</span></span>
                <span className="bar order-last w-full sm:order-none sm:w-auto sm:flex-1" aria-hidden="true"><i style={{ width: `${(index + 1) / questions.length * 100}%` }} /></span>
                <button type="button" className={secondary} aria-expanded={mapOpen} aria-controls="study-map" onClick={() => setMapOpen(!mapOpen)}>
                    <LayoutGrid size={17} aria-hidden="true" /> Danh sách câu
                </button>
                <button type="button" className={`${secondary} ml-auto ${isSaved ? '!border-petal-line !bg-petal-soft !text-petal-ink' : ''}`} aria-pressed={isSaved} disabled={saving.has(question.id)} onClick={toggleBookmark}>
                    {isSaved ? <BookmarkCheck size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />} {isSaved ? 'Đã đánh dấu' : 'Đánh dấu câu khó'}
                </button>
            </div>
            {mapOpen && <div className="rounded-2xl border border-blossom-border bg-blossom-bg p-3">
                <QuestionMap id="study-map" current={index} showMarked
                             items={questions.map((item) => ({ key: item.id, answered: item.answered, marked: saved.has(item.id) }))}
                             onSelect={(position) => { setIndex(position); setMapOpen(false) }} />
            </div>}
            <Notice message={bookmarkError} />
            <StudyQuestion key={question.id} question={question} flashcard={flashcard} />
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
                <button type="button" className={secondary} disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={16} aria-hidden="true" /> Câu trước</button>
                <button type="button" className={primary} disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>Câu tiếp <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
        </section>
    )
}

function StudyQuestion({ question, flashcard }) {
    const [selected, setSelected] = useState([])
    const [answer, setAnswer] = useState(null)
    const [revealed, setRevealed] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const multiple = question.type === 'multiple_choice'
    const correct = flashcard && revealed ? question.options.filter((option) => option.is_correct).map((option) => option.id) : answer?.correct_option_ids ?? []
    const explanation = flashcard ? question.explanation : answer?.explanation

    function choose(id) {
        setSelected(multiple ? selected.includes(id) ? selected.filter((option) => option !== id) : [...selected, id] : [id])
    }

    async function submit(event) {
        event.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const { data } = await api('/practice/answers', {
                method: 'POST', body: { question_id: question.id, selected_option_ids: selected },
            })
            setAnswer(data)
        } catch (err) {
            setError({ error: true, text: err.message })
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <h2 className="text-xl font-extrabold leading-relaxed sm:text-[23px]">{question.content}</h2>
            <fieldset className="space-y-3" disabled={busy || Boolean(answer)}>
                <legend className={`mb-2 ${muted}`}>{flashcard ? 'Các lựa chọn' : multiple ? 'Chọn tất cả đáp án đúng' : 'Chọn một đáp án'}</legend>
                {question.options.map((option) => {
                    const right = correct.includes(option.id)
                    const wrong = answer && selected.includes(option.id) && !right
                    return (
                        <label key={option.id} className={`study-option${right ? ' is-correct' : wrong ? ' is-wrong' : ''}`}>
                            {!flashcard && <input name="answer" type={multiple ? 'checkbox' : 'radio'} checked={selected.includes(option.id)} onChange={() => choose(option.id)} />}
                            <span>{option.content}</span>
                            {right && <CircleCheck aria-label="Đáp án đúng" size={20} />}
                            {wrong && <CircleAlert aria-label="Lựa chọn sai" size={20} />}
                        </label>
                    )
                })}
            </fieldset>
            <Notice message={error} />
            {answer && <div role="status" className={`study-feedback ${answer.is_correct ? 'is-correct' : 'is-wrong'}`}>
                <Mascot size={56} mood={answer.is_correct ? 'success' : 'encourage'} />
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="study-feedback-title">{answer.is_correct ? 'Trả lời đúng' : 'Chưa đúng'}</p>
                    <p className="text-sm text-blossom-muted">{answer.is_correct ? 'Giỏi lắm, sang câu tiếp nào!' : 'Không sao đâu, đọc lời giải rồi thử câu tiếp nhé.'}</p>
                </div>
            </div>}
            {(answer || revealed) && explanation && <p className="study-explanation">{explanation}</p>}
            {flashcard ? (
                <button type="button" className={primary} onClick={() => setRevealed(!revealed)}>{revealed ? <><RotateCcw size={16} aria-hidden="true" /> Ẩn đáp án</> : 'Lật xem đáp án'}</button>
            ) : !answer && (
                <button type="submit" className={primary} disabled={selected.length === 0 || busy}>{busy ? 'Đang chấm…' : 'Kiểm tra đáp án'}</button>
            )}
        </form>
    )
}
