import { defineConfig, devices } from '@playwright/test';

// A free port in the scratch range 4900-4999 (Y:\Keystone\docs\ports.md); the dev server uses 4252.
const PORT = 4950;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/sip-shelf/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-phone', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 15'] } },
  ],
  // The production build, served as GitHub Pages would: it is what installs and works offline.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/sip-shelf/`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
