import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  /**
   * CI downloads Playwright's own Chromium. Locally, PW_USE_SYSTEM_CHROME=1
   * points at an already-installed Chrome instead, for networks where the
   * cdn.playwright.dev download is blocked.
   */
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        ...(process.env.PW_USE_SYSTEM_CHROME === '1' ? { channel: 'chrome' } : {}),
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PW_USE_SYSTEM_CHROME === '1' ? { channel: 'chrome' } : {}),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'npm run build && npm run start', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
