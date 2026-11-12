import { expect, heading1, tabBar, test } from '../fixtures'
import { ATTEMPT_MINUTES, chapters, exam, installFakeApi, questions, signIn, subject } from './fakeApi'

const seconds = (clock: string) => { const [m, s] = clock.split(':').map(Number); return m * 60 + s }
const clockText = async (page: import('@playwright/test').Page) => (await page.getByLabel('Thời gian còn lại').innerText()).trim()

test.describe('đã đăng nhập (API máy chủ)', () => {
    test.beforeEach(async ({ page }) => { await signIn(page) })

    test('Ôn tiếp mở môn đang học tại câu đầu tiên chưa làm', async ({ page }) => {
        const api = await installFakeApi(page, { answered: 2 })
        await page.goto('/')
        await expect(heading1(page, 'Chào An!')).toBeVisible()
        await expect(page.getByRole('heading', { name: subject.name })).toBeVisible()
        await expect(page.getByText('2/6 câu đã làm')).toBeVisible()

        await page.getByRole('button', { name: 'Ôn tiếp' }).click()
        await expect(page).toHaveURL(`/practice/${subject.code}?resume=1`)
        await expect(page.getByText(questions[2].content)).toBeVisible()
        await expect(page.getByText('Câu 3/6')).toBeVisible()
        const request = api.requests.find((url) => url.pathname.endsWith('/practice/questions'))!
        expect(request.searchParams.get('subject_id')).toBe(subject.id)
        expect(request.searchParams.get('resume')).toBe('true')
    })

    test('Chọn chương mở đúng môn đang học, chương chọn được gửi lên máy chủ', async ({ page }) => {
        const api = await installFakeApi(page)
        await page.goto('/')
        await page.getByRole('button', { name: 'Chọn chương' }).click()
        await expect(page).toHaveURL(`/subjects/${subject.code}`)
        await expect(heading1(page, subject.name)).toBeVisible()

        await page.getByRole('button', { name: new RegExp(chapters[1].title) }).click()
        await expect(page).toHaveURL(new RegExp(`/practice/${subject.code}\\?.*chapter=${chapters[1].id}`))
        await expect(page.getByText(questions[3].content)).toBeVisible()
        const request = api.requests.filter((url) => url.pathname.endsWith('/practice/questions')).at(-1)!
        expect(request.searchParams.get('chapter_id')).toBe(chapters[1].id)
    })

    test('tải lại bài thi giữ lựa chọn và thời gian theo hạn nộp của máy chủ', async ({ page }) => {
        const api = await installFakeApi(page)
        await page.goto(`/exams/${exam.id}`)
        await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click()
        await expect(page).toHaveURL(/\/attempts\//)
        const before = await clockText(page)
        expect(seconds(before)).toBeLessThanOrEqual(ATTEMPT_MINUTES * 60)
        expect(seconds(before)).toBeGreaterThan(ATTEMPT_MINUTES * 60 - 10)

        await page.getByRole('button', { name: 'Đáp án sai 1' }).click()
        await expect(page.getByRole('button', { name: 'Đáp án sai 1' })).toHaveAttribute('aria-pressed', 'true')
        await page.getByRole('button', { name: 'Câu tiếp' }).click()
        await page.getByRole('button', { name: 'Đáp án đúng 2' }).click()
        await expect(page.getByRole('button', { name: 'Đáp án đúng 2' })).toHaveAttribute('aria-pressed', 'true')
        expect(api.saved.size).toBe(2)

        await page.waitForTimeout(2000)
        const beforeReload = seconds(await clockText(page))
        await page.reload()

        await expect(page.getByText('Đã trả lời 2/3')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Đáp án sai 1' })).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByRole('button', { name: 'Đáp án đúng 1' })).toHaveAttribute('aria-pressed', 'false')
        await page.getByRole('button', { name: 'Câu 2', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Đáp án đúng 2' })).toHaveAttribute('aria-pressed', 'true')
        const after = seconds(await clockText(page))
        expect(after, 'đồng hồ không đặt lại về 30:00').toBeLessThanOrEqual(beforeReload)
        expect(after, 'đồng hồ chạy tiếp theo hạn nộp').toBeGreaterThan(beforeReload - 10)
    })

    test.describe('di động', () => {
        test.use({ viewport: { width: 390, height: 844 } })

        test('thanh tab dưới không che nút Câu tiếp (ôn tập máy chủ và bài thi)', async ({ page }) => {
            await installFakeApi(page)
            await page.goto(`/practice/${subject.code}`)
            await expect(page.getByText(questions[0].content)).toBeVisible()
            await expectNotCovered(page)

            await page.goto(`/exams/${exam.id}`)
            await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click()
            await expect(page.getByLabel('Thời gian còn lại')).toBeVisible()
            await expectNotCovered(page)
        })
    })
})

test('khách: Chọn chương mở môn trên thiết bị (ngân hàng cục bộ) dù đã cấu hình API', async ({ page }) => {
    const api = await installFakeApi(page)
    await page.goto('/')
    await expect(heading1(page, 'Hôm nay học gì?')).toBeVisible()
    await page.getByRole('button', { name: 'Chọn chương' }).click()
    await expect(page).toHaveURL(`/subjects/${subject.code}?local=1`)
    await expect(heading1(page, subject.name)).toBeVisible()
    await page.getByRole('button', { name: /Chương 2: Khai thác dữ liệu/ }).click()
    await expect(page.getByLabel('Chương ôn tập')).toHaveValue('2')
    expect(api.requests.some((url) => url.pathname.endsWith(`/subjects/${subject.code}`)), 'không lấy chương của môn máy chủ').toBe(false)
})

async function expectNotCovered(page: import('@playwright/test').Page) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const next = (await page.getByRole('button', { name: 'Câu tiếp' }).boundingBox())!
    const bar = (await tabBar(page).boundingBox())!
    expect(next.y + next.height, 'nút Câu tiếp nằm trên thanh tab').toBeLessThanOrEqual(bar.y)
}
