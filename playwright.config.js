import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  // The page fetches one JSON file and renders it. Nothing boots and nothing
  // compiles, so Playwright's defaults are generous; the longest walk answers
  // 405 items over 27 pages.
  timeout: 2 * 60 * 1000,
  expect: { timeout: 15 * 1000 },
  // One retry in CI, so a single hiccup fetching the export from the package's
  // site does not turn the job red on its own. A second failure does. Locally
  // none: a red run is what a plant is asking for.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  // The full Chromium build rather than Playwright's headless shell: what the
  // page has to work in is a real browser, and the shell is a cut-down one.
  use: {
    browserName: 'chromium',
    channel: 'chromium',
    headless: true,
    acceptDownloads: true,
    actionTimeout: 15 * 1000,
  },
});
