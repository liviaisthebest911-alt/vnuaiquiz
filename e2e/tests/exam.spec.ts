import { examAside, examGrid, examOptions, expect, navigate, readStorage, startExam, submitExam, test } from '../fixtures'

test('thi 30 phút từ bắt đầu đến nộp bài, lưu lịch sử', async ({ page }) => {
    await page.goto('/')
    await startExam(page)

    const timer = page.getByText(/^\d{2}:\d{2}$/).first()
    const t1 = await timer.innerText()
    expect(t1).toMatch(/^(30|29):/)
    await expect(timer).not.toHaveText(t1, { timeout: 5000 })

    await examOptions(page).first().click()
    await page.getByRole('button', { name: 'Câu tiếp' }).click()
    await expect(page.getByText('Câu 2/40')).toBeVisible()
    await page.getByRole('button', { name: 'Câu trước' }).click()
    await expect(page.getByText('Câu 1/40')).toBeVisible()

    await submitExam(page)
    await expect(page.getByRole('heading', { name: 'Xem lại chi tiết' })).toBeVisible()

    const history = await readStorage<Array<Record<string, unknown>>>(page, 'vnu-ai-quiz:history')
    expect(history).toHaveLength(1)
    expect(history![0]).toMatchObject({ totalQuestions: 40 })

    await navigate(page, 'Tổng quan')
    await expect(page.getByText('Đề thi thử · 40 câu')).toBeVisible()
    expect(await page.locator('body').innerText()).toMatch(/Bài đã làm\s*1/)
})

test('minimap: 40 ô, ô đã trả lời chuyển xanh, bấm ô để nhảy câu', async ({ page }) => {
    await page.goto('/')
    await startExam(page)
    await expect(examGrid(page)).toHaveCount(40)

    await examOptions(page).first().click()
    await examGrid(page).nth(4).click()
    await expect(page.getByText('Câu 5/40')).toBeVisible()
    await expect(examGrid(page).nth(4)).toHaveClass(/bg-blossom-accent/)
    await expect(examGrid(page).nth(0)).toHaveClass(/emerald/)
})

// Regression lỗi id trùng (P0.1 đo được 6/10 đề sai): đề 40 câu rút ngẫu nhiên gần như luôn có câu cùng id
// ở chương khác. Trả lời đúng 1 câu thì phải có đúng 1 ô xanh và bộ đếm "1/40" – lặp 8 đề để bao phủ ngẫu nhiên.
test('trả lời 1 câu chỉ đánh dấu đúng 1 câu (không lan sang câu cùng id khác chương)', async ({ page }) => {
    await page.goto('/')
    await startExam(page)
    for (let round = 0; round < 8; round++) {
        if (round > 0) await page.getByRole('button', { name: /Làm đề mới/ }).click()
        await examOptions(page).first().click()
        await page.getByRole('button', { name: 'Câu tiếp' }).click()
        await expect(examAside(page).locator('button[class*="emerald"]')).toHaveCount(1)
        await expect(examAside(page).getByText(/^1\s*\/\s*40$/)).toBeVisible()
        await submitExam(page)
    }
})
