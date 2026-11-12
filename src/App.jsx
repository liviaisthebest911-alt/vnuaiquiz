import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import defaultQuestions from './data/questions.json'

import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Practice from './components/Practice'
import Flashcard from './components/Flashcard'
import Exam from './components/Exam'
import Admin from './components/Admin'
import Account from './components/Account'
import Materials from './components/Materials'
import AdminLibrary from './components/AdminLibrary'
import Pagetransition from './components/Pagetransition'

import { storage, toggleInArray } from './utils/storage'
import { questionKey } from './utils/questionKey'

export default function App() {
    const [page, setPage] = useState('dashboard')

    const [questions, setQuestions] = useState(() => {
        const saved = storage.getQuestions(defaultQuestions)

        return Array.isArray(saved) && saved.length > 0
            ? saved
            : defaultQuestions
    })

    const [bookmarks, setBookmarks] = useState(() => {
        const saved = storage.getBookmarks(questions)
        return Array.isArray(saved) ? saved : []
    })

    const [progress, setProgress] = useState(() => {
        const saved = storage.getProgress(questions)
        return Array.isArray(saved) ? saved : []
    })

    const [history, setHistory] = useState(() => {
        const saved = storage.getHistory()
        return Array.isArray(saved) ? saved : []
    })

    useEffect(() => {
        storage.setQuestions(questions)
    }, [questions])

    useEffect(() => {
        storage.setBookmarks(bookmarks)
    }, [bookmarks])

    useEffect(() => {
        storage.setProgress(progress)
    }, [progress])

    useEffect(() => {
        storage.setHistory(history)
    }, [history])

    // bookmarks/progress lưu questionKey (môn:chương:id), không phải id trần
    function handleToggleBookmark(key) {
        setBookmarks((current) =>
            toggleInArray(current, key),
        )
    }

    function handleProgress(key) {
        setProgress((current) => {
            if (current.includes(key)) {
                return current
            }

            return [...current, key]
        })
    }

    function handleReplaceQuestions(newQuestions) {
        if (!Array.isArray(newQuestions) || newQuestions.length === 0) {
            return
        }

        setQuestions(newQuestions)

        const validKeys = new Set(
            newQuestions.map(questionKey),
        )

        setBookmarks((current) =>
            current.filter((key) => validKeys.has(key)),
        )

        setProgress((current) =>
            current.filter((key) => validKeys.has(key)),
        )
    }

    function handleResetQuestions() {
        storage.clearQuestions()

        setQuestions(defaultQuestions)
        setBookmarks([])
        setProgress([])
    }

    function handleExamFinish(result) {
        const historyItem = {
            id: result.id,
            createdAt: result.createdAt,
            totalQuestions: result.totalQuestions,
            correct: result.correct,
            accuracy: result.accuracy,
            score: result.score,
        }

        setHistory((current) =>
            [historyItem, ...current].slice(0, 50),
        )
    }

    function renderPage() {
        switch (page) {
            case 'practice':
                return (
                    <Practice
                        questions={questions}
                        bookmarks={bookmarks}
                        onToggleBookmark={handleToggleBookmark}
                        onMarkProgress={handleProgress}
                    />
                )

            case 'flashcard':
                return (
                    <Flashcard
                        questions={questions}
                    />
                )

            case 'exam':
                return (
                    <Exam
                        questions={questions}
                        onFinish={handleExamFinish}
                    />
                )

            case 'admin':
                return (
                    <Admin
                        questions={questions}
                        defaultQuestions={defaultQuestions}
                        onReplaceQuestions={handleReplaceQuestions}
                        onResetQuestions={handleResetQuestions}
                    />
                )

            case 'materials':
                return <Materials />

            case 'library-admin':
                return <AdminLibrary />

            case 'account':
                return <Account onNavigate={setPage} />

            case 'dashboard':
            default:
                return (
                    <Dashboard
                        questions={questions}
                        history={history}
                        progress={progress}
                        bookmarks={bookmarks}
                        onNavigate={setPage}
                    />
                )

        }
    }

    return (
        <Layout
            page={page}
            setPage={setPage}
        >
            <AnimatePresence mode="wait">
                <Pagetransition pageKey={page}>
                    {renderPage()}
                </Pagetransition>
            </AnimatePresence>
        </Layout>
    )
}