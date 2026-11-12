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
            {isDark ? <Sun size={19} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={19} strokeWidth={1.8} aria-hidden="true" />}
        </button>
    )
}
