import { useState } from 'react'
import { api } from '../lib/api'
import { useStudyData } from '../hooks/useStudyData'
import { card, input, muted, Notice, primary, secondary, small } from './ui'

const statusLabel = { draft: 'Nháp', in_review: 'Chờ duyệt', published: 'Đã xuất bản', hidden: 'Đã ẩn' }
const initialForm = { subject_id: '', title: '', duration_minutes: 30, max_attempts: '', shuffle_questions: false, shuffle_options: false }

export default function AdminExams({ session, onSignIn }) {
    const identity = session?.user.id
    const profile = useStudyData(session ? '/me' : null, identity)
    const admin = profile.data?.role === 'admin'
    const editor = admin || profile.data?.role === 'editor'
    const subjects = useStudyData(editor ? '/admin/subjects' : null, identity)
    const exams = useStudyData(editor ? '/admin/exams' : null, identity)
    const [form, setForm] = useState(initialForm)
    const [editing, setEditing] = useState(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState(null)
    const [rejecting, setRejecting] = useState(null)
    const [note, setNote] = useState('')
    const error = profile.error ?? subjects.error ?? exams.error
    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

    async function act(fn, success) {
        setBusy(true)
        setMessage(null)
        try {
            await fn()
            setMessage({ text: success })
            exams.reload()
        } catch (err) {
            setMessage({ error: true, text: err.message })
        } finally {
            setBusy(false)
        }
    }

    function create(event) {
        event.preventDefault()
        act(async () => {
            const { data } = await api('/admin/exams', {
                method: 'POST', body: {
                    ...form, duration_minutes: Number(form.duration_minutes),
                    max_attempts: form.max_attempts === '' ? null : Number(form.max_attempts),
                },
            })
            setForm(initialForm)
            setEditing({ ...data, question_ids: [] })
        }, 'Đã tạo đề nháp. Chọn câu hỏi cho đề.')
    }

    function workflow(id, action) {
        act(async () => {
            await api(`/admin/exams/${id}/${action}`, { method: 'POST', ...(action === 'reject' && { body: { note } }) })
            setRejecting(null)
            setNote('')
        }, 'Đã cập nhật trạng thái đề.')
    }

    return (
        <div className="study-page">
            <h1>Quản trị đề thi</h1>
            {session === null && <button type="button" className={primary} onClick={onSignIn}>Đăng nhập</button>}
            {profile.data && !editor && <p className="study-empty">Cần quyền biên tập viên hoặc quản trị viên.</p>}
            {(session === undefined || profile.loading) && <p className="study-empty" role="status">Đang kiểm tra quyền…</p>}
            {error && <p className="study-alert" role="alert">{error.message}</p>}
            {editor && <>
                <form className={`${card} space-y-4`} onSubmit={create}>
                    <h2 className="text-lg font-bold">Tạo đề nháp</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm">Môn học
                            <select className={input} required value={form.subject_id} onChange={(e) => set('subject_id', e.target.value)}>
                                <option value="">Chọn môn học</option>
                                {subjects.data?.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                            </select>
                        </label>
                        <label className="text-sm">Tên đề
                            <input className={input} required maxLength={240} value={form.title} onChange={(e) => set('title', e.target.value)} />
                        </label>
                        <label className="text-sm">Thời gian (phút)
                            <input className={input} required type="number" min="1" max="600" value={form.duration_minutes} onChange={(e) => set('duration_minutes', e.target.value)} />
                        </label>
                        <label className="text-sm">Số lượt tối đa
                            <input className={input} type="number" min="1" max="1000" value={form.max_attempts} onChange={(e) => set('max_attempts', e.target.value)} placeholder="Không giới hạn" />
                        </label>
                    </div>
                    <div className="flex flex-wrap gap-5">
                        <label className="study-check"><input type="checkbox" checked={form.shuffle_questions} onChange={(e) => set('shuffle_questions', e.target.checked)} /> Trộn câu hỏi</label>
                        <label className="study-check"><input type="checkbox" checked={form.shuffle_options} onChange={(e) => set('shuffle_options', e.target.checked)} /> Trộn lựa chọn</label>
                    </div>
                    <button type="submit" className={primary} disabled={busy || !subjects.data?.length}>Tạo đề nháp</button>
                </form>
                <Notice message={message} />
                {editing && <QuestionPicker key={editing.id} exam={editing} identity={identity} busy={busy} onClose={() => setEditing(null)}
                    onSave={(ids) => act(async () => {
                        await api(`/admin/exams/${editing.id}/questions`, { method: 'PUT', body: ids.map((question_id, index) => ({ question_id, position: index + 1, points: 1 })) })
                        setEditing(null)
                    }, 'Đã lưu câu hỏi cho đề.')} />}
                {exams.loading && <p className="study-empty" role="status">Đang tải đề thi…</p>}
                {exams.data?.length === 0 && <p className="study-empty">Chưa có đề thi.</p>}
                {exams.data?.length > 0 && <ul className="study-rows">
                    {exams.data.map((exam) => <li key={exam.id} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><h2 className="font-bold">{exam.title}</h2><p className={muted}>{exam.subject_name} · {exam.question_ids.length} câu · {statusLabel[exam.status]}</p></div>
                            <div className="flex flex-wrap gap-2">
                                {exam.status === 'draft' && <>
                                    <button type="button" className={small} disabled={busy} onClick={() => setEditing(exam)}>Chọn câu hỏi</button>
                                    <button type="button" className={small} disabled={busy || !exam.question_ids.length} onClick={() => workflow(exam.id, 'submit')}>Gửi duyệt</button>
                                    {admin && <button type="button" className={small} disabled={busy || !exam.question_ids.length} onClick={() => workflow(exam.id, 'publish')}>Xuất bản ngay</button>}
                                </>}
                                {admin && exam.status === 'in_review' && <>
                                    <button type="button" className={small} disabled={busy} onClick={() => workflow(exam.id, 'approve')}>Duyệt và xuất bản</button>
                                    <button type="button" className={small} disabled={busy} onClick={() => { setRejecting(exam.id); setNote('') }}>Trả lại</button>
                                </>}
                                {admin && exam.status === 'published' && <button type="button" className={small} disabled={busy} onClick={() => workflow(exam.id, 'hide')}>Ẩn đề</button>}
                                {admin && exam.status === 'hidden' && <button type="button" className={small} disabled={busy} onClick={() => workflow(exam.id, 'unhide')}>Hiện lại</button>}
                            </div>
                        </div>
                        {rejecting === exam.id && <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); workflow(exam.id, 'reject') }}>
                            <label className="min-w-52 flex-1 text-sm">Lý do trả lại<input className={input} required maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
                            <button type="submit" className={small} disabled={busy || !note.trim()}>Xác nhận</button>
                            <button type="button" className={small} disabled={busy} onClick={() => setRejecting(null)}>Hủy</button>
                        </form>}
                    </li>)}
                </ul>}
            </>}
        </div>
    )
}

