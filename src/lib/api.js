import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')

export const apiConfigured = Boolean(BASE)

// Gọi backend /api/v1, tự gắn access token (getSession tự làm mới token hết hạn).
// Lỗi → Error có message tiếng Việt từ server + status/code để UI phân nhánh.
export async function api(path, { method = 'GET', body } = {}) {
    if (!BASE) throw new Error('Chưa cấu hình VITE_API_URL.')
    const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined
    const res = await fetch(`${BASE}/api/v1${path}`, {
        method,
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => {
        throw new Error('Không kết nối được máy chủ. Kiểm tra mạng và thử lại.')
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
        const err = new Error(data?.error?.message || `Lỗi máy chủ (${res.status}).`)
        err.status = res.status
        err.code = data?.error?.code
        throw err
    }
    return data
}
