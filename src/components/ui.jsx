// Class Tailwind dùng chung cho các trang gọi backend (Tài khoản, Tài liệu, Quản trị tài liệu).
export const card = 'rounded-2xl border card-accent border-white/40 bg-blossom-card/60 backdrop-blur-sm p-5 dark:border-white/10 dark:bg-blossom-card-dark/60 sm:p-6'
export const input = 'mt-1 w-full rounded-xl border border-blossom-border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blossom-accent focus:ring-2 focus:ring-blossom-accent/30 dark:border-blossom-border-dark'
export const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blossom-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.015] disabled:opacity-60 dark:bg-blossom-accent-dark'
export const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-blossom-border px-4 py-2.5 text-sm font-medium transition-all hover:bg-blossom-card-soft disabled:opacity-60 dark:border-blossom-border-dark dark:hover:bg-blossom-card-soft-dark'
export const small = 'inline-flex items-center gap-1.5 rounded-lg border border-blossom-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-blossom-card-soft disabled:opacity-60 dark:border-blossom-border-dark dark:hover:bg-blossom-card-soft-dark'
export const muted = 'text-sm text-blossom-muted dark:text-blossom-muted-dark'
export const ROLE_LABEL = { user: 'Người dùng', editor: 'Biên tập viên', admin: 'Quản trị viên' }

export function Notice({ message }) {
    if (!message) return null
    return (
        <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-red-600 dark:text-red-400' : ''}`}>
            {message.text}
        </p>
    )
}