function QuestionPicker({ exam, identity, busy, onSave, onClose }) {
    const choices = useStudyData(`/admin/exams/questions?subject_id=${exam.subject_id}`, identity)
    const [selected, setSelected] = useState(exam.question_ids)
    function toggle(id) {
        setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    }
    return (
        <section className={`${card} space-y-4`}>
            <h2 className="text-lg font-bold">Chọn câu hỏi cho {exam.title}</h2>
            <p className={muted}>Đã chọn {selected.length}/250 câu. Mỗi câu có cùng trọng số.</p>
            {choices.loading && <p role="status">Đang tải ngân hàng câu hỏi…</p>}
            {choices.error && <p className="study-alert" role="alert">{choices.error.message} <button type="button" onClick={choices.reload}>Thử lại</button></p>}
            {choices.data?.length === 0 && <p className="study-empty">Môn này chưa có câu hỏi đã xuất bản.</p>}
            <div className="max-h-80 space-y-2 overflow-y-auto">
                {choices.data?.map((q) => <label key={q.id} className="study-option">
                    <input type="checkbox" checked={selected.includes(q.id)} disabled={busy || (selected.length >= 250 && !selected.includes(q.id))} onChange={() => toggle(q.id)} />
                    <span>{q.content}{q.chapter_title && <small className="block text-xs">{q.chapter_title}</small>}</span>
                </label>)}
            </div>
            <div className="flex gap-2">
                <button type="button" className={primary} disabled={busy || !choices.data} onClick={() => onSave(selected.filter((id) => choices.data.some((question) => question.id === id)))}>Lưu câu hỏi</button>
                <button type="button" className={secondary} disabled={busy} onClick={onClose}>Đóng</button>
            </div>
        </section>
    )
}
