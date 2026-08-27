import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 40_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.012 },
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 900 },
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    locale: 'zh-CN',
  },
  reporter: [['line']],
})
