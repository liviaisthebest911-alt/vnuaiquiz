// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { MemoryRouter } from 'react-router-dom'
import QuestionMinimap from './features/exam/components/QuestionMinimap'
import questions from './data/questions.json'

// jsdom không có matchMedia (useTheme cần)
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} })

const nav = (label) => fireEvent.click(screen.getAllByRole('button', { name: label })[0])
const findTitle = (text) => screen.findByRole('heading', { level: 1, name: text }, { timeout: 3000 })

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('P0 – loại bỏ THPTQG', () => {
    test('Dashboard hiển thị, không còn nút hay chữ THPTQG', () => {
        render(<MemoryRouter><App /></MemoryRouter>)
        expect(screen.getByRole('button', { name: /Ôn tập ngay/ })).toBeTruthy()
        expect(screen.getAllByRole('button', { name: /Thi thử 30 phút/ }).length).toBeGreaterThan(0)
        expect(document.body.textContent).not.toMatch(/THPT/i)
    })

    test('không xoá dữ liệu cũ của người dùng trong localStorage', () => {
        localStorage.setItem('vnuaiquiz_exam_history', '[{"id":"old"}]')
        localStorage.setItem('vnu-ai-quiz:bookmarks', '[3]')
        render(<MemoryRouter><App /></MemoryRouter>)
        expect(localStorage.getItem('vnuaiquiz_exam_history')).toBe('[{"id":"old"}]')
        expect(localStorage.getItem('vnu-ai-quiz:bookmarks')).toBe('[3]')
    })
})

describe('chức năng hiện có vẫn hoạt động', () => {
    test('điều hướng tới mọi trang', async () => {
        render(<MemoryRouter><App /></MemoryRouter>)
        nav('Ôn tập');           await findTitle('Ôn tập theo chương')
        nav('Flashcard');        await findTitle('Thẻ ghi nhớ nhanh')
        nav('Thi thử');          await findTitle('Thi thử 30 phút')
        nav('Quản lý dữ liệu');  await findTitle('Quản lý dữ liệu câu hỏi')
    })

    test('ôn tập: trả lời hiện giải thích, đánh dấu được lưu', async () => {
        render(<MemoryRouter><App /></MemoryRouter>)
        nav('Ôn tập')
        await findTitle('Ôn tập theo chương')

        const first = questions[0]
        fireEvent.click(screen.getByRole('button', { name: new RegExp(escape(first.options[first.answer])) }))
        expect(screen.getByText(first.explanation)).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: /Đánh dấu câu khó/ }))
        expect(JSON.parse(localStorage.getItem('vnu-ai-quiz:bookmarks.v2'))).toEqual([`CNSAI:c${first.chapter}:q${first.id}`])
        expect(JSON.parse(localStorage.getItem('vnu-ai-quiz:progress.v2'))).toEqual([`CNSAI:c${first.chapter}:q${first.id}`])
    })

    test('thi thử 30 phút: làm bài, nộp, lưu lịch sử', async () => {
        render(<MemoryRouter><App /></MemoryRouter>)
        nav('Thi thử')
        await findTitle('Thi thử 30 phút')
        fireEvent.click(screen.getByRole('button', { name: /Bắt đầu làm bài/ }))

        fireEvent.click(screen.getAllByRole('button', { name: /Nộp bài/ })[0])
        const dialogTitle = await screen.findByText('Xác nhận nộp bài?')
        fireEvent.click(within(dialogTitle.closest('div.fixed') ?? document.body).getAllByRole('button', { name: /Nộp bài/ }).at(-1))

        await screen.findByText('Bạn hoàn thành bài thi!')
        const history = JSON.parse(localStorage.getItem('vnu-ai-quiz:history'))
        expect(history).toHaveLength(1)
        expect(history[0]).toMatchObject({ totalQuestions: 40, correct: 0 })
    })
})

test('QuestionMinimap (component dùng chung được giữ lại) hiển thị trạng thái câu', () => {
    let jumped = null
    render(
        <QuestionMinimap
            questions={[{ id: 'a' }, { id: 'b' }, { id: 'c' }]}
            answers={{ a: { status: 'ANSWERED' }, b: { status: 'FLAGGED' } }}
            currentIndex={2}
            onJump={(i) => { jumped = i }}
        />,
    )
    const [a, b, c] = screen.getAllByRole('button')
    expect(a.className).toMatch(/bg-rose-200/)
    expect(b.className).toMatch(/bg-amber-100/)
    expect(c.className).toMatch(/ring-2/)
    fireEvent.click(b)
    expect(jumped).toBe(1)
})

function escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
