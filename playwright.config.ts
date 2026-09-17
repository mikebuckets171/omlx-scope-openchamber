import { defineConfig, devices } from '@playwright/test';

const PORT = 8787;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/browser',
  testMatch: /preview\.ts$/,
  timeout: 20_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: BASE_URL,
    actionTimeout: 5_000,
    navigationTimeout: 5_000,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun run preview',
    url: BASE_URL,
    cwd: '.',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
