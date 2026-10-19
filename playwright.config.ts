import { defineConfig } from '@playwright/test';

/**
 * Browser tests against a running local stack: web on :3100, gateway on :3000, IAM on :3001.
 * One-time codes and invitation links are read from the IAM log (development email sender).
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3100',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  outputDir: 'test-results',
});
