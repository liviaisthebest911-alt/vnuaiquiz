import { useEffect, useState } from 'react'

const STORAGE_KEY = 'vnu-ai-quiz:theme'

/**
 * Đọc theme đã lưu trong localStorage. Nếu chưa có, dùng
 * prefers-color-scheme của hệ điều hành làm giá trị mặc định lần đầu.
 * (Đây là phần thay thế cho "script.js" trong yêu cầu gốc — nhưng viết
 * dưới dạng custom hook để tái sử dụng được trong React.)
 */
function getInitialTheme() {
    if (typeof window === 'undefined') {
        return 'light'
    }

    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (saved === 'light' || saved === 'dark') {
        return saved
    }

    const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
    ).matches

    return prefersDark ? 'dark' : 'light'
}

export function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme)

    // Mỗi khi theme đổi: thêm/xoá class 'dark' trên <html> (Tailwind
    // darkMode: 'class' đọc chính class này) và lưu lựa chọn vào localStorage
    // để lần load trang sau vẫn giữ nguyên chế độ đã chọn.
    useEffect(() => {
        const root = window.document.documentElement

        if (theme === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }

        window.localStorage.setItem(STORAGE_KEY, theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((current) =>
            current === 'dark' ? 'light' : 'dark',
        )
    }

    return {
        theme,
        isDark: theme === 'dark',
        toggleTheme,
    }
}
