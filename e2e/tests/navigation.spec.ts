import { expect, heading1, navigate, PAGES, test } from '../fixtures'

test('điều hướng qua mọi trang bằng menu', async ({ page }) => {
    await page.goto('/')
    for (const { nav, title } of PAGES) {
        await navigate(page, nav)
        await expect(heading1(page, title)).toBeVisible()
    }
    await navigate(page, 'Tổng quan')
    await expect(page.getByRole('heading', { name: 'Lịch sử thi thử' })).toBeVisible()
})

for (const { nav, title } of PAGES) {
    test(`tải lại giữ trang "${nav}"`, async ({ page }) => {
        await page.goto('/')
        await navigate(page, nav)
        await expect(heading1(page, title)).toBeVisible()
        await page.reload()
        await expect(heading1(page, title)).toBeVisible()
    })
}
