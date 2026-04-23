import { defineConfig } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001"
const isRemote = BASE_URL.startsWith("https")

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Web server doar pentru teste locale
  ...(!isRemote && {
    webServer: {
      command: "npm run dev",
      port: 3001,
      reuseExistingServer: true,
    },
  }),
})
