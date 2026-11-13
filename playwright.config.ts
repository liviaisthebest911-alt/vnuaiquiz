import { defineConfig, devices } from '@playwright/test'

// E2E chạy trên bản build production (vite build + vite preview) ở máy local/CI.
// Mỗi test có context trình duyệt riêng → localStorage trống, không chạm dữ liệu người dùng thật.
const PORT = 4173
const API_PORT = 4174 // bản build có VITE_API_URL='/' + Supabase giả: backend được giả lập trong test (e2e/api/fakeApi.ts)
const isCI = !!process.env.CI

export default defineConfig({
    testDir: './e2e',
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
        { name: 'chromium', testDir: './e2e/tests', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'api', testDir: './e2e/api', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${API_PORT}` } },
    ],
    webServer: [
        {
            command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
            url: `http://localhost:${PORT}`,
            reuseExistingServer: !isCI,
            timeout: 120_000,
        },
        {
            command: `VITE_API_URL=/ VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_PUBLISHABLE_KEY=e2e-publishable npx vite build --outDir dist-e2e-api && npx vite preview --outDir dist-e2e-api --port ${API_PORT} --strictPort`,
            url: `http://localhost:${API_PORT}`,
            reuseExistingServer: !isCI,
            timeout: 120_000,
        },
    ],
})
