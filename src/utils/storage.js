import { migrateLegacyIds } from './questionKey'

const KEYS = {
    questions: 'vnu-ai-quiz:questions',
    // Key cũ lưu `id` trần (trùng giữa các chương) – chỉ đọc để chuyển đổi, KHÔNG ghi đè/xoá.
    legacyBookmarks: 'vnu-ai-quiz:bookmarks',
    legacyProgress: 'vnu-ai-quiz:progress',
    // Key mới lưu questionKey (môn:chương:id).
    bookmarks: 'vnu-ai-quiz:bookmarks.v2',
    progress: 'vnu-ai-quiz:progress.v2',
    history: 'vnu-ai-quiz:history',
}

// Lần đầu (chưa có key v2): chuyển các id cũ xác định được duy nhất; sau đó chỉ đọc v2.
function readKeyed(key, legacyKey, questions) {
    const current = read(key, null)
    return Array.isArray(current)
        ? current
        : migrateLegacyIds(read(legacyKey, []), questions)
}

function read(key, fallback) {
    try {
        const raw = localStorage.getItem(key)

        if (!raw) {
            return fallback
        }

        const parsed = JSON.parse(raw)

        return parsed ?? fallback
    } catch (error) {
        console.warn(`Không thể đọc LocalStorage: ${key}`, error)
        return fallback
    }
}

function write(key, value) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify(value),
        )
    } catch (error) {
        console.warn(
            `Không thể ghi LocalStorage: ${key}`,
            error,
        )
    }
}

export const storage = {
    getQuestions(defaultQuestions) {
        return read(KEYS.questions, defaultQuestions)
    },

    setQuestions(questions) {
        write(KEYS.questions, questions)
    },

    clearQuestions() {
        try {
            localStorage.removeItem(KEYS.questions)
        } catch (error) {
            console.warn(error)
        }
    },

    getBookmarks(questions) {
        return readKeyed(KEYS.bookmarks, KEYS.legacyBookmarks, questions)
    },

    setBookmarks(keys) {
        write(KEYS.bookmarks, keys)
    },

    getProgress(questions) {
        return readKeyed(KEYS.progress, KEYS.legacyProgress, questions)
    },

    setProgress(keys) {
        write(KEYS.progress, keys)
    },

    getHistory() {
        return read(KEYS.history, [])
    },

    setHistory(history) {
        write(KEYS.history, history)
    },
}

export function toggleInArray(list, value) {
    if (!Array.isArray(list)) {
        return [value]
    }

    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value]
}