import { ArrowDownRight, ArrowRight, BookOpen, Bookmark, ChevronRight, ClipboardList, FileText, Layers, Play } from 'lucide-react'
import { useStudyData } from '../hooks/useStudyData'
import { apiConfigured } from '../lib/api'

export const localSubject = {
    code: 'CNSAI',
    name: 'Nhập môn Công nghệ số và Ứng dụng Trí tuệ nhân tạo',
}

function Progress({ answered, total }) {
    const percent = total ? Math.min(100, Math.round(answered / total * 100)) : 0
    return (
        <div className="study-progress">
            <div><span>Tiến độ ôn tập</span><strong>{answered}/{total} câu</strong></div>
            <progress aria-label="Tiến độ ôn tập" value={percent} max={100}>{percent}%</progress>
        </div>
    )
}

export default function Dashboard({ questions, history, progress, bookmarks, session, onNavigate, onStudy, onOpenMaterial }) {
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
            <div className="study-home-heading">
                <div>
                    <h1>{firstName ? `Chào ${firstName}!` : 'Hôm nay học gì?'}</h1>
                    <p>{session && !isLocal ? 'Tiến độ học được lưu trong tài khoản.' : 'Tiến độ học trên thiết bị này.'}</p>
                </div>
                <button type="button" className="study-outline" onClick={() => onNavigate('subjects')}>
                    <BookOpen size={17} aria-hidden="true" /> Xem môn học <ArrowDownRight size={16} aria-hidden="true" />
                </button>
            </div>

            {(session && loading) || (apiConfigured && session === undefined) ? <p role="status" className="study-empty">Đang tải môn học và tiến độ…</p> :
            <section className="study-hero" aria-labelledby="current-subject">
                <div className="study-hero-copy">
                    <h2 id="current-subject">{current.name}</h2>
                    <Progress answered={current.answered_count} total={current.question_count} />
                    <button type="button" className="study-cta" onClick={() => onStudy('practice', isLocal ? null : current.code, true)}>
                        <Play size={17} aria-hidden="true" />
                        {current.answered_count > 0 ? 'Ôn tiếp' : 'Ôn tập ngay'}
                        <ArrowRight size={18} aria-hidden="true" />
                    </button>
                </div>
                <div className="study-hero-photo" aria-hidden="true" />
            </section>}

            {error && <p role="status" className="study-alert">{error.message} <button type="button" onClick={reload}>Thử tải lại</button></p>}

            <div className="study-home-grid">
                <section aria-labelledby="home-subjects">
                    <div className="study-section-heading">
                        <h2 id="home-subjects">Môn học</h2>
                        <button type="button" className="study-text-button" onClick={() => onNavigate('subjects')}>Tất cả môn <ArrowRight size={16} aria-hidden="true" /></button>
                    </div>
                    {subjects.length === 0 ? <p className="study-empty">Chưa có môn học đã xuất bản.</p> : (
                        <ul className="study-rows">
                            {subjects.slice(0, 5).map((subject) => (
                                <li key={subject.code}>
                                    <button type="button" className="study-row" onClick={() => subject.id ? onStudy('subjects', subject.code) : onStudy('practice', null, true)}>
                                        <span className="study-row-icon"><BookOpen size={20} aria-hidden="true" /></span>
                                        <span className="study-row-text"><strong>{subject.name}</strong><small>{subject.question_count} câu hỏi{subject.answered_count > 0 ? ` · Đã ôn ${subject.answered_count} câu` : ''}</small></span>
                                        <ChevronRight size={18} aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <section aria-labelledby="home-tools">
                    <div className="study-section-heading"><h2 id="home-tools">Công cụ học</h2></div>
                    <div className="study-tools">
                        {[
                            ['Flashcard', 'flashcard', Layers],
                            ['Thi thử 30 phút', 'exam', ClipboardList],
                            ['Kho tài liệu', 'materials', FileText],
                            ...(current.id ? [['Câu đã đánh dấu', 'bookmarks', Bookmark]] : []),
                        ].map(([label, page, Icon]) => (
                            <button type="button" key={page} onClick={() => {
                                if (page === 'bookmarks') onStudy('practice', current.code, false, true)
                                else onNavigate(page, page === 'exam' ? 'local' : undefined)
                            }}>
                                <Icon size={18} aria-hidden="true" /><span>{label}</span><ArrowRight size={16} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {data?.recent_materials?.length > 0 && <section aria-labelledby="home-materials">
                <div className="study-section-heading"><h2 id="home-materials">Tài liệu mới</h2></div>
                <ul className="study-rows">{data.recent_materials.map((material) => <li key={material.id}>
                    <button type="button" className="study-row" onClick={() => onOpenMaterial(material.id)}>
                        <span className="study-row-icon"><FileText size={19} aria-hidden="true" /></span>
                        <span className="study-row-text"><strong>{material.title}</strong><small>{material.subject_name}</small></span>
                        <ArrowRight size={16} aria-hidden="true" />
                    </button>
                </li>)}</ul>
            </section>}

            <dl className="study-metrics">
                {stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <section aria-labelledby="home-history">
                <div className="study-section-heading"><h2 id="home-history">Lịch sử thi thử</h2></div>
                {history.length === 0 ? <p className="study-empty">Bạn chưa hoàn thành bài thi thử nào trên thiết bị này.</p> : (
                    <ul className="study-history">
                        {history.slice(0, 5).map((item) => (
                            <li key={item.id}>
                                <div><strong>Đề thi thử · {item.totalQuestions} câu</strong>{item.createdAt && <time className="block text-xs" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</time>}</div>
                                <span>{item.correct}/{item.totalQuestions} câu đúng</span>
                                <strong>{item.score}/10</strong>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
