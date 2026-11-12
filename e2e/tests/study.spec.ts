import { expect, heading1, navigate, questionKey, questions, readStorage, test } from '../fixtures'

const ch1q1 = questions.find((q) => q.chapter === 1 && q.id === 1)!
const ch2q1 = questions.find((q) => q.chapter === 2 && q.id === 1)!

test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigate(page, 'Ôn tập')
    await expect(heading1(page, 'Ôn tập theo chương')).toBeVisible()
})

test('trả lời hiện giải thích và ghi nhận tiến độ đúng câu', async ({ page }) => {
    await page.getByRole('button', { name: ch1q1.options[ch1q1.answer] }).click()
    await expect(page.getByText(ch1q1.explanation)).toBeVisible()
    expect(await readStorage(page, 'vnu-ai-quiz:progress.v2')).toEqual([questionKey(ch1q1)])

    await navigate(page, 'Tổng quan')
    await expect(page.getByText('1/200 câu')).toBeVisible()
    await page.getByRole('button', { name: 'Ôn tiếp' }).click()
    await expect(page.getByText(questions[1].question, { exact: true })).toBeVisible()
})

test('bookmark được lưu theo khoá chương và còn sau khi tải lại', async ({ page }) => {
    await page.getByRole('button', { name: /Đánh dấu câu khó/ }).click()
    await expect(page.getByRole('button', { name: /Đã đánh dấu/ })).toBeVisible()
    expect(await readStorage(page, 'vnu-ai-quiz:bookmarks.v2')).toEqual([questionKey(ch1q1)])

    await page.reload()
    await navigate(page, 'Ôn tập')
    await expect(page.getByRole('button', { name: /Đã đánh dấu/ })).toBeVisible()
})

test('bookmark câu id 1 chương 1 không đánh dấu câu id 1 chương 2', async ({ page }) => {
    expect(ch1q1.id).toBe(ch2q1.id)
    await page.getByRole('button', { name: /Đánh dấu câu khó/ }).click()

    await page.locator('select').selectOption('2')
    await expect(page.getByText(ch2q1.question)).toBeVisible()
    await expect(page.getByRole('button', { name: /Đánh dấu câu khó/ })).toBeVisible()

    await page.locator('select').selectOption('1')
    await expect(page.getByRole('button', { name: /Đã đánh dấu/ })).toBeVisible()
})
