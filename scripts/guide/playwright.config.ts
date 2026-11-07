import { defineConfig } from '@playwright/test';

/** Records the guide's videos against the local stack (pnpm guide:record). Not part of the test suite. */
export default defineConfig({
  testDir: '.',
  testMatch: 'record.spec.ts',
  globalSetup: '../../e2e/global-setup.ts',
  workers: 1,
  timeout: 45 * 60_000,
  expect: { timeout: 30_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3100',
    channel: 'chrome',
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
  },
  outputDir: 'out/test-results',
});
