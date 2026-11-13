import type { Page, Route } from '@playwright/test'

// Backend giả cho bản build có VITE_API_URL='/' (project "api" trong playwright.config.ts).
// Trả đúng hình dạng JSON của backend/routes/*.js; trạng thái nằm trong tiến trình test nên
// còn nguyên khi trang tải lại – đúng như máy chủ thật giữ lựa chọn và hạn nộp của lượt thi.

export const SUPABASE_URL = 'http://localhost:54321'
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const subject = { id: uuid(1), code: 'CNSAI', name: 'Nhập môn Công nghệ số và Ứng dụng Trí tuệ nhân tạo', description: 'Môn học trên máy chủ (dữ liệu giả cho E2E).' }
export const chapters = [
    { id: uuid(11), position: 1, title: 'Chương 1: Máy tính và các thiết bị ngoại vi' },
    { id: uuid(12), position: 2, title: 'Chương 2: Khai thác dữ liệu và thông tin' },
]
export const questions = Array.from({ length: 6 }, (_, i) => ({
    id: uuid(100 + i),
    chapter_id: chapters[i < 3 ? 0 : 1].id,
    topic_id: null,
    type: 'single_choice',
    difficulty: null,
    content: `Câu hỏi máy chủ số ${i + 1}?`,
    options: [{ id: uuid(200 + i * 2), content: `Đáp án đúng ${i + 1}` }, { id: uuid(201 + i * 2), content: `Đáp án sai ${i + 1}` }],
}))
export const materials = [
    { title: 'Giáo trình Nhập môn CNS & AI', original_filename: 'giao-trinh.pdf', mime_type: 'application/pdf', size_bytes: 2_480_000, category: { code: 'textbook', name: 'Giáo trình' } },
    { title: 'Slide Chương 2 – Khai thác dữ liệu', original_filename: 'slide-chuong-2.pptx', mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size_bytes: 5_100_000, category: { code: 'slides', name: 'Slide bài giảng' } },
].map((m, i) => ({
    id: uuid(500 + i), description: null, status: 'published', published_at: '2026-11-10T08:00:00.000Z', created_at: '2026-11-10T08:00:00.000Z',
    subject: { id: subject.id, code: subject.code, name: subject.name }, chapter: i ? { ...chapters[1] } : null, ...m,
}))
export const exam = { id: uuid(300), title: 'Đề kiểm tra giữa kỳ', subject_name: subject.name, question_count: 3, duration_minutes: 30 }
// Hạn nộp 12 phút: nếu UI tự đặt lại đồng hồ thay vì đọc deadline_at từ máy chủ sẽ hiện 30:00 → test bắt được.
export const ATTEMPT_MINUTES = 12

export type FakeApi = { requests: URL[]; saved: Map<string, string[]> }

