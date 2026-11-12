import { useCallback, useEffect, useState } from 'react'
import { Eye, Plus, Upload } from 'lucide-react'
import { api, apiConfigured } from '../lib/api'
import { card, input, muted, Notice, primary, small } from './ui'
import { formatSize, openMaterial } from './Materials'

const STATUS = { draft: 'Nháp', in_review: 'Chờ duyệt', published: 'Đã xuất bản', hidden: 'Đã ẩn' }
const ACCEPT = '.pdf,.docx,.pptx,.xlsx,.doc,.ppt,.txt,.png,.jpg,.jpeg'

// Thao tác hợp lệ theo trạng thái + vai trò (API_SPECIFICATION.md §1b; 'publish' = admin xuất bản thẳng bản nháp).
// Server kiểm tra lại – đây chỉ để hiện nút.
function actionsFor(status, role) {
    const admin = role === 'admin'
    if (status === 'draft') return admin ? [['publish', 'Xuất bản ngay'], ['submit', 'Gửi duyệt']] : [['submit', 'Gửi duyệt']]
    if (!admin) return []
    if (status === 'in_review') return [['approve', 'Duyệt & xuất bản'], ['reject', 'Trả lại']]
    if (status === 'published') return [['hide', 'Ẩn']]
    if (status === 'hidden') return [['unhide', 'Hiện lại']]
    return []
}

function Status({ status }) {
    const tone = status === 'published' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
        : status === 'in_review' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            : 'bg-blossom-muted/15 text-blossom-muted dark:text-blossom-muted-dark'
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{STATUS[status] ?? status}</span>
}

function Workflow({ type, item, role, run, busy }) {
    return actionsFor(item.status, role).map(([action, label]) => (
        <button key={action} type="button" className={small} disabled={busy} onClick={() => run(type, item, action)}>{label}</button>
    ))
}

const emptyUpload = { subject_id: '', chapter_id: '', category_id: '', title: '', description: '' }

