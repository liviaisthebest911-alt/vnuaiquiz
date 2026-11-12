import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, BookmarkCheck, Check, Layers, RotateCcw, X } from 'lucide-react'
import { api, apiConfigured } from '../lib/api'
import { useStudyData } from '../hooks/useStudyData'
import { card, input, muted, Notice, primary, secondary } from './ui'
import { localSubject } from './Dashboard'

function StudyStatus({ request }) {
    if (request.loading) return <p role="status" className="study-empty">Đang tải…</p>
    if (request.error) return <p role="alert" className="study-alert">{request.error.message} <button type="button" onClick={request.reload}>Thử lại</button></p>
    return null
}

export function Subjects({ code, questions, onStudy, onNavigate, session }) {
    const path = code ? `/subjects/${encodeURIComponent(code)}` : '/subjects'
    const request = useStudyData(apiConfigured ? path : null, session?.user.id)
    const localChapters = [...new Map(questions.map((q) => [q.chapter, q.chapterName])).entries()]
        .sort(([a], [b]) => a - b)
        .map(([position, title]) => ({ id: position, title, position }))
    const local = { ...localSubject, chapters: localChapters }
    const subject = code ? (apiConfigured ? request.data : code === local.code ? local : null) : null
    const subjects = apiConfigured ? request.data : [local]

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
                        <button type="button" className={primary} onClick={() => onStudy('practice', code, true)}>Ôn tập <ArrowRight size={16} /></button>
                        <button type="button" className={secondary} onClick={() => onStudy('flashcard', code)}><Layers size={16} /> Flashcard</button>
                        {subject.id && <button type="button" className={secondary} onClick={() => onNavigate('materials', subject.id)}>Tài liệu của môn</button>}
                    </div>
                    <div className="study-section-heading"><h2>Chương học</h2></div>
                    {subject.chapters.length === 0 ? <p className="study-empty">Môn học này chưa có chương đã xuất bản.</p> : (
                        <ul className="study-rows">
                            {subject.chapters.map((chapter) => (
                                <li key={chapter.id}>
                                    <button type="button" className="study-row" onClick={() => onStudy('practice', code, true, false, chapter.id)}>
                                        <span className="study-row-icon"><BookOpen size={19} /></span>
                                        <span className="study-row-text"><strong>{chapter.title}</strong>
                                            {chapter.question_count !== undefined && <small>{chapter.question_count} câu hỏi</small>}
                                        </span>
                                        <ArrowRight size={16} />
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
                        <button type="button" className="study-row" onClick={() => onStudy('subjects', subject.code)}>
                            <span className="study-row-icon"><BookOpen size={19} /></span>
                            <span className="study-row-text"><strong>{subject.name}</strong><small>{subject.chapters.length} chương{subject.material_count > 0 ? ` · ${subject.material_count} tài liệu` : ''}</small></span>
                            <ArrowRight size={16} />
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
            <div className="study-question-top">
                <span className={muted}>Câu {index + 1}/{questions.length}</span>
                <button type="button" className={secondary} aria-pressed={isSaved} disabled={saving.has(question.id)} onClick={toggleBookmark}>
                    {isSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />} {isSaved ? 'Đã đánh dấu' : 'Đánh dấu câu khó'}
                </button>
            </div>
            <Notice message={bookmarkError} />
            <StudyQuestion key={question.id} question={question} flashcard={flashcard} />
            <div className="study-question-top">
                <button type="button" className={secondary} disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={16} /> Câu trước</button>
                <button type="button" className={secondary} disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>Câu tiếp <ArrowRight size={16} /></button>
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
            <h2 className="text-xl font-bold leading-relaxed">{question.content}</h2>
            <fieldset className="space-y-2" disabled={busy || Boolean(answer)}>
                <legend className={`mb-2 ${muted}`}>{flashcard ? 'Các lựa chọn' : multiple ? 'Chọn tất cả đáp án đúng' : 'Chọn một đáp án'}</legend>
                {question.options.map((option) => {
                    const right = correct.includes(option.id)
                    const wrong = answer && selected.includes(option.id) && !right
                    return (
                        <label key={option.id} className={`study-option${right ? ' is-correct' : wrong ? ' is-wrong' : ''}`}>
                            {!flashcard && <input name="answer" type={multiple ? 'checkbox' : 'radio'} checked={selected.includes(option.id)} onChange={() => choose(option.id)} />}
                            <span>{option.content}</span>
                            {right && <Check aria-label="Đáp án đúng" size={17} />}
                            {wrong && <X aria-label="Lựa chọn sai" size={17} />}
                        </label>
                    )
                })}
            </fieldset>
            <Notice message={error} />
            {answer && <p role="status" className="font-semibold">{answer.is_correct ? 'Trả lời đúng' : 'Chưa đúng'}</p>}
            {(answer || revealed) && explanation && <p className="study-explanation">{explanation}</p>}
            {flashcard ? (
                <button type="button" className={primary} onClick={() => setRevealed(!revealed)}>{revealed ? <><RotateCcw size={16} /> Ẩn đáp án</> : 'Lật xem đáp án'}</button>
            ) : !answer && (
                <button type="submit" className={primary} disabled={selected.length === 0 || busy}>{busy ? 'Đang chấm…' : 'Kiểm tra đáp án'}</button>
            )}
        </form>
    )
}
