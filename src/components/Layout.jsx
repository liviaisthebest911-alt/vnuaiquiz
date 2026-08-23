import {
    BrainCircuit,
    Database,
    GraduationCap,
    Layers,
    LayoutDashboard,
    Menu,
    PenLine,
    X,
} from 'lucide-react'

import { useState } from 'react'

import { useTheme } from '../hooks/useTheme'
import ThemeToggle from './ThemeToggle'
import AppBackground from './AppBackground'

const navItems = [
    {
        id: 'dashboard',
        label: 'Tổng quan',
        icon: LayoutDashboard,
    },
    {
        id: 'practice',
        label: 'Ôn tập',
        icon: GraduationCap,
    },
    {
        id: 'flashcard',
        label: 'Flashcard',
        icon: Layers,
    },
    {
        id: 'exam',
        label: 'Thi thử',
        icon: PenLine,
    },
    {
        id: 'admin',
        label: 'Quản lý dữ liệu',
        icon: Database,
    },
]

export default function Layout({
                                   page,
                                   setPage,
                                   children,
                               }) {
    const [open, setOpen] = useState(false)
    const { isDark, toggleTheme } = useTheme()

    const navigate = (id) => {
        setPage(id)
        setOpen(false)
    }

    return (
        // Nền trong suốt để lộ gradient của <body> (index.css) + AppBackground orbs
        <div className="min-h-screen text-blossom-text dark:text-blossom-text-dark">
            <AppBackground />

            {/* ==================================================================
                HEADER — tối giản: viền mỏng thay vì shadow, không backdrop-blur nặng
               ================================================================== */}
            <header className="sticky top-0 z-40 border-b border-blossom-border bg-blossom-bg/90 backdrop-blur-sm dark:border-blossom-border-dark dark:bg-blossom-bg-dark/90">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

                    {/* Logo / tên dự án */}
                    <button
                        onClick={() => navigate('dashboard')}
                        className="flex items-center gap-3 text-left transition-transform hover:scale-[1.015] active:scale-[0.985]"
                    >
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blossom-accent text-white dark:bg-blossom-accent-dark">
                            <BrainCircuit size={22} />
                        </div>

                        <div>
                            <div className="text-sm font-bold text-blossom-accent dark:text-blossom-accent-dark">
                                VNU DIGITAL & AI
                            </div>

                            <div className="text-xs text-blossom-muted dark:text-blossom-muted-dark">
                                Ôn tập & Thi thử
                            </div>
                        </div>
                    </button>

                    {/* Thanh điều hướng — gọn nhẹ */}
                    <nav className="hidden items-center gap-1 md:flex">
                        {navItems.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => navigate(id)}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:scale-[1.015] active:scale-[0.985] ${
                                    page === id
                                        ? 'bg-blossom-accent/10 text-blossom-accent dark:bg-blossom-accent-dark/15 dark:text-blossom-accent-dark'
                                        : 'text-blossom-muted hover:bg-blossom-card-soft hover:text-blossom-text dark:text-blossom-muted-dark dark:hover:bg-blossom-card-soft-dark dark:hover:text-blossom-text-dark'
                                }`}
                            >
                                <Icon size={17} />
                                {label}
                            </button>
                        ))}
                    </nav>

                    {/* Vùng bên phải: ThemeToggle (luôn hiện) + nút menu mobile */}
                    <div className="flex items-center gap-3">
                        <ThemeToggle
                            isDark={isDark}
                            onToggle={toggleTheme}
                        />

                        <button
                            onClick={() => setOpen((value) => !value)}
                            className="rounded-lg p-2 text-blossom-muted transition-transform hover:scale-[1.02] hover:bg-blossom-card-soft active:scale-[0.985] dark:text-blossom-muted-dark dark:hover:bg-blossom-card-soft-dark md:hidden"
                            aria-label="Mở menu"
                        >
                            {open ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {open && (
                    <div className="border-t border-blossom-border px-4 py-3 dark:border-blossom-border-dark md:hidden">
                        <div className="space-y-1">
                            {navItems.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => navigate(id)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                        page === id
                                            ? 'bg-blossom-accent/10 text-blossom-accent dark:bg-blossom-accent-dark/15 dark:text-blossom-accent-dark'
                                            : 'text-blossom-muted hover:bg-blossom-card-soft dark:text-blossom-muted-dark dark:hover:bg-blossom-card-soft-dark'
                                    }`}
                                >
                                    <Icon size={18} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* ==================================================================
                MAIN CONTENT
               ================================================================== */}
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>

            {/* ==================================================================
                FOOTER — tối giản
               ================================================================== */}
            <footer className="border-t border-blossom-border dark:border-blossom-border-dark">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-blossom-muted dark:text-blossom-muted-dark sm:flex-row sm:justify-between sm:px-6 lg:px-8">
                    <span>© {new Date().getFullYear()} VNU Digital & AI Quiz</span>
                    <span>Dữ liệu được lưu cục bộ trên trình duyệt của bạn.</span>
                </div>
            </footer>
        </div>
    )
}
