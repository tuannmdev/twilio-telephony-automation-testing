import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: "test-results/artifacts",
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"]
  ],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },

  projects: [
    {
      name: "api-tests",
      testMatch: /.*\/api\/.*\.spec\.ts/,
      use: {
        baseURL: "https://api.twilio.com"
      }
    },
    {
      name: "ui-tests",
      testMatch: /.*\/ui\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000"
      }
    }
  ],

  webServer: {
    command: "npx ts-node src/mock-server/server.ts",
    url: "http://localhost:3000/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
