import { expect, test } from '../fixtures'

test('Dashboard hiển thị đúng, không còn THPTQG', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Ôn tập ngay/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Thi thử 30 phút/ }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lịch sử thi thử' })).toBeVisible()

    const text = await page.locator('body').innerText()
    expect(text).not.toMatch(/THPT/i)
    expect(text).toMatch(/Tổng câu hỏi\s*200/)
    expect(text).toMatch(/Số chương\s*5/)
})

test('favicon được khai báo và tải được', async ({ page, request }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="icon"]').getAttribute('href')
    expect(href).toBe('/favicon.svg')
    const res = await request.get(href!)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('svg')
})
