import {
    BookOpen, ChevronRight, Database, GraduationCap,
    Layers, Library, LayoutDashboard, Menu, PenLine, UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import ThemeToggle from './ThemeToggle'

const learning = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'subjects', label: 'Môn học', icon: BookOpen },
    { id: 'practice', label: 'Ôn tập', icon: GraduationCap },
    { id: 'flashcard', label: 'Flashcard', icon: Layers },
    { id: 'exam', label: 'Thi thử', icon: PenLine },
    { id: 'materials', label: 'Tài liệu', icon: Library },
]
const settings = [
    { id: 'admin', label: 'Quản lý dữ liệu', icon: Database },
    { id: 'account', label: 'Tài khoản', icon: UserRound },
]
const adminLabels = { 'exam-admin': 'Quản trị đề thi', 'library-admin': 'Quản trị tài liệu', 'stats-admin': 'Thống kê quản trị' }
// Thanh tab dưới (di động): 4 lối chính + "Thêm" chứa phần còn lại
const tabIds = ['dashboard', 'practice', 'exam', 'materials']
const all = [...learning, ...settings]
const tabs = tabIds.map((id) => all.find((item) => item.id === id))
const more = all.filter(({ id }) => !tabIds.includes(id))

function Brand({ onClick }) {
    return (
        <button type="button" className="workspace-brand" onClick={onClick}>
            <span className="workspace-mark"><GraduationCap size={22} strokeWidth={1.8} aria-hidden="true" /></span>
            <span className="workspace-brand-text"><strong>VNU Quiz<i aria-hidden="true">.</i></strong><small>Một góc nhỏ để học</small></span>
        </button>
    )
}

export default function Layout({ page, setPage, session, children }) {
    const [moreOpen, setMoreOpen] = useState(false)
    const moreButton = useRef(null)
    const sheet = useRef(null)
    const { isDark, toggleTheme } = useTheme()
    const label = all.find(({ id }) => id === page)?.label ?? adminLabels[page] ?? 'Trang hiện tại'
    const fullName = session?.user.user_metadata?.full_name
    const firstName = typeof fullName === 'string' ? fullName.trim().split(/\s+/).at(-1) : ''
    const accountLabel = session ? firstName || 'Tài khoản' : session === null ? 'Đăng nhập' : 'Tài khoản'
    const moreActive = more.some(({ id }) => id === page) || page in adminLabels

    useEffect(() => {
        if (moreOpen) sheet.current?.querySelector('button')?.focus()
    }, [moreOpen])

    function navigate(id) {
        setPage(id)
        if (moreOpen) {
            setMoreOpen(false)
            moreButton.current?.focus()
        }
    }

    function closeMore() {
        setMoreOpen(false)
        moreButton.current?.focus()
    }

    const navigation = (items) => items.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" title={label} onClick={() => navigate(id)}
                aria-current={page === id ? 'page' : undefined} className="workspace-nav-item">
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
        </button>
    ))

    return (
        <div className="workspace">
            <a className="skip-link" href="#noi-dung">Đến nội dung chính</a>
            <header className="workspace-rail">
                <Brand onClick={() => navigate('dashboard')} />
                <nav id="workspace-nav" aria-label="Điều hướng chính" className="workspace-nav">
                    <div className="workspace-nav-group">
                        <p className="workspace-nav-label">Học tập</p>
                        {navigation(learning)}
                    </div>
                    <div className="workspace-nav-group workspace-nav-settings">
                        <p className="workspace-nav-label">Cài đặt</p>
                        {navigation(settings)}
                    </div>
                </nav>
                <div className="workspace-rail-note">VNU Digital & AI</div>
            </header>
            <div className="workspace-content">
                <div className="workspace-topbar">
                    <Brand onClick={() => navigate('dashboard')} />
                    <span className="workspace-crumbs">Không gian học tập <ChevronRight size={14} aria-hidden="true" /> <strong>{label}</strong></span>
                    <div className="workspace-actions">
                        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                        <button type="button" className="account-chip" aria-current={page === 'account' ? 'page' : undefined} onClick={() => navigate('account')}>
                            <span className="account-chip-avatar"><UserRound size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                            <span>{accountLabel}</span>
                        </button>
                    </div>
                </div>
                <main id="noi-dung" className="workspace-main" tabIndex={-1}>{children}</main>
            </div>
            <nav className="workspace-tabbar" aria-label="Điều hướng nhanh">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" className="workspace-tab" aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}>
                        <span className="workspace-tab-pill"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span>{label}
                    </button>
                ))}
                <button ref={moreButton} type="button" className="workspace-tab" aria-haspopup="dialog" aria-expanded={moreOpen}
                        aria-current={moreActive && !moreOpen ? 'page' : undefined} onClick={() => setMoreOpen(!moreOpen)}>
                    <span className="workspace-tab-pill"><Menu size={20} strokeWidth={1.8} aria-hidden="true" /></span>Thêm
                </button>
            </nav>
            {moreOpen && <>
                <div className="workspace-sheet-backdrop" onClick={closeMore} />
                <div ref={sheet} className="workspace-sheet" role="dialog" aria-modal="true" aria-label="Thêm"
                     onKeyDown={(event) => { if (event.key === 'Escape') closeMore() }}>
                    <h2>Thêm</h2>
                    {navigation(more)}
                </div>
            </>}
        </div>
    )
}
