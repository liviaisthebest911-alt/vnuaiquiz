import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { Study, Subjects } from './components/Study'
import { useSession } from './hooks/useSession'
import { apiConfigured } from './lib/api'
import { ServerAttempt, ServerExams } from './components/ServerExams'
import AdminExams from './components/AdminExams'
import AdminStats from './components/AdminStats'

import { storage, toggleInArray } from './utils/storage'
import { questionKey } from './utils/questionKey'

const paths = {
    dashboard: '/', subjects: '/subjects', practice: '/practice', flashcard: '/flashcards',
    exam: '/exams', materials: '/materials', admin: '/admin/data', account: '/account',
    'library-admin': '/admin/library', 'exam-admin': '/admin/exams', 'stats-admin': '/admin/stats', attempt: '/attempts',
}

export default function App() {
    const navigate = useNavigate()
    const { pathname, search } = useLocation()
    const session = useSession()
    const [section, segment, detail, extra] = pathname.split('/').filter(Boolean)
    const root = section ? `/${section}` : '/'
    const page = Object.keys(paths).find((id) => paths[id] === pathname.replace(/\/$/, '') ||
        paths[id] === root && ['dashboard', 'subjects', 'practice', 'flashcard', 'materials', 'exam', 'attempt'].includes(id))
    const params = new URLSearchParams(search)
    const chapter = params.get('chapter')
    const resume = params.has('resume')
    const code = segment?.toUpperCase()

    function setPage(id, subjectId) {
        const query = id === 'materials' && subjectId ? `?${new URLSearchParams({ subject: subjectId })}`
            : id === 'exam' && subjectId === 'local' ? '?local=1' : ''
        navigate(`${paths[id]}${query}`)
    }

    function openStudy(mode, subject, resume = false, bookmarked = false, chapter = null) {
        const query = new URLSearchParams()
        if (subject === null) query.set('local', '1')
        if (resume) query.set('resume', '1')
        if (bookmarked) query.set('bookmarked', '1')
        if (chapter !== null) query.set('chapter', chapter)
        navigate(`${paths[mode]}${subject ? `/${encodeURIComponent(subject)}` : ''}${query.size ? `?${query}` : ''}`)
    }

    useEffect(() => {
        if (window.scrollY) window.scrollTo(0, 0)
    }, [pathname])

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
        if (!page || detail || extra) return (
            <div className="study-page"><h1>Không tìm thấy trang</h1>
                <button type="button" className="study-text-button" onClick={() => setPage('dashboard')}>Về Tổng quan</button>
            </div>
        )
        switch (page) {
            case 'practice':
                return (
                    <Study mode="practice" code={code} session={session} resume={resume} initialChapter={chapter} localMode={params.has('local')}
                           onlyBookmarks={params.has('bookmarked')} onStudy={openStudy} onNavigate={setPage}
                           renderLocal={() => (
                               <Practice questions={questions} bookmarks={bookmarks} onToggleBookmark={handleToggleBookmark}
                                         onMarkProgress={handleProgress} progress={progress} resume={resume} initialChapter={chapter} />
                           )}
                    />
                )

            case 'flashcard':
                return (
                    <Study mode="flashcard" code={code} session={session} onStudy={openStudy} onNavigate={setPage} localMode={params.has('local')}
                           renderLocal={() => <Flashcard questions={questions} />} />
                )

            case 'subjects':
                return <Subjects code={code} questions={questions} onStudy={openStudy} onNavigate={setPage} session={session} />

            case 'exam':
                if (apiConfigured && !params.has('local')) return <ServerExams examId={segment} session={session}
                    navigateTo={navigate} onSignIn={() => setPage('account')} />
                return (
                    <Exam
                        questions={questions}
                        onFinish={handleExamFinish}
                    />
                )

            case 'attempt':
                return apiConfigured && segment ? <ServerAttempt key={session?.user.id ?? 'guest'} attemptId={segment} session={session}
                    navigateTo={navigate} onSignIn={() => setPage('account')} /> : <p className="study-empty">Lượt làm bài chưa khả dụng.</p>

            case 'exam-admin':
                return apiConfigured ? <AdminExams key={session?.user.id ?? 'guest'} session={session}
                    onSignIn={() => setPage('account')} /> : <p className="study-empty">Quản trị đề thi cần máy chủ API.</p>

            case 'stats-admin':
                return apiConfigured ? <AdminStats session={session} onSignIn={() => setPage('account')} />
                    : <p className="study-empty">Thống kê quản trị cần máy chủ API.</p>

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
                return <Materials initialSubject={params.get('subject')} materialId={segment} session={session}
                                  onOpen={(id) => navigate(`/materials/${encodeURIComponent(id)}`)}
                                  onBack={() => setPage('materials')} />

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
                        session={session}
                        onNavigate={setPage}
                        onStudy={openStudy}
                        onOpenMaterial={(id) => navigate(`/materials/${encodeURIComponent(id)}`)}
                    />
                )

        }
    }

    return (
        <Layout
            page={page === 'attempt' ? 'exam' : page}
            setPage={setPage}
        >
            <div key={`${pathname}${search}`} className="workspace-page">{renderPage()}</div>
        </Layout>
    )
}
