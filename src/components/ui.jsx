// Class Tailwind dùng chung cho các trang gọi backend (Tài khoản, Tài liệu, Quản trị…). Màu lấy từ token (tailwind.config.js).
export const card = 'rounded-2xl border border-blossom-border bg-blossom-card p-5 sm:p-6'
export const input = 'mt-1 min-h-[46px] w-full rounded-xl border border-blossom-border bg-blossom-card px-4 py-2.5 text-sm text-blossom-text outline-none transition-colors focus:border-cloud-deep focus:ring-2 focus:ring-cloud-deep/25'
export const primary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-blossom-accent px-5 py-2.5 text-sm font-bold text-[rgb(var(--c-on-cta))] transition-[transform,background-color] hover:scale-[1.02] hover:bg-blossom-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
export const secondary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-blossom-border bg-blossom-card px-5 py-2.5 text-sm font-semibold text-blossom-text transition-[transform,border-color] hover:scale-[1.02] hover:border-cloud active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
export const small = 'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-blossom-border px-3 py-1.5 text-xs font-semibold transition-[transform,border-color] hover:border-cloud active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'
export const muted = 'text-sm text-blossom-muted'
export const ROLE_LABEL = { user: 'Người dùng', editor: 'Biên tập viên', admin: 'Quản trị viên' }

export function Notice({ message }) {
    if (!message) return null
    return (
        <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'font-medium text-petal-ink' : 'text-cloud-ink'}`}>
            {message.text}
        </p>
    )
}
