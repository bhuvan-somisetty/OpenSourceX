import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** E2E runs against the real app on recorded data. It starts `pnpm dev` if nothing is running. */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL, channel: "chrome", trace: "retain-on-failure" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: `${baseURL}/api/v1/health`,
        reuseExistingServer: true,
        timeout: 240_000,
      },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: "chrome", viewport: { width: 390, height: 844 } },
    },
  ],
});
