import { expect, heading1, horizontalOverflow, navigate, PAGES, startExam, test } from '../fixtures'

const VIEWPORTS = [
    { name: 'mobile-360', width: 360, height: 740, mobileMenu: true },
    { name: 'mobile-390', width: 390, height: 844, mobileMenu: true },
    { name: 'tablet-768', width: 768, height: 1024, mobileMenu: false }, // Tailwind md = 768px → menu desktop
    { name: 'desktop-1440', width: 1440, height: 900, mobileMenu: false },
]

for (const vp of VIEWPORTS) {
    test.describe(vp.name, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } })

        test('loại menu đúng breakpoint, mọi trang không tràn ngang', async ({ page }) => {
            await page.goto('/')
            await expect(page.locator('header nav')).toBeVisible({ visible: !vp.mobileMenu })
            expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

            for (const { nav, title } of PAGES) {
                await navigate(page, nav)
                await expect(heading1(page, title)).toBeVisible()
                expect(await horizontalOverflow(page), `${nav} @ ${vp.width}px`).toBeLessThanOrEqual(0)
            }
        })

        test('trang làm bài không tràn ngang', async ({ page }) => {
            await page.goto('/')
            await startExam(page)
            expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
        })
    })
}
