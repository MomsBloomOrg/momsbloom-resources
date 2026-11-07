/**
 * Playwright browser tests for the embed. `pnpm test:e2e` builds the app, starts it on port 3100,
 * and serves the fake host page on port 4100. No database is needed.
 * First time only: run `pnpm exec playwright install chromium` to download the test browser.
 */
import { defineConfig, devices } from "@playwright/test";
import { APP, APP_PORT, HOST, HOST_PORT } from "./e2e/fixture";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: APP, ...devices["Desktop Chrome"] },
  webServer: [
    {
      command: `pnpm build && pnpm start -p ${APP_PORT}`,
      url: `${APP}/embed.js`,
      timeout: 300_000,
      reuseExistingServer: false,
      // Let the fake host page frame /embed (production allows only momsbloom.org and Squarespace).
      env: { EMBED_EXTRA_FRAME_ANCESTORS: HOST },
    },
    {
      command: `node e2e/host-server.mjs ${HOST_PORT} ${APP}`,
      url: HOST,
      reuseExistingServer: false,
    },
  ],
});
