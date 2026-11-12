import { useEffect, useState } from 'react'
import { Download, Eye, Search } from 'lucide-react'
import { api, apiConfigured } from '../lib/api'
import { card, input, muted, Notice, primary, small } from './ui'

const PAGE_SIZE = 20

export const formatSize = (bytes) => {
    const n = Number(bytes)
    return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}

// Mở signed URL (hết hạn sau 5 phút) – xin URL ngay lúc bấm, không lưu lại.
// Tab mới mở đồng bộ trong sự kiện click để trình duyệt không chặn popup, sau đó mới gán URL.
export async function openMaterial(id, kind) {
    const tab = kind === 'view' ? window.open('', '_blank') : null
    if (kind === 'view' && !tab) throw new Error('Trình duyệt đã chặn cửa sổ mới – hãy cho phép popup để xem tài liệu.')
    try {
        const { data } = await api(`/materials/${id}/${kind}`)
        if (tab) {
            tab.opener = null
            tab.location.href = data.url
        } else {
            window.location.assign(data.url) // Content-Disposition: attachment → tải về, không rời trang
        }
    } catch (err) {
        tab?.close()
        throw err
    }
}

export default function Materials() {
    const [subjects, setSubjects] = useState([])
    const [q, setQ] = useState('')
    const [filters, setFilters] = useState({ q: '', subject_id: '', chapter_id: '', page: 1 })
    const [result, setResult] = useState(null)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        if (!apiConfigured) return
        api('/subjects').then(({ data }) => setSubjects(data)).catch((err) => setMessage({ error: true, text: err.message }))
    }, [])

    useEffect(() => {
        if (!apiConfigured) return
        const params = new URLSearchParams({ page: String(filters.page), limit: String(PAGE_SIZE) })
        for (const k of ['q', 'subject_id', 'chapter_id']) if (filters[k]) params.set(k, filters[k])
        let current = true // bỏ kết quả của yêu cầu cũ nếu người dùng đã đổi bộ lọc
        api(`/materials?${params}`)
            .then((r) => current && setResult(r))
            .catch((err) => current && setMessage({ error: true, text: err.message }))
        return () => { current = false }
    }, [filters])

    if (!apiConfigured) {
        return <p className={card}>Kho tài liệu chưa được cấu hình trên bản triển khai này.</p>
    }

    const chapters = subjects.find((s) => s.id === filters.subject_id)?.chapters ?? []
    const totalPages = result ? Math.max(1, Math.ceil(result.meta.total / PAGE_SIZE)) : 1
    const open = (id, kind) => openMaterial(id, kind).catch((err) => setMessage({ error: true, text: err.message }))

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-bold">Tài liệu</h1>

            <form
                className={`${card} grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end`}
                onSubmit={(e) => { e.preventDefault(); setMessage(null); setFilters({ ...filters, q: q.trim(), page: 1 }) }}
            >
                <label className="block text-sm">Tìm theo tên
                    <input className={input} type="search" value={q} maxLength={200} onChange={(e) => setQ(e.target.value)} placeholder="Ví dụ: giáo trình" />
                </label>
                <label className="block text-sm">Môn học
                    <select className={input} value={filters.subject_id}
                            onChange={(e) => setFilters({ ...filters, subject_id: e.target.value, chapter_id: '', page: 1 })}>
                        <option value="">Tất cả môn</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
                    </select>
                </label>
                <label className="block text-sm">Chương
                    <select className={input} value={filters.chapter_id} disabled={!filters.subject_id}
                            onChange={(e) => setFilters({ ...filters, chapter_id: e.target.value, page: 1 })}>
                        <option value="">Tất cả chương</option>
                        {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </label>
                <button type="submit" className={primary}><Search size={16} /> Tìm</button>
            </form>

            <Notice message={message} />

            {result && (
                <section aria-label="Kết quả" className="space-y-3">
                    <p className={muted}>{result.meta.total} tài liệu</p>
                    {result.data.length === 0 && <p className={card}>Không có tài liệu phù hợp.</p>}
                    {result.data.map((m) => (
                        <article key={m.id} className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                            <div className="min-w-0">
                                <h2 className="font-semibold">{m.title}</h2>
                                <p className={muted}>
                                    {m.subject.code}{m.chapter ? ` · ${m.chapter.title}` : ''} · {m.category.name} · {m.original_filename.split('.').pop().toUpperCase()} · {formatSize(m.size_bytes)}
                                </p>
                                {m.description && <p className="mt-1 text-sm">{m.description}</p>}
                            </div>
                            <div className="flex shrink-0 gap-2">
                                {m.mime_type === 'application/pdf' && (
                                    <button type="button" className={small} onClick={() => open(m.id, 'view')} aria-label={`Xem ${m.title}`}>
                                        <Eye size={14} /> Xem
                                    </button>
                                )}
                                <button type="button" className={small} onClick={() => open(m.id, 'download')} aria-label={`Tải xuống ${m.title}`}>
                                    <Download size={14} /> Tải xuống
                                </button>
                            </div>
                        </article>
                    ))}
                    {totalPages > 1 && (
                        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Phân trang">
                            <button type="button" className={small} disabled={filters.page <= 1}
                                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Trước</button>
                            <span>Trang {filters.page}/{totalPages}</span>
                            <button type="button" className={small} disabled={filters.page >= totalPages}
                                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Sau</button>
                        </nav>
                    )}
                </section>
            )}
        </div>
    )
}
