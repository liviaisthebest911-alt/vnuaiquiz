import {
    BookOpen, BrainCircuit, ChevronRight, Database, GraduationCap,
    Layers, Library, LayoutDashboard, Menu, PenLine, UserRound, X,
} from 'lucide-react'
import { useState } from 'react'
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

export default function Layout({ page, setPage, children }) {
    const [open, setOpen] = useState(false)
    const { isDark, toggleTheme } = useTheme()
    const label = [...learning, ...settings].find(({ id }) => id === page)?.label ?? adminLabels[page] ?? 'Trang hiện tại'

    function navigate(id) {
        setPage(id)
        setOpen(false)
    }

    const navigation = (items) => items.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" title={label} onClick={() => navigate(id)}
                aria-current={page === id ? 'page' : undefined} className="workspace-nav-item">
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
        </button>
    ))

    return (
        <div className="workspace">
            <a className="skip-link" href="#noi-dung">Đến nội dung chính</a>
            <header className="workspace-rail">
                <div className="workspace-brand-row">
                    <button type="button" className="workspace-brand" onClick={() => navigate('dashboard')}>
                        <span className="workspace-mark"><BrainCircuit size={23} strokeWidth={1.7} aria-hidden="true" /></span>
                        <span className="workspace-brand-text"><strong>VNU Quiz</strong><small>Không gian học tập</small></span>
                    </button>
                    <div className="workspace-mobile-tools">
                        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                        <button type="button" aria-label="Mở menu" aria-controls="workspace-nav" aria-expanded={open}
                                className="workspace-menu" onClick={() => setOpen(!open)}>
                            {open ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
                <nav id="workspace-nav" aria-label="Điều hướng chính" className={`workspace-nav${open ? ' is-open' : ''}`}
                     onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
                    <div className="workspace-nav-group">{navigation(learning)}</div>
                    <div className="workspace-nav-group workspace-nav-settings">{navigation(settings)}</div>
                </nav>
                <div className="workspace-rail-note">VNU Digital & AI</div>
            </header>
            <div className="workspace-content">
                <div className="workspace-topbar">
                    <span>Không gian học tập <ChevronRight size={14} aria-hidden="true" /> <strong>{label}</strong></span>
                    <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                </div>
                <main id="noi-dung" className="workspace-main" tabIndex={-1}>{children}</main>
            </div>
        </div>
    )
}
