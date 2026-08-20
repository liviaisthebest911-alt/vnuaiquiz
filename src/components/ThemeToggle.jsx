import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ isDark, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            role="switch"
            aria-checked={isDark}
            aria-label={
                isDark
                    ? 'Chuyển sang chế độ Sáng'
                    : 'Chuyển sang chế độ Tối'
            }
            className="theme-toggle"
        >
            <span className="theme-toggle__thumb">
                {isDark ? <Moon size={11} /> : <Sun size={11} />}
            </span>
        </button>
    )
}
