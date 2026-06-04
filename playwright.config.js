import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
  },
  webServer: {
    command: 'python3 -m http.server 8765',
    port: 8765,
    reuseExistingServer: true,
    timeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
