// @vitest-environment jsdom
// Regression: id câu hỏi chỉ duy nhất trong một chương (questions.json đánh số lại từ 1 ở mỗi chương).
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { MemoryRouter } from 'react-router-dom'
import defaultQuestions from './data/questions.json'
import { migrateLegacyIds, questionKey } from './utils/questionKey'

window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
// jsdom không có canvas; hiệu ứng pháo hoa (điểm ≥ 8) cần một context giả không làm gì
HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} })

// Hai câu khác chương, CÙNG id = 1. `sameAnswer` quyết định đáp án đúng của câu B.
function bank({ sameAnswer }) {
    return [
        { id: 1, chapter: 1, chapterName: 'Chương 1: A', question: 'Câu hỏi A?', options: ['A-đúng', 'A-sai'], answer: 0, explanation: 'Giải thích A' },
        { id: 1, chapter: 2, chapterName: 'Chương 2: B', question: 'Câu hỏi B?', options: sameAnswer ? ['B-đúng', 'B-sai'] : ['B-sai', 'B-đúng'], answer: sameAnswer ? 0 : 1, explanation: 'Giải thích B' },
    ]
}
const seedBank = (questions) => localStorage.setItem('vnu-ai-quiz:questions', JSON.stringify(questions))
const nav = (label) => fireEvent.click(screen.getAllByRole('button', { name: label })[0])
const findTitle = (text) => screen.findByRole('heading', { level: 1, name: text }, { timeout: 3000 })
const aside = () => document.querySelector('aside')
const gridButtons = () => within(aside()).getAllByRole('button', { name: /^\d+$/ })
// ô hiện màu "đã trả lời" = đã trả lời và không phải câu đang xem (câu đang xem tô màu riêng)
const answeredCells = () => gridButtons().filter((b) => b.dataset.answered === 'true' && !b.hasAttribute('aria-current'))
const currentQuestion = () => (screen.queryByText('Câu hỏi A?') ? 'A' : 'B')
const optionButton = (text) => screen.getByRole('button', { name: new RegExp(text) })

async function startExam() {
    render(<MemoryRouter><App /></MemoryRouter>)
    nav('Thi thử')
    await findTitle('Thi thử 30 phút')
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu làm bài/ }))
    await screen.findByText('Câu 1/2')
}
async function submitExam() {
    fireEvent.click(within(aside()).getByRole('button', { name: /Nộp bài/ }))
    await screen.findByText('Xác nhận nộp bài?')
    fireEvent.click(screen.getAllByRole('button', { name: /Nộp bài/ }).at(-1))
    await screen.findByText('Bạn hoàn thành bài thi!')
    return JSON.parse(localStorage.getItem('vnu-ai-quiz:history'))[0]
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('questionKey', () => {
    test('200 câu của ngân hàng thật có 200 khoá khác nhau (chỉ 40 id khác nhau)', () => {
        expect(new Set(defaultQuestions.map((q) => q.id)).size).toBe(40)
        expect(new Set(defaultQuestions.map(questionKey)).size).toBe(200)
    })

    test('khoá ổn định, gồm môn + chương + id, không ngẫu nhiên', () => {
        const q = defaultQuestions[45]
        expect(questionKey(q)).toBe(`CNSAI:c${q.chapter}:q${q.id}`)
        expect(questionKey({ ...q })).toBe(questionKey(q))
    })

    test('id cũ mơ hồ không bị đoán chương; id xác định duy nhất thì được chuyển', () => {
        const questions = [...bank({ sameAnswer: true }), { id: 7, chapter: 3, chapterName: 'C3', question: 'q', options: ['x', 'y'], answer: 0, explanation: 'e' }]
        expect(migrateLegacyIds([1, 7, 99], questions)).toEqual(['CNSAI:c3:q7'])
        expect(migrateLegacyIds(null, questions)).toEqual([])
    })
})

describe('Thi thử – câu cùng id ở hai chương', () => {
    test('A + D. Hai câu cùng id, đáp án khác nhau: mỗi câu chấm theo đáp án của chính nó', async () => {
        seedBank(bank({ sameAnswer: false }))
        await startExam()
        for (let i = 0; i < 2; i++) {
            fireEvent.click(optionButton(`${currentQuestion()}-đúng`))
            if (i === 0) fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }))
        }
        const result = await submitExam()
        expect(result).toMatchObject({ totalQuestions: 2, correct: 2, score: 10 })
    })

    test('B + C. Trả lời câu ở chương A không làm câu chương B có đáp án; số câu đã trả lời chính xác', async () => {
        seedBank(bank({ sameAnswer: true }))
        await startExam()
        fireEvent.click(optionButton(`${currentQuestion()}-đúng`))
        expect(within(aside()).getByText(/^1\s*\/\s*2$/)).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }))
        const other = currentQuestion()
        // không đáp án nào của câu còn lại ở trạng thái được chọn
        for (const text of [`${other}-đúng`, `${other}-sai`]) {
            expect(optionButton(text).className).not.toMatch(/ring-2/)
        }
        // ô xanh (đã trả lời, không phải ô hiện tại) chỉ là câu 1
        expect(answeredCells().map((b) => b.textContent)).toEqual(['1'])

        fireEvent.click(gridButtons()[0])
        expect(answeredCells()).toHaveLength(0) // câu 2 vẫn chưa trả lời
        expect(within(aside()).getByText(/^1\s*\/\s*2$/)).toBeTruthy()
    })

    test('D. Chỉ trả lời 1 câu (đúng) trong 2 câu cùng id, cùng đáp án → đúng 1/2, không phải 2/2', async () => {
        seedBank(bank({ sameAnswer: true }))
        await startExam()
        fireEvent.click(optionButton(`${currentQuestion()}-đúng`))
        const result = await submitExam()
        expect(result).toMatchObject({ correct: 1, accuracy: 50, score: 5 })
    })

    test('E. Xem lại bài thi hiển thị đúng đáp án đã chọn của từng câu', async () => {
        seedBank(bank({ sameAnswer: false }))
        await startExam()
        const first = currentQuestion()
        fireEvent.click(optionButton(`${first}-sai`))
        await submitExam()

        const second = first === 'A' ? 'B' : 'A'
        const reviewOf = (letter) => screen.getByText(`Câu hỏi ${letter}?`).parentElement
        expect(reviewOf(first).textContent).toMatch(new RegExp(`Bạn chọn:\\s*${first}-sai`))
        expect(reviewOf(second).textContent).toMatch(/Bạn chọn:\s*Chưa trả lời/)
    })
})

