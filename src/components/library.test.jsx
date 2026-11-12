// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const calls = []
let responses
vi.mock('../lib/api', () => ({
    apiConfigured: true,
    api: vi.fn(async (path, opts) => {
        calls.push([path, opts?.method ?? 'GET', opts?.body])
        const key = Object.keys(responses).find((k) => path.startsWith(k))
        const r = typeof responses[key] === 'function' ? responses[key](path) : responses[key]
        if (r instanceof Error) throw r
        return r
    }),
}))

const SUBJECT = { id: 's1', code: 'CNSAI', name: 'Công nghệ số', chapters: [{ id: 'c1', title: 'Chương 1', position: 1 }] }
const PDF = {
    id: 'm1', title: 'Giáo trình', description: null, mime_type: 'application/pdf', original_filename: 'gt.pdf', size_bytes: '2097152',
    subject: { id: 's1', code: 'CNSAI', name: 'Công nghệ số' }, chapter: { id: 'c1', title: 'Chương 1', position: 1 }, category: { code: 'textbook', name: 'Giáo trình' },
}
const DOCX = { ...PDF, id: 'm2', title: 'Đề cương', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', original_filename: 'dc.docx' }

beforeEach(() => { calls.length = 0 })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('trang Tài liệu (sinh viên)', () => {
    beforeEach(() => {
        responses = {
            '/subjects': { data: [SUBJECT] },
            '/materials?': { data: [PDF, DOCX], meta: { page: 1, limit: 20, total: 2 } },
            '/materials/m1/view': { data: { url: 'https://storage.example/signed.pdf' } },
        }
    })

    test('hiện danh sách; chỉ PDF có nút Xem; lọc theo môn/chương và tìm theo tên gửi đúng tham số', async () => {
        const { default: Materials } = await import('./Materials')
        render(<Materials />)
        expect(await screen.findByText('2 tài liệu')).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Xem Giáo trình' })).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Xem Đề cương' })).toBeNull()
        expect(screen.getAllByText(/PDF · 2\.0 MB/)).toHaveLength(1)

        const [chapter] = screen.getAllByRole('combobox').slice(1)
        expect(chapter.disabled).toBe(true)
        fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 's1' } })
        await waitFor(() => expect(calls.at(-1)[0]).toBe('/materials?page=1&limit=20&subject_id=s1'))
        fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'c1' } })
        await waitFor(() => expect(calls.at(-1)[0]).toContain('chapter_id=c1'))
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  giáo trình ' } })
        fireEvent.click(screen.getByRole('button', { name: /Tìm/ }))
        await waitFor(() => expect(calls.at(-1)[0]).toBe('/materials?page=1&limit=20&q=gi%C3%A1o+tr%C3%ACnh&subject_id=s1&chapter_id=c1'))
    })

    test('Xem: mở tab mới ngay khi bấm rồi mới gán signed URL; lỗi → đóng tab, báo lỗi', async () => {
        const tab = { location: { href: '' }, close: vi.fn() }
        vi.stubGlobal('open', vi.fn(() => tab))
        const { default: Materials } = await import('./Materials')
        render(<Materials />)
        fireEvent.click(await screen.findByRole('button', { name: 'Xem Giáo trình' }))
        await waitFor(() => expect(tab.location.href).toBe('https://storage.example/signed.pdf'))
        expect(tab.opener).toBeNull()

        responses['/materials/m1/view'] = Object.assign(new Error('Không tìm thấy tài liệu.'), { status: 404 })
        fireEvent.click(screen.getByRole('button', { name: 'Xem Giáo trình' }))
        expect(await screen.findByRole('alert')).toBeTruthy()
        expect(tab.close).toHaveBeenCalled()
    })

    test('popup bị chặn → báo lỗi, không chuyển cả trang sang PDF', async () => {
        vi.stubGlobal('open', vi.fn(() => null))
        const { default: Materials } = await import('./Materials')
        render(<Materials />)
        fireEvent.click(await screen.findByRole('button', { name: 'Xem Giáo trình' }))
        expect((await screen.findByRole('alert')).textContent).toMatch(/chặn cửa sổ mới/)
        expect(calls.some(([p]) => p.endsWith('/view'))).toBe(false) // dừng trước khi xin URL → không thể chuyển trang
    })
})

describe('trang Quản trị tài liệu', () => {
    const subjects = [{ ...SUBJECT, status: 'draft', chapters: [] }]
    const setup = (role) => {
        responses = {
            '/me': { data: { role, email: 'a@hus.edu.vn' } },
            '/admin/subjects': { data: subjects },
            '/admin/materials': { data: [{ ...PDF, status: 'in_review', publicly_visible: false }] },
            '/material-categories': { data: [{ id: 'k1', code: 'textbook', name: 'Giáo trình' }] },
        }
    }

    test('user thường: thông báo cần quyền, không gọi API quản trị', async () => {
        setup('user')
        const { default: AdminLibrary } = await import('./AdminLibrary')
        render(<AdminLibrary />)
        expect(await screen.findByText(/Cần quyền biên tập viên/)).toBeTruthy()
        expect(calls.some(([p]) => p.startsWith('/admin'))).toBe(false)
    })

    test('lỗi khác 401 (vd tài khoản bị khoá) → hiện đúng lỗi, không bảo "hãy đăng nhập"', async () => {
        setup('admin')
        responses['/me'] = Object.assign(new Error('Tài khoản đã bị khoá.'), { status: 403 })
        const { default: AdminLibrary } = await import('./AdminLibrary')
        render(<AdminLibrary />)
        expect((await screen.findByRole('alert')).textContent).toBe('Tài khoản đã bị khoá.')
        expect(screen.queryByText(/Hãy đăng nhập/)).toBeNull()
    })

    test('editor: chỉ có nút Gửi duyệt, không có nút duyệt/xuất bản', async () => {
        setup('editor')
        const { default: AdminLibrary } = await import('./AdminLibrary')
        render(<AdminLibrary />)
        expect(await screen.findByRole('button', { name: 'Gửi duyệt' })).toBeTruthy()
        expect(screen.queryByRole('button', { name: /Xuất bản ngay|Duyệt & xuất bản|Ẩn/ })).toBeNull()
    })

    test('admin: "Xuất bản ngay" = một lệnh publish; tài liệu chờ duyệt có Duyệt/Trả lại', async () => {
        setup('admin')
        const { default: AdminLibrary } = await import('./AdminLibrary')
        render(<AdminLibrary />)
        expect(await screen.findByRole('button', { name: 'Duyệt & xuất bản' })).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Trả lại' })).toBeTruthy()
        responses['/admin/subjects/'] = { data: {} }
        fireEvent.click(screen.getByRole('button', { name: 'Xuất bản ngay' }))
        await waitFor(() => expect(calls.filter(([, m]) => m === 'POST').map(([p]) => p)).toEqual(['/admin/subjects/s1/publish']))
    })
})