export async function installFakeApi(page: Page, { answered = 2 } = {}): Promise<FakeApi> {
    const requests: URL[] = []
    const saved = new Map<string, string[]>()
    const answeredIds = new Set(questions.slice(0, answered).map((q) => q.id))
    let attempt: { id: string; started_at: string; deadline_at: string } | null = null

    const json = (route: Route, data: unknown, status = 200, meta?: unknown) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(meta ? { data, meta } : { data }) })
    const attemptBody = () => ({
        id: attempt!.id, exam_id: exam.id, title: exam.title, status: 'in_progress', started_at: attempt!.started_at,
        deadline_at: attempt!.deadline_at, server_now: new Date().toISOString(),
        questions: questions.slice(0, 3).map(({ id, type, content, options }) => ({ id, type, content, options, selected_option_ids: saved.get(id) ?? [] })),
    })

    // Supabase Auth chỉ được đọc từ localStorage; chặn mọi request tới đó để không phụ thuộc mạng.
    await page.route(`${SUPABASE_URL}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    await page.route('**/api/v1/**', async (route) => {
        const url = new URL(route.request().url())
        const method = route.request().method()
        const path = url.pathname.replace('/api/v1', '')
        requests.push(url)

        if (method === 'GET' && path === '/dashboard') {
            return json(route, {
                totals: { subjects: 1, materials: 0, exams: 1 }, recent_materials: [], available_exams: [], attempts_count: 0,
                subjects: [{ ...subject, question_count: questions.length, answered_count: answeredIds.size, last_answered_at: '2026-11-12T08:00:00.000Z' }],
            })
        }
        if (method === 'GET' && path === '/subjects') return json(route, [{ ...subject, chapters, material_count: 0 }])
        if (method === 'GET' && path === `/subjects/${subject.code}`) {
            return json(route, { ...subject, topics: [], chapters: chapters.map((c) => ({ ...c, description: null, question_count: 3 })) })
        }
        if (method === 'GET' && path === '/practice/questions') {
            const chapter = url.searchParams.get('chapter_id')
            const rows = questions.filter((q) => !chapter || q.chapter_id === chapter)
                .map((q) => ({ ...q, answered: answeredIds.has(q.id), bookmarked: false }))
            return json(route, rows, 200, { page: 1, has_more: false })
        }
        if (method === 'POST' && path === '/practice/answers') {
            const { question_id, selected_option_ids } = route.request().postDataJSON()
            const q = questions.find((item) => item.id === question_id)!
            answeredIds.add(q.id)
            return json(route, { is_correct: selected_option_ids[0] === q.options[0].id, correct_option_ids: [q.options[0].id], explanation: 'Lời giải từ máy chủ.' })
        }
        if (method === 'GET' && path === '/material-categories') return json(route, materials.map((m) => m.category))
        if (method === 'GET' && path === '/materials') return json(route, materials, 200, { page: 1, limit: 20, total: materials.length })
        if (method === 'GET' && path === '/me/favorites/materials') return json(route, [])
        if (method === 'GET' && path === '/exams') return json(route, [exam])
        if (method === 'GET' && path === `/exams/${exam.id}`) {
            return json(route, { ...exam, description: null, closes_at: null, max_attempts: null, attempts_count: 0, active_attempt_id: attempt?.id ?? null })
        }
        if (method === 'GET' && path.startsWith('/me/attempts')) return json(route, [], 200, { has_more: false })
        if (method === 'POST' && path === `/exams/${exam.id}/attempts`) {
            const now = Date.now()
            attempt ??= { id: uuid(400), started_at: new Date(now).toISOString(), deadline_at: new Date(now + ATTEMPT_MINUTES * 60_000).toISOString() }
            return json(route, { id: attempt.id }, 201)
        }
        if (attempt && method === 'GET' && path === `/attempts/${attempt.id}`) return json(route, attemptBody())
        const answer = attempt && path.match(new RegExp(`^/attempts/${attempt.id}/answers/(.+)$`))
        if (answer && method === 'PUT') {
            saved.set(answer[1], route.request().postDataJSON().selected_option_ids)
            return route.fulfill({ status: 204 })
        }
        return json(route, { error: { code: 'NOT_FOUND', message: `Fake API chưa hỗ trợ ${method} ${path}` } }, 404)
    })
    return { requests, saved }
}

// Phiên Supabase giả đặt sẵn trong localStorage (supabase-js đọc khoá sb-<host>-auth-token, không gọi mạng khi token còn hạn).
export async function signIn(page: Page) {
    const exp = Math.floor(Date.now() / 1000) + 24 * 3600
    const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const user = {
        id: uuid(900), aud: 'authenticated', role: 'authenticated', email: 'sinhvien@example.test',
        app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Nguyễn Minh An' }, created_at: '2026-11-01T00:00:00.000Z',
    }
    const session = {
        access_token: `${b64({ alg: 'ES256', typ: 'JWT' })}.${b64({ sub: user.id, exp, role: 'authenticated' })}.e2e`,
        refresh_token: 'e2e-refresh', token_type: 'bearer', expires_in: 24 * 3600, expires_at: exp, user,
    }
    const key = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
    await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v) }, [key, JSON.stringify(session)])
}