describe('Ôn tập – bookmark và tiến độ', () => {
    test('F. Bookmark câu id 1 chương 1 không đánh dấu câu id 1 chương 2', async () => {
        seedBank(bank({ sameAnswer: true }))
        render(<MemoryRouter><App /></MemoryRouter>)
        nav('Ôn tập')
        await findTitle('Ôn tập theo chương')

        fireEvent.click(screen.getByRole('button', { name: /Đánh dấu câu khó/ }))
        expect(screen.getByRole('button', { name: /Đã đánh dấu/ })).toBeTruthy()

        fireEvent.click(gridButtons()[1])
        expect(screen.getByText('Câu hỏi B?')).toBeTruthy()
        expect(screen.getByRole('button', { name: /Đánh dấu câu khó/ })).toBeTruthy()
        expect(JSON.parse(localStorage.getItem('vnu-ai-quiz:bookmarks.v2'))).toEqual(['CNSAI:c1:q1'])
    })

    test('tiến độ chỉ ghi nhận đúng câu đã làm', async () => {
        seedBank(bank({ sameAnswer: true }))
        render(<MemoryRouter><App /></MemoryRouter>)
        nav('Ôn tập')
        await findTitle('Ôn tập theo chương')
        fireEvent.click(optionButton('A-đúng'))
        expect(JSON.parse(localStorage.getItem('vnu-ai-quiz:progress.v2'))).toEqual(['CNSAI:c1:q1'])
    })
})

describe('dữ liệu cũ trong localStorage', () => {
    test('bookmark/tiến độ cũ không bị ghi đè hay xoá; id mơ hồ không được tự gán chương', async () => {
        seedBank(bank({ sameAnswer: true }))
        localStorage.setItem('vnu-ai-quiz:bookmarks', '[1]')
        localStorage.setItem('vnu-ai-quiz:progress', '[1]')
        render(<MemoryRouter><App /></MemoryRouter>)
        nav('Ôn tập')
        await findTitle('Ôn tập theo chương')
        expect(screen.getByRole('button', { name: /Đánh dấu câu khó/ })).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: /Đánh dấu câu khó/ }))
        expect(localStorage.getItem('vnu-ai-quiz:bookmarks')).toBe('[1]')
        expect(localStorage.getItem('vnu-ai-quiz:progress')).toBe('[1]')
        expect(JSON.parse(localStorage.getItem('vnu-ai-quiz:bookmarks.v2'))).toEqual(['CNSAI:c1:q1'])
    })

    test('bookmark cũ xác định được duy nhất (ngân hàng id không trùng) được giữ lại', () => {
        const unique = [{ id: 5, chapter: 1, chapterName: 'C1', question: 'Câu năm?', options: ['x', 'y'], answer: 0, explanation: 'e' }]
        seedBank(unique)
        localStorage.setItem('vnu-ai-quiz:bookmarks', '[5]')
        render(<MemoryRouter><App /></MemoryRouter>)
        expect(JSON.parse(localStorage.getItem('vnu-ai-quiz:bookmarks.v2'))).toEqual(['CNSAI:c1:q5'])
        expect(screen.getByText('Câu đã đánh dấu').closest('div').parentElement.textContent).toMatch(/1/)
    })

    test('lịch sử thi cũ được giữ, bài mới được thêm vào đầu', async () => {
        const old = [{ id: 'old-1', createdAt: '2026-01-01T00:00:00.000Z', totalQuestions: 40, correct: 30, accuracy: 75, score: 7.5 }]
        localStorage.setItem('vnu-ai-quiz:history', JSON.stringify(old))
        seedBank(bank({ sameAnswer: true }))
        await startExam()
        await submitExam()
        const history = JSON.parse(localStorage.getItem('vnu-ai-quiz:history'))
        expect(history).toHaveLength(2)
        expect(history[1]).toEqual(old[0])
    })
})
