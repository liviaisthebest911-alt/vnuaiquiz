import {
    useEffect,
    useState,
} from 'react'

import defaultQuestions from './data/questions.json'

import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Practice from './components/Practice'
import Exam from './components/Exam'
import Admin from './components/Admin'

import {
    storage,
    toggleInArray,
} from './utils/storage'

export default function App() {
    const [page, setPage] =
        useState('dashboard')

    const [questions, setQuestions] =
        useState(() =>
            storage.getQuestions(
                defaultQuestions,
            ),
        )

    const [bookmarks, setBookmarks] =
        useState(() =>
            storage.getBookmarks(),
        )

    const [progress, setProgress] =
        useState(() =>
            storage.getProgress(),
        )

    const [history, setHistory] =
        useState(() =>
            storage.getHistory(),
        )

    useEffect(() => {
        storage.setQuestions(
            questions,
        )
    }, [questions])

    useEffect(() => {
        storage.setBookmarks(
            bookmarks,
        )
    }, [bookmarks])

    useEffect(() => {
        storage.setProgress(
            progress,
        )
    }, [progress])

    useEffect(() => {
        storage.setHistory(
            history,
        )
    }, [history])

    const toggleBookmark = (id) =>
        setBookmarks((items) =>
            toggleInArray(items, id),
        )

    const markProgress = (id) =>
        setProgress((items) =>
            items.includes(id)
                ? items
                : [...items, id],
        )

    const replaceQuestions = (
        newQuestions,
    ) => {
        setQuestions(newQuestions)

        const validIds = new Set(
            newQuestions.map(
                (q) => q.id,
            ),
        )

        setBookmarks((items) =>
            items.filter((id) =>
                validIds.has(id),
            ),
        )

        setProgress((items) =>
            items.filter((id) =>
                validIds.has(id),
            ),
        )
    }

    const resetQuestions = () => {
        storage.clearQuestions()

        setQuestions(
            defaultQuestions,
        )

        setBookmarks([])
        setProgress([])
    }

    const finishExam = (result) => {
        setHistory((items) =>
            [
                {
                    id: result.id,
                    createdAt:
                    result.createdAt,
                    totalQuestions:
                    result.totalQuestions,
                    correct: result.correct,
                    accuracy:
                    result.accuracy,
                    score: result.score,
                },
                ...items,
            ].slice(0, 50),
        )
    }

    return (
        <Layout
            page={page}
            setPage={setPage}
        >
            {page === 'dashboard' && (
                <Dashboard
                    questions={questions}
                    history={history}
                    progress={progress}
                    bookmarks={bookmarks}
                    onNavigate={setPage}
                />
            )}

            {page === 'practice' && (
                <Practice
                    questions={questions}
                    bookmarks={bookmarks}
                    onToggleBookmark={
                        toggleBookmark
                    }
                    onMarkProgress={
                        markProgress
                    }
                />
            )}

            {page === 'exam' && (
                <Exam
                    questions={questions}
                    onFinish={finishExam}
                />
            )}

            {page === 'admin' && (
                <Admin
                    questions={questions}
                    defaultQuestions={
                        defaultQuestions
                    }
                    onReplaceQuestions={
                        replaceQuestions
                    }
                    onResetQuestions={
                        resetQuestions
                    }
                />
            )}
        </Layout>
    )
}