import { ArrowRight, BookOpen, Bookmark, ChevronRight, Clock3, FileText, GraduationCap, Layers, Library, Play } from 'lucide-react'
import { useStudyData } from '../hooks/useStudyData'
import { apiConfigured } from '../lib/api'
import Mascot from './Mascot'

export const localSubject = {
    code: 'CNSAI',
    name: 'Nhập môn Công nghệ số và Ứng dụng Trí tuệ nhân tạo',
}

function Progress({ answered, total }) {
    return (
        <div className="study-progress">
            <progress className="sr-only" aria-label="Tiến độ ôn tập" value={answered} max={total || 1}>{answered}/{total}</progress>
            <span className="bar" aria-hidden="true"><i style={{ width: `${total ? Math.min(100, answered / total * 100) : 0}%` }} /></span>
            <strong>{answered}/{total} câu đã làm</strong>
        </div>
    )
}

// Đốm sáng theo con trỏ trên khối môn học (chỉ CSS hiển thị khi có hover + không giảm chuyển động)
function spotlight(event) {
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--mx', `${event.clientX - box.left}px`)
    event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`)
}

function Tool({ label, hint, icon: Icon, tone, onClick }) {
    return (
        <button type="button" className="study-tool lift" onClick={onClick}>
            <span className="study-tool-top">
                <span className={`tile-icon ${tone}`}><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span>
                <ArrowRight className="go" size={18} aria-hidden="true" />
            </span>
            <span><strong>{label}</strong><small>{hint}</small></span>
        </button>
    )
}

export default function Dashboard({ questions, history, progress, bookmarks, session, onNavigate, onStudy, onOpenMaterial, onChooseChapter }) {
    const { data, error, loading, reload } = useStudyData(apiConfigured && session !== undefined ? '/dashboard' : null, session?.user.id)
    const chapters = new Set(questions.map((question) => question.chapter)).size
    const local = { ...localSubject, question_count: questions.length, answered_count: progress.length }
    const subjects = data?.subjects ?? [local]
    const serverSubject = subjects.find((subject) => subject.last_answered_at)
        ?? subjects.find((subject) => subject.code === local.code && subject.question_count > 0)
        ?? subjects.find((subject) => subject.question_count > 0)
    const current = session && serverSubject?.id ? serverSubject : local
    const isLocal = !current.id
    const savedCount = isLocal ? bookmarks.length : null
    const fullName = session?.user.user_metadata?.full_name
    const firstName = typeof fullName === 'string' ? fullName.trim().split(/\s+/).at(-1) : ''
    const stats = [
        ['Tổng câu hỏi', current.question_count],
        ...(isLocal ? [['Số chương', chapters]] : []),
        ['Bài đã làm', history.length],
        ...(data && session ? [['Lượt thi theo tài khoản', data.attempts_count]] : []),
        ...(savedCount !== null ? [['Câu đã đánh dấu', savedCount]] : []),
    ]

    return (
        <div className="study-home">
            <div className="study-greeting">
                <Mascot size={64} mood="greet" />
                <div>
                    <h1>{firstName ? `Chào ${firstName}!` : 'Hôm nay học gì?'}</h1>
                    <p>{session && !isLocal ? 'Tiến độ học được lưu trong tài khoản.' : 'Tiến độ học trên thiết bị này.'}</p>
                </div>
            </div>

            {(session && loading) || (apiConfigured && session === undefined) ? <p role="status" className="study-empty"><Mascot size={40} mood="loading" /> Đang tải môn học và tiến độ…</p> :
            <section className="study-hero" aria-labelledby="current-subject" onPointerMove={spotlight}>
                <div className="study-hero-copy">
                    <span className="chip">Môn đang học</span>
                    <h2 id="current-subject">{current.name}</h2>
                    <Progress answered={current.answered_count} total={current.question_count} />
                </div>
                <div className="study-hero-actions">
                    <button type="button" className="study-cta" onClick={() => onStudy('practice', isLocal ? null : current.code, true)}>
                        <Play size={17} fill="currentColor" aria-hidden="true" />
                        {current.answered_count > 0 ? 'Ôn tiếp' : 'Ôn tập ngay'}
                        <ArrowRight size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className="study-hero-link" onClick={() => onChooseChapter(current.code, isLocal)}>Chọn chương</button>
                </div>
            </section>}

            {error && <p role="status" className="study-alert">{error.message} <button type="button" onClick={reload}>Thử tải lại</button></p>}

            <section aria-labelledby="home-tools">
                <div className="study-section-heading"><h2 id="home-tools">Công cụ học</h2></div>
                <div className="study-tools">
                    <Tool label="Ôn tập theo chương" hint="Chọn đáp án, xem lời giải ngay." icon={GraduationCap} tone="tone-cloud" onClick={() => onNavigate('practice')} />
                    <Tool label="Flashcard" hint="Lật thẻ để ghi nhớ nhanh." icon={Layers} tone="tone-lilac" onClick={() => onNavigate('flashcard')} />
                    <Tool label="Thi thử 30 phút" hint="40 câu ngẫu nhiên, có tính giờ." icon={Clock3} tone="tone-petal" onClick={() => onNavigate('exam', 'local')} />
                    <Tool label="Kho tài liệu" hint="Giáo trình, slide theo từng môn." icon={Library} tone="tone-sky" onClick={() => onNavigate('materials')} />
                    {current.id && <Tool label="Câu đã đánh dấu" hint="Ôn lại các câu khó của môn." icon={Bookmark} tone="tone-petal"
                                         onClick={() => onStudy('practice', current.code, false, true)} />}
                </div>
            </section>

            <div className="study-home-grid">
                <section aria-labelledby="home-subjects">
                    <div className="study-section-heading">
                        <h2 id="home-subjects">Môn học</h2>
                        <button type="button" className="study-text-button" onClick={() => onNavigate('subjects')}>Tất cả môn <ArrowRight size={16} aria-hidden="true" /></button>
                    </div>
                    {subjects.length === 0 ? <p className="study-empty">Chưa có môn học đã xuất bản.</p> : (
                        <ul className="study-rows">
                            {subjects.slice(0, 5).map((subject) => {
                                const started = subject.answered_count > 0
                                return (
                                    <li key={subject.code}>
                                        <button type="button" className="study-row lift" onClick={() => subject.id ? onStudy('subjects', subject.code) : onStudy('practice', null, true)}>
                                            <span className="study-row-icon tile-icon"><BookOpen size={20} strokeWidth={1.8} aria-hidden="true" /></span>
                                            <span className="study-row-text">
                                                <span className="study-row-title"><strong>{subject.name}</strong>
                                                    <span className={`chip ${started ? 'chip-cloud' : 'chip-quiet'}`}>{started ? 'Đang học' : 'Chưa bắt đầu'}</span></span>
                                                <small>{subject.question_count} câu hỏi{started ? ` · Đã ôn ${subject.answered_count} câu` : ''}</small>
                                            </span>
                                            <ChevronRight className="go" size={18} aria-hidden="true" />
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>
                <section aria-labelledby="home-stats">
                    <div className="study-section-heading"><h2 id="home-stats">Thống kê</h2></div>
                    <dl className="study-metrics">
                        {stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                    </dl>
                </section>
            </div>

            {data?.recent_materials?.length > 0 && <section aria-labelledby="home-materials">
                <div className="study-section-heading"><h2 id="home-materials">Tài liệu mới</h2></div>
                <ul className="study-rows">{data.recent_materials.map((material) => <li key={material.id}>
                    <button type="button" className="study-row lift" onClick={() => onOpenMaterial(material.id)}>
                        <span className="study-row-icon tile-icon tone-lilac"><FileText size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                        <span className="study-row-text"><strong>{material.title}</strong><small>{material.subject_name}</small></span>
                        <ArrowRight className="go" size={16} aria-hidden="true" />
                    </button>
                </li>)}</ul>
            </section>}

            <section aria-labelledby="home-history">
                <div className="study-section-heading"><h2 id="home-history">Lịch sử thi thử</h2></div>
                {history.length === 0 ? <p className="study-empty">Bạn chưa hoàn thành bài thi thử nào trên thiết bị này.</p> : (
                    <ul className="study-history">
                        {history.slice(0, 5).map((item) => (
                            <li key={item.id}>
                                <div><strong>Đề thi thử · {item.totalQuestions} câu</strong>{item.createdAt && <time className="block text-xs" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</time>}</div>
                                <span>{item.correct}/{item.totalQuestions} câu đúng</span>
                                <strong className={`chip ${item.score >= 5 ? 'chip-cloud' : 'chip-petal'}`}>{item.score}/10</strong>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
