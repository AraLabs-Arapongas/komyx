import { defineConfig, devices } from "@playwright/test";

/**
 * Demo recordings: one slow, captioned run per flow. Videos land in ./videos.
 * Run: pnpm demo:videos
 */
export default defineConfig({
  testDir: "./tests/demo",
  testMatch: /.*\.demo\.ts$/,
  timeout: 10 * 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./test-results/demo",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1280, height: 800 },
    video: { mode: "on", size: { width: 1280, height: 800 } },
    launchOptions: { slowMo: 250 },
    trace: "off",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "demo", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
});
