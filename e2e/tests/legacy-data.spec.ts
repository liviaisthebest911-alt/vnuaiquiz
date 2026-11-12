import { expect, heading1, navigate, readStorage, seedStorage, startExam, submitExam, test } from '../fixtures'

// Dữ liệu do các phiên bản cũ ghi vào trình duyệt – phải giữ nguyên, không bị xoá/ghi đè.
const LEGACY = {
    'vnuaiquiz_exam_history': '[{"examId":"de-thi-thu-01","score":7.5}]',
    'vnuaiquiz_error_vault': '[{"id":"p1-3"}]',
    'vnuaiquiz_exam_session_de-thi-thu-01': '{"examId":"de-thi-thu-01","startedAt":1}',
    'vnu-ai-quiz:bookmarks': '[1,7]',
    'vnu-ai-quiz:progress': '[1,2,3]',
    'vnu-ai-quiz:history': '[{"id":"old-1","createdAt":"2026-01-01T00:00:00.000Z","totalQuestions":40,"correct":30,"accuracy":75,"score":7.5}]',
}

test('dữ liệu localStorage cũ còn nguyên sau khi dùng app; lịch sử cũ được giữ', async ({ page }) => {
    await seedStorage(page, LEGACY)

    // Dashboard đọc lịch sử cũ
    await expect(page.getByText('Đề thi thử · 40 câu')).toBeVisible()

    // Dùng app: ôn tập + bookmark + thi + nộp bài
    await navigate(page, 'Ôn tập')
    await expect(heading1(page, 'Ôn tập theo chương')).toBeVisible()
    await page.getByRole('button', { name: /Đánh dấu câu khó/ }).click()
    await startExam(page)
    await submitExam(page)
    await page.reload()

    for (const key of Object.keys(LEGACY).filter((k) => k !== 'vnu-ai-quiz:history')) {
        expect(await page.evaluate((k) => localStorage.getItem(k), key), key).toBe(LEGACY[key as keyof typeof LEGACY])
    }

    const history = await readStorage<Array<{ id: string }>>(page, 'vnu-ai-quiz:history')
    expect(history).toHaveLength(2)
    expect(history![1]).toEqual(JSON.parse(LEGACY['vnu-ai-quiz:history'])[0])
})

test('bookmark cũ bằng id mơ hồ (5 chương cùng id) không bị tự gán chương', async ({ page }) => {
    await seedStorage(page, { 'vnu-ai-quiz:bookmarks': '[1]' })
    await navigate(page, 'Ôn tập')
    await expect(heading1(page, 'Ôn tập theo chương')).toBeVisible()
    await expect(page.getByRole('button', { name: /Đánh dấu câu khó/ })).toBeVisible()
    expect(await readStorage(page, 'vnu-ai-quiz:bookmarks.v2')).toEqual([])
    expect(await readStorage(page, 'vnu-ai-quiz:bookmarks')).toEqual([1])
})
