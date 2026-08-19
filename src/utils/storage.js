const KEYS = {
    questions: 'vnu-ai-quiz:questions',
    bookmarks: 'vnu-ai-quiz:bookmarks',
    progress: 'vnu-ai-quiz:progress',
    history: 'vnu-ai-quiz:history',
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

    getBookmarks() {
        return read(KEYS.bookmarks, [])
    },

    setBookmarks(ids) {
        write(KEYS.bookmarks, ids)
    },

    getProgress() {
        return read(KEYS.progress, [])
    },

    setProgress(ids) {
        write(KEYS.progress, ids)
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