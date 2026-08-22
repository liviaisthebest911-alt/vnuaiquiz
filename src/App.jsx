import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import defaultQuestions from './data/questions.json'

import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Practice from './components/Practice'
import Flashcard from './components/Flashcard'
import Exam from './components/Exam'
import Admin from './components/Admin'
import PageTransition from './components/PageTransition'

import { storage, toggleInArray } from './utils/storage'

export default function App() {
    const [page, setPage] = useState('dashboard')

    const [questions, setQuestions] = useState(() => {
        const saved = storage.getQuestions(defaultQuestions)

        return Array.isArray(saved) && saved.length > 0
            ? saved
            : defaultQuestions
    })

    const [bookmarks, setBookmarks] = useState(() => {
        const saved = storage.getBookmarks()
        return Array.isArray(saved) ? saved : []
    })

    const [progress, setProgress] = useState(() => {
        const saved = storage.getProgress()
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

    function handleToggleBookmark(id) {
        setBookmarks((current) =>
            toggleInArray(current, id),
        )
    }

    function handleProgress(id) {
        setProgress((current) => {
            if (current.includes(id)) {
                return current
            }

            return [...current, id]
        })
    }

    function handleReplaceQuestions(newQuestions) {
        if (!Array.isArray(newQuestions) || newQuestions.length === 0) {
            return
        }

        setQuestions(newQuestions)

        const validIds = new Set(
            newQuestions.map((question) => question.id),
        )

        setBookmarks((current) =>
            current.filter((id) => validIds.has(id)),
        )

        setProgress((current) =>
            current.filter((id) => validIds.has(id)),
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