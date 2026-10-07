import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  timeout: 15000,
  webServer: {
    command: 'npx wrangler pages dev dist --port 8082',
    port: 8082,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  use: {
    baseURL: 'http://127.0.0.1:8082',
    browserName: 'chromium',
    headless: true,
  },
});
