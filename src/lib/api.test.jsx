// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('./supabase', () => ({
    supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}))

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules() })

describe('api()', () => {
    test('gắn Bearer token và trả JSON', async () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com/')
        const fetch = vi.fn(async () => new Response(JSON.stringify({ data: { role: 'user' } }), { status: 200 }))
        vi.stubGlobal('fetch', fetch)
        const { api } = await import('./api')
        expect(await api('/me', { method: 'PATCH', body: { full_name: 'A' } })).toEqual({ data: { role: 'user' } })
        const [url, init] = fetch.mock.calls[0]
        expect(url).toBe('https://api.example.com/api/v1/me')
        expect(init.headers).toEqual({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' })
    })

    test("VITE_API_URL='/' → gọi /api/v1 cùng domain; để trống → chưa cấu hình", async () => {
        vi.stubEnv('VITE_API_URL', '/')
        const fetch = vi.fn(async () => new Response('{"data":[]}', { status: 200 }))
        vi.stubGlobal('fetch', fetch)
        const mod = await import('./api')
        expect(mod.apiConfigured).toBe(true)
        await mod.api('/subjects')
        expect(fetch.mock.calls[0][0]).toBe('/api/v1/subjects')
        vi.resetModules()
        vi.stubEnv('VITE_API_URL', '')
        const empty = await import('./api')
        expect(empty.apiConfigured).toBe(false)
        await expect(empty.api('/subjects')).rejects.toThrow('Chưa cấu hình VITE_API_URL')
    })

    test('lỗi server → Error mang message, status, code', async () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com')
        vi.stubGlobal('fetch', async () => new Response(
            JSON.stringify({ error: { code: 'ACCOUNT_BLOCKED', message: 'Tài khoản đã bị khoá.' } }), { status: 403 }))
        const { api } = await import('./api')
        await expect(api('/me')).rejects.toMatchObject({ message: 'Tài khoản đã bị khoá.', status: 403, code: 'ACCOUNT_BLOCKED' })
    })
})

test('mất mạng → thông báo tiếng Việt', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch') })
    const { api } = await import('./api')
    await expect(api('/me')).rejects.toThrow('Không kết nối được máy chủ')
})

test('trang Tài khoản: thiếu cấu hình Supabase → thông báo, không gọi mạng', async () => {
    vi.doMock('../lib/supabase', () => ({ supabase: null }))
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { default: Account } = await import('../components/Account')
    render(<Account />)
    expect(screen.getByText(/chưa được cấu hình/)).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
})
