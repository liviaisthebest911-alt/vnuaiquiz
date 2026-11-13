import { useEffect, useState } from 'react'
import { Library, LogIn, LogOut, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api, apiConfigured } from '../lib/api'
import { card, input, primary, secondary, ROLE_LABEL, Notice } from './ui'

const authMessage = (error) =>
    /invalid login credentials/i.test(error.message) ? 'Email hoặc mật khẩu không đúng.'
        : /email not confirmed/i.test(error.message) ? 'Email chưa được xác nhận – kiểm tra hộp thư.'
            : /already registered/i.test(error.message) ? 'Email này đã có tài khoản.'
                : error.message

export default function Account({ onNavigate }) {
    const [session, setSession] = useState(null)
    const [ready, setReady] = useState(!supabase)

    useEffect(() => {
        if (!supabase) return undefined
        supabase.auth.getSession()
            .then(({ data }) => setSession(data.session), () => setSession(null))
            .finally(() => setReady(true))
        const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
        return () => data.subscription.unsubscribe()
    }, [])

    return (
        <div className="mx-auto max-w-xl space-y-5">
            <h1 className="text-2xl font-bold">Tài khoản</h1>
            {!supabase ? (
                <p className={card}>Chức năng đăng nhập chưa được cấu hình trên bản triển khai này.</p>
            ) : !ready ? null : session ? (
                <Profile email={session.user.email} onNavigate={onNavigate} />
            ) : (
                <LoginForm />
            )}
        </div>
    )
}

function LoginForm() {
    const [mode, setMode] = useState('signin')
    const [form, setForm] = useState({ email: '', password: '', fullName: '' })
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState(null)
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

    async function submit(e) {
        e.preventDefault()
        setBusy(true)
        setMessage(null)
        const { email, password, fullName } = form
        const { data, error } = mode === 'signin'
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({
                email, password,
                options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() || undefined } },
            })
        setBusy(false)
        if (error) setMessage({ error: true, text: authMessage(error) })
        else if (mode === 'signup' && !data.session) setMessage({ text: 'Đã gửi email xác nhận – mở liên kết trong email để hoàn tất đăng ký.' })
    }

    async function google() {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
        if (error) setMessage({ error: true, text: authMessage(error) })
    }

    return (
        <div className={`${card} space-y-4`}>
            <button type="button" onClick={google} className={`${secondary} w-full`}>Tiếp tục với Google</button>
            <div className="text-center text-xs text-blossom-muted dark:text-blossom-muted-dark">hoặc dùng email</div>
            <form onSubmit={submit} className="space-y-3">
                {mode === 'signup' && (
                    <label className="block text-sm">Họ và tên
                        <input className={input} value={form.fullName} onChange={set('fullName')} maxLength={100} autoComplete="name" />
                    </label>
                )}
                <label className="block text-sm">Email
                    <input className={input} type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
                </label>
                <label className="block text-sm">Mật khẩu
                    <input className={input} type="password" required minLength={6} value={form.password} onChange={set('password')}
                           autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
                </label>
                <Notice message={message} />
                <button type="submit" disabled={busy} className={`${primary} w-full`}>
                    {mode === 'signin' ? <><LogIn size={16} /> Đăng nhập</> : <><UserPlus size={16} /> Đăng ký</>}
                </button>
            </form>
            <button type="button" className="w-full text-sm text-blossom-accent dark:text-blossom-accent-dark"
                    onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null) }}>
                {mode === 'signin' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
            </button>
        </div>
    )
}

function Profile({ email, onNavigate }) {
    const [me, setMe] = useState(null)
    const [form, setForm] = useState({ full_name: '', student_code: '' })
    const [message, setMessage] = useState(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!apiConfigured) {
            setMessage({ error: true, text: 'Chưa cấu hình máy chủ API – chưa xem/sửa được hồ sơ.' })
            return
        }
        api('/me').then(({ data }) => {
            setMe(data)
            setForm({ full_name: data.full_name ?? '', student_code: data.student_code ?? '' })
        }).catch((err) => setMessage({ error: true, text: err.message }))
    }, [])

    async function save(e) {
        e.preventDefault()
        setBusy(true)
        try {
            const { data } = await api('/me', { method: 'PATCH', body: form })
            setMe(data)
            setForm({ full_name: data.full_name ?? '', student_code: data.student_code ?? '' }) // hiện giá trị đã chuẩn hoá (vd mã SV viết hoa)
            setMessage({ text: 'Đã lưu.' })
        } catch (err) {
            setMessage({ error: true, text: err.message })
        }
        setBusy(false)
    }

    return (
        <div className={`${card} space-y-4`}>
            <div>
                <div className="font-semibold">{me?.email ?? email}</div>
                {me && <div className="text-sm text-blossom-muted dark:text-blossom-muted-dark">Vai trò: {ROLE_LABEL[me.role] ?? me.role}</div>}
            </div>
            {me && (
                <form onSubmit={save} className="space-y-3">
                    <label className="block text-sm">Họ và tên
                        <input className={input} value={form.full_name} maxLength={100}
                               onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    </label>
                    <label className="block text-sm">Mã sinh viên
                        <input className={input} value={form.student_code} maxLength={20} pattern="[0-9A-Za-z]*"
                               onChange={(e) => setForm({ ...form, student_code: e.target.value })} />
                    </label>
                    <button type="submit" disabled={busy} className={primary}>Lưu</button>
                </form>
            )}
            <Notice message={message} />
            {['editor', 'admin'].includes(me?.role) && onNavigate && (
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onNavigate('library-admin')} className={primary}>
                        <Library size={16} /> Quản trị tài liệu
                    </button>
                    <button type="button" onClick={() => onNavigate('exam-admin')} className={secondary}>Quản trị đề thi</button>
                    <button type="button" onClick={() => onNavigate('stats-admin')} className={secondary}>Thống kê quản trị</button>
                </div>
            )}
            <button type="button" onClick={() => supabase.auth.signOut()} className={secondary}>
                <LogOut size={16} /> Đăng xuất
            </button>
        </div>
    )
}