export default function AdminLibrary() {
    const [me, setMe] = useState(undefined)
    const [subjects, setSubjects] = useState([])
    const [categories, setCategories] = useState([])
    const [materials, setMaterials] = useState([])
    const [message, setMessage] = useState(null)
    const [busy, setBusy] = useState(false)
    const [newSubject, setNewSubject] = useState({ code: '', name: '' })
    const [chapterSubject, setChapterSubject] = useState('')
    const [newChapter, setNewChapter] = useState('')
    const [up, setUp] = useState(emptyUpload)
    const [file, setFile] = useState(null)
    const fail = (err) => setMessage({ error: true, text: err.message })

    const reload = useCallback(async () => {
        const [s, m] = await Promise.all([api('/admin/subjects'), api('/admin/materials')])
        setSubjects(s.data)
        setMaterials(m.data)
    }, [])

    useEffect(() => {
        if (!apiConfigured) return
        api('/me')
            .then(({ data }) => {
                setMe(data)
                if (data.role === 'user') return undefined
                return Promise.all([reload(), api('/material-categories').then(({ data: c }) => setCategories(c))]).catch(fail)
            }, (err) => {
                setMe(err.status === 401 ? null : false) // false: lỗi khác (khoá tài khoản, mạng...) – hiện đúng lỗi
                if (err.status !== 401) fail(err)
            })
    }, [reload])

    // Chạy thao tác rồi tải lại danh sách; lỗi giữ nguyên trạng thái hiện tại và báo cho người dùng.
    async function act(fn, done) {
        setBusy(true)
        setMessage(null)
        try {
            await fn()
            await reload()
            if (done) setMessage({ text: done })
        } catch (err) {
            fail(err)
        }
        setBusy(false)
    }

    const run = (type, item, action) => act(async () => {
        let body
        if (action === 'reject') {
            const note = window.prompt('Lý do trả lại:')
            if (!note?.trim()) throw new Error('Cần nhập lý do trả lại.')
            body = { note }
        }
        await api(`/admin/${type}/${item.id}/${action}`, { method: 'POST', body })
    }, 'Đã cập nhật trạng thái.')

    async function uploadMaterial(e) {
        e.preventDefault()
        if (!file) return fail(new Error('Chọn file cần tải lên.'))
        await act(async () => {
            const { data: u } = await api('/admin/materials/upload-url', {
                method: 'POST', body: { filename: file.name, mime_type: file.type, size_bytes: file.size },
            })
            const put = await fetch(u.upload_url, { method: 'PUT', headers: { 'Content-Type': u.content_type, 'x-upsert': 'false' }, body: file })
                .catch(() => { throw new Error('Không tải được file lên kho lưu trữ. Kiểm tra mạng và thử lại.') })
            if (!put.ok) throw new Error(`Kho lưu trữ từ chối file (HTTP ${put.status}).`)
            await api('/admin/materials', {
                method: 'POST',
                body: { ...up, chapter_id: up.chapter_id || null, storage_path: u.storage_path, original_filename: file.name },
            })
            setUp({ ...emptyUpload, subject_id: up.subject_id, category_id: up.category_id })
            setFile(null)
            e.target.reset()
        }, 'Đã tải lên – tài liệu đang ở trạng thái nháp.')
    }

    if (!apiConfigured) return <p className={card}>Chưa cấu hình máy chủ API.</p>
    if (me === undefined) return null
    if (me === false) return <Notice message={message} />
    if (me === null) return <p className={card}>Hãy đăng nhập ở trang Tài khoản để quản trị tài liệu.</p>
    if (me.role === 'user') return <p className={card}>Cần quyền biên tập viên hoặc quản trị viên.</p>

    const subjectOf = (id) => subjects.find((s) => s.id === id)
    const chapterList = subjectOf(chapterSubject)?.chapters ?? []

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Quản trị tài liệu</h1>
                <p className={muted}>
                    Nội dung mới luôn ở trạng thái nháp. Sinh viên chỉ thấy tài liệu khi tài liệu, môn và chương (nếu có) đều đã xuất bản.
                    {me.role === 'editor' && ' Biên tập viên gửi duyệt; quản trị viên duyệt và xuất bản.'}
                </p>
            </div>
            <Notice message={message} />

            <section className={`${card} space-y-4`} aria-labelledby="h-subjects">
                <h2 id="h-subjects" className="text-lg font-semibold">Môn học</h2>
                <form className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
                      onSubmit={(e) => { e.preventDefault(); act(async () => { await api('/admin/subjects', { method: 'POST', body: newSubject }); setNewSubject({ code: '', name: '' }) }, 'Đã tạo môn (nháp).') }}>
                    <label className="block text-sm">Mã môn
                        <input className={input} required maxLength={20} pattern="[A-Za-z0-9_]{2,20}" value={newSubject.code}
                               onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })} placeholder="VD: KTCT" />
                    </label>
                    <label className="block text-sm">Tên môn
                        <input className={input} required maxLength={200} value={newSubject.name}
                               onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} />
                    </label>
                    <button type="submit" disabled={busy} className={primary}><Plus size={16} /> Tạo môn</button>
                </form>
                <ul className="divide-y divide-blossom-border dark:divide-blossom-border-dark">
                    {subjects.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                            <span className="font-medium">{s.code}</span><span className="mr-auto">{s.name}</span>
                            <Status status={s.status} />
                            <Workflow type="subjects" item={s} role={me.role} run={run} busy={busy} />
                        </li>
                    ))}
                </ul>
            </section>

            <section className={`${card} space-y-4`} aria-labelledby="h-chapters">
                <h2 id="h-chapters" className="text-lg font-semibold">Chương</h2>
                <label className="block text-sm">Môn học
                    <select className={input} value={chapterSubject} onChange={(e) => setChapterSubject(e.target.value)}>
                        <option value="">Chọn môn</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
                    </select>
                </label>
                {chapterSubject && (
                    <>
                        <ul className="divide-y divide-blossom-border dark:divide-blossom-border-dark">
                            {chapterList.map((c) => (
                                <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                                    <span className="mr-auto">{c.position}. {c.title}</span>
                                    <Status status={c.status} />
                                    <Workflow type="chapters" item={c} role={me.role} run={run} busy={busy} />
                                </li>
                            ))}
                            {chapterList.length === 0 && <li className={`${muted} py-2`}>Môn này chưa có chương.</li>}
                        </ul>
                        <form className="flex flex-col gap-3 sm:flex-row sm:items-end"
                              onSubmit={(e) => { e.preventDefault(); act(async () => { await api(`/admin/subjects/${chapterSubject}/chapters`, { method: 'POST', body: { title: newChapter } }); setNewChapter('') }, 'Đã thêm chương (nháp).') }}>
                            <label className="block flex-1 text-sm">Tên chương mới
                                <input className={input} required maxLength={300} value={newChapter} onChange={(e) => setNewChapter(e.target.value)}
                                       placeholder="VD: Chương 1: Tổng quan" />
                            </label>
                            <button type="submit" disabled={busy} className={primary}><Plus size={16} /> Thêm chương</button>
                        </form>
                    </>
                )}
            </section>

            <section className={`${card} space-y-4`} aria-labelledby="h-upload">
                <h2 id="h-upload" className="text-lg font-semibold">Tải tài liệu lên</h2>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={uploadMaterial}>
                    <label className="block text-sm">Môn học
                        <select className={input} required value={up.subject_id} onChange={(e) => setUp({ ...up, subject_id: e.target.value, chapter_id: '' })}>
                            <option value="">Chọn môn</option>
                            {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
                        </select>
                    </label>
                    <label className="block text-sm">Chương (không bắt buộc)
                        <select className={input} value={up.chapter_id} disabled={!up.subject_id} onChange={(e) => setUp({ ...up, chapter_id: e.target.value })}>
                            <option value="">Không gắn chương</option>
                            {(subjectOf(up.subject_id)?.chapters ?? []).map((c) => <option key={c.id} value={c.id}>{c.position}. {c.title}</option>)}
                        </select>
                    </label>
                    <label className="block text-sm">Loại tài liệu
                        <select className={input} required value={up.category_id} onChange={(e) => setUp({ ...up, category_id: e.target.value })}>
                            <option value="">Chọn loại</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                    <label className="block text-sm">Tiêu đề
                        <input className={input} required maxLength={300} value={up.title} onChange={(e) => setUp({ ...up, title: e.target.value })} />
                    </label>
                    <label className="block text-sm sm:col-span-2">Mô tả (không bắt buộc)
                        <textarea className={input} maxLength={2000} rows={2} value={up.description} onChange={(e) => setUp({ ...up, description: e.target.value })} />
                    </label>
                    <label className="block text-sm sm:col-span-2">File (PDF, Word, PowerPoint, Excel, TXT, PNG, JPG – tối đa 50 MB)
                        <input className={input} type="file" required accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </label>
                    <div className="sm:col-span-2">
                        <button type="submit" disabled={busy} className={primary}><Upload size={16} /> {busy ? 'Đang xử lý…' : 'Tải lên'}</button>
                    </div>
                </form>
            </section>

            <section className={`${card} space-y-3`} aria-labelledby="h-materials">
                <h2 id="h-materials" className="text-lg font-semibold">Tài liệu</h2>
                {materials.length === 0 && <p className={muted}>Chưa có tài liệu.</p>}
                <ul className="divide-y divide-blossom-border dark:divide-blossom-border-dark">
                    {materials.map((m) => (
                        <li key={m.id} className="flex flex-wrap items-center gap-2 py-2">
                            <div className="mr-auto min-w-0">
                                <div className="font-medium">{m.title}</div>
                                <div className={muted}>
                                    {m.subject.code}{m.chapter ? ` · ${m.chapter.title}` : ''} · {m.original_filename} · {formatSize(m.size_bytes)}
                                    {m.status === 'published' && !m.publicly_visible && ' · chưa hiển thị: môn hoặc chương chưa xuất bản'}
                                </div>
                            </div>
                            <Status status={m.status} />
                            {m.mime_type === 'application/pdf' && (
                                <button type="button" className={small} onClick={() => openMaterial(m.id, 'view').catch(fail)} aria-label={`Xem trước ${m.title}`}>
                                    <Eye size={14} /> Xem
                                </button>
                            )}
                            <Workflow type="materials" item={m} role={me.role} run={run} busy={busy} />
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )
}
