const KEYS = {
    questions: 'vnu-ai-quiz:questions',
    bookmarks: 'vnu-ai-quiz:bookmarks',
    progress: 'vnu-ai-quiz:progress',
    history: 'vnu-ai-quiz:history',
}

function read(key, fallback) {
    try {
        const raw = localStorage.getItem(key)

        return raw ? JSON.parse(raw) : fallback
    } catch {
        return fallback
    }
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
}

export const storage = {
    getQuestions(defaultQuestions) {
        return read(KEYS.questions, defaultQuestions)
    },

    setQuestions(questions) {
        write(KEYS.questions, questions)
    },

    clearQuestions() {
        localStorage.removeItem(KEYS.questions)
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
    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value]
}