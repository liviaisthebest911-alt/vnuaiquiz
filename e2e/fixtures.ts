import { expect, test as base, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Ngân hàng câu hỏi thật của repo (đọc trực tiếp, không dùng dữ liệu production).
export type Question = { id: number; chapter: number; chapterName: string; question: string; options: string[]; answer: number; explanation: string }
export const questions: Question[] = JSON.parse(
    readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'),
)
export const questionKey = (q: Question) => `CNSAI:c${q.chapter}:q${q.id}`

export const PAGES = [
    { nav: 'Ôn tập', title: 'Ôn tập theo chương' },
    { nav: 'Flashcard', title: 'Thẻ ghi nhớ nhanh' },
    { nav: 'Thi thử', title: 'Thi thử 30 phút' },
    { nav: 'Quản lý dữ liệu', title: 'Quản lý dữ liệu câu hỏi' },
] as const

// Mọi test tự động thất bại nếu trang có lỗi JS, console.error hoặc request >= 400.
export const test = base.extend<{ pageErrors: string[] }>({
    pageErrors: [async ({ page }, use) => {
        const errors: string[] = []
        page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
        page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`) })
        page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`) })
        await use(errors)
        expect(errors, 'không có lỗi JS/console/HTTP').toEqual([])
    }, { auto: true }],
})
export { expect }

export const heading1 = (page: Page, name: string | RegExp) => page.getByRole('heading', { level: 1, name })

// Điều hướng bằng menu desktop (≥ 768px) hoặc menu di động.
export async function navigate(page: Page, label: string) {
    const desktopNav = page.locator('header nav')
    if (await desktopNav.isVisible()) {
        await desktopNav.getByRole('button', { name: label, exact: true }).click()
    } else {
        await page.getByRole('button', { name: 'Mở menu' }).click()
        await page.locator('header').getByRole('button', { name: label, exact: true }).last().click()
    }
}

export const horizontalOverflow = (page: Page) =>
    page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

export async function readStorage<T = unknown>(page: Page, key: string): Promise<T | null> {
    const raw = await page.evaluate((k) => localStorage.getItem(k), key)
    return raw === null ? null : JSON.parse(raw)
}

// Gieo dữ liệu localStorage rồi tải lại trang (không dùng addInitScript để không gieo lại sau mỗi reload).
export async function seedStorage(page: Page, entries: Record<string, string>) {
    await page.goto('/')
    await page.evaluate((e) => { for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v) }, entries)
    await page.reload()
}

// Trang thi
export const examAside = (page: Page) => page.locator('aside')
export const examGrid = (page: Page): Locator => examAside(page).getByRole('button', { name: /^\d+$/ })
export const examOptions = (page: Page): Locator => page.locator('section div.space-y-3 > button')

export async function startExam(page: Page) {
    await navigate(page, 'Thi thử')
    await page.getByRole('button', { name: /Bắt đầu làm bài/ }).click()
    await expect(page.getByText('Câu 1/40')).toBeVisible()
}

export async function submitExam(page: Page) {
    await examAside(page).getByRole('button', { name: /Nộp bài/ }).click()
    await expect(page.getByText('Xác nhận nộp bài?')).toBeVisible()
    await page.getByRole('button', { name: /Nộp bài/ }).last().click()
    await expect(heading1(page, 'Bạn hoàn thành bài thi!')).toBeVisible()
}
