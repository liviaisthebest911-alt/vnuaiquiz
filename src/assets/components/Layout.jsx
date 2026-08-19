import {
    BrainCircuit,
    Database,
    GraduationCap,
    LayoutDashboard,
    Menu,
    PenLine,
    X,
} from 'lucide-react'

import { useState } from 'react'

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

    const navigate = (id) => {
        setPage(id)
        setOpen(false)
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

                    <button
                        onClick={() => navigate('dashboard')}
                        className="flex items-center gap-3 text-left"
                    >
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <BrainCircuit size={23} />
                        </div>

                        <div>
                            <div className="text-sm font-bold text-blue-700">
                                VNU DIGITAL & AI
                            </div>

                            <div className="text-xs text-slate-500">
                                Ôn tập & Thi thử
                            </div>
                        </div>
                    </button>

                    <nav className="hidden items-center gap-1 md:flex">
                        {navItems.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => navigate(id)}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    page === id
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Icon size={17} />
                                {label}
                            </button>
                        ))}
                    </nav>

                    <button
                        onClick={() => setOpen((value) => !value)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                        aria-label="Mở menu"
                    >
                        {open ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {open && (
                    <div className="border-t border-slate-200 px-4 py-3 md:hidden">
                        <div className="space-y-1">
                            {navItems.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => navigate(id)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                                        page === id
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-600 hover:bg-slate-100'
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

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {children}
            </main>

            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
                    VNU Digital & AI Quiz · Dữ liệu được lưu cục bộ trên trình duyệt của bạn.
                </div>
            </footer>
        </div>
    )
}