import { expect, heading1, horizontalOverflow, navigate, test } from '../fixtures'

test('lật thẻ, chuyển thẻ, xáo bài', async ({ page }) => {
    await page.goto('/')
    await navigate(page, 'Flashcard')
    await expect(heading1(page, 'Thẻ ghi nhớ nhanh')).toBeVisible()
    await expect(page.getByText(/Thẻ 1\/200/)).toBeVisible()

    const card = page.getByRole('button', { name: 'Lật thẻ để xem đáp án' })
    await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
    await expect(card).toHaveClass(/is-flipped/)

    await page.getByRole('button', { name: /Tiếp/ }).click()
    await expect(page.getByText(/Thẻ 2\/200/)).toBeVisible()
    await expect(card).not.toHaveClass(/is-flipped/)

    await page.getByRole('button', { name: /Trước/ }).click()
    await expect(page.getByText(/Thẻ 1\/200/)).toBeVisible()

    await page.getByRole('button', { name: /Tiếp/ }).click()
    await page.getByRole('button', { name: 'Xáo bài' }).click()
    await expect(page.getByText(/Thẻ 1\/200/)).toBeVisible()
})

for (const width of [360, 390, 768, 1440]) {
    test(`hàng nút Flashcard vừa màn hình ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        await navigate(page, 'Flashcard')
        await expect(heading1(page, 'Thẻ ghi nhớ nhanh')).toBeVisible()

        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
        for (const name of ['Trước', 'Xáo bài', 'Lật thẻ', 'Tiếp']) {
            const box = (await page.getByRole('button', { name, exact: name !== 'Trước' && name !== 'Tiếp' }).last().boundingBox())!
            expect(box.x, `${name} không tràn trái`).toBeGreaterThanOrEqual(0)
            expect(box.x + box.width, `${name} không tràn phải`).toBeLessThanOrEqual(width)
        }
    })
}
