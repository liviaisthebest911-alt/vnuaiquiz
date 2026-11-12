import { defineConfig, devices } from '@playwright/test'

// E2E chạy trên bản build production (vite build + vite preview) ở máy local/CI.
// Mỗi test có context trình duyệt riêng → localStorage trống, không chạm dữ liệu người dùng thật.
const PORT = 4173
const isCI = !!process.env.CI

export default defineConfig({
    testDir: './e2e/tests',
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    workers: isCI ? 2 : undefined,
    reporter: isCI
        ? [['list'], ['html', { open: 'never' }]]
        : [['list']],
    outputDir: 'test-results',
    use: {
        baseURL: `http://localhost:${PORT}`,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        locale: 'vi-VN',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    ],
    webServer: {
        command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !isCI,
        timeout: 120_000,
    },
})
