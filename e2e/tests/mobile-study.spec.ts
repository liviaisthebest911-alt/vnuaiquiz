import { expect, heading1, navigate, questions, startExam, tabBar, test } from '../fixtures'
import type { Page } from '@playwright/test'

const ch2 = questions.filter((q) => q.chapter === 2)

test('Chọn chương mở đúng môn đang học và ôn đúng chương đã chọn', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Chọn chương' }).click()
    await expect(heading1(page, 'Nhập môn Công nghệ số và Ứng dụng Trí tuệ nhân tạo')).toBeVisible()
    await page.getByRole('button', { name: new RegExp(ch2[0].chapterName) }).click()
    await expect(heading1(page, 'Ôn tập theo chương')).toBeVisible()
    await expect(page.getByLabel('Chương ôn tập')).toHaveValue('2')
    await expect(page.getByText(ch2[0].question, { exact: true })).toBeVisible()
})

async function expectNextNotCovered(page: Page) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const next = page.getByRole('button', { name: 'Câu tiếp' })
    const box = (await next.boundingBox())!
    const bar = (await tabBar(page).boundingBox())!
    expect(box.y + box.height, 'nút Câu tiếp nằm trên thanh tab').toBeLessThanOrEqual(bar.y)
    expect(box.y, 'nút Câu tiếp nằm trong màn hình').toBeGreaterThanOrEqual(0)
}

for (const width of [360, 390]) {
    test.describe(`di động ${width}px`, () => {
        test.use({ viewport: { width, height: width === 360 ? 740 : 844 } })

        test('thanh tab dưới không che nút Câu tiếp, kể cả khi lời giải mở', async ({ page }) => {
            await page.goto('/')
            await navigate(page, 'Ôn tập')
            await expect(heading1(page, 'Ôn tập theo chương')).toBeVisible()
            await expectNextNotCovered(page)

            await page.getByRole('button', { name: questions[0].options[questions[0].answer] }).click()
            await expect(page.getByText(questions[0].explanation)).toBeVisible()
            await expectNextNotCovered(page)
            await page.getByRole('button', { name: 'Câu tiếp' }).click()
            await expect(page.getByText(questions[1].question, { exact: true })).toBeVisible()
        })

        test('mở Danh sách câu cạnh bộ đếm và nhảy tới câu đã chọn', async ({ page }) => {
            await page.goto('/')
            await navigate(page, 'Ôn tập')
            const toggle = page.getByRole('button', { name: 'Danh sách câu' })
            const counter = page.getByText(/^Câu 1\/200$/)
            const [t, c] = [(await toggle.boundingBox())!, (await counter.boundingBox())!]
            expect(Math.abs((t.y + t.height / 2) - (c.y + c.height / 2)), 'cùng hàng với bộ đếm').toBeLessThan(16)

            await expect(toggle).toHaveAttribute('aria-expanded', 'false')
            await toggle.click()
            await expect(toggle).toHaveAttribute('aria-expanded', 'true')
            await page.locator('#practice-map-mobile').getByRole('button', { name: '5', exact: true }).click()
            await expect(page.getByText(/^Câu 5\/200$/)).toBeVisible()
            await expect(page.getByText(questions[4].question, { exact: true })).toBeVisible()
            await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        })

        test('thi thử: thanh tab dưới không che nút Câu tiếp', async ({ page }) => {
            await page.goto('/')
            await startExam(page)
            const next = page.getByRole('button', { name: 'Câu tiếp' })
            await next.evaluate((el) => el.scrollIntoView({ block: 'end' }))
            await page.evaluate(() => window.scrollBy(0, 200))
            const box = (await next.boundingBox())!
            const bar = (await tabBar(page).boundingBox())!
            expect(box.y + box.height <= bar.y || box.y >= bar.y + bar.height).toBe(true)
            await next.click()
            await expect(page.getByText('Câu 2/40')).toBeVisible()
        })

        test('menu Thêm giữ focus bàn phím trong hộp thoại; Esc đóng và trả focus về nút Thêm', async ({ page }) => {
            await page.goto('/')
            const more = tabBar(page).getByRole('button', { name: 'Thêm' })
            await more.click()
            const sheet = page.getByRole('dialog', { name: 'Thêm' })
            const items = ['Môn học', 'Flashcard', 'Quản lý dữ liệu', 'Tài khoản'].map((name) => sheet.getByRole('button', { name, exact: true }))
            await expect(items[0]).toBeFocused()
            for (const item of [...items.slice(1), items[0]]) { // Tab đi hết vòng rồi quay về mục đầu
                await page.keyboard.press('Tab')
                await expect(item).toBeFocused()
            }
            await page.keyboard.press('Shift+Tab')
            await expect(items[3]).toBeFocused()
            await page.keyboard.press('Shift+Tab')
            await expect(items[2]).toBeFocused()
            await page.keyboard.press('Escape')
            await expect(sheet).toBeHidden()
            await expect(more).toBeFocused()
            await expect(more).toHaveAttribute('aria-expanded', 'false')
        })

        test('menu Thêm mở được các trang còn lại và đóng bằng Escape', async ({ page }) => {
            await page.goto('/')
            await tabBar(page).getByRole('button', { name: 'Thêm' }).click()
            const sheet = page.getByRole('dialog', { name: 'Thêm' })
            await expect(sheet.getByRole('button', { name: 'Môn học' })).toBeFocused()
            await page.keyboard.press('Escape')
            await expect(sheet).toBeHidden()
            await navigate(page, 'Flashcard')
            await expect(heading1(page, 'Thẻ ghi nhớ nhanh')).toBeVisible()
            await expect(tabBar(page).getByRole('button', { name: 'Thêm' })).toHaveAttribute('aria-current', 'page')
        })
    })
}
