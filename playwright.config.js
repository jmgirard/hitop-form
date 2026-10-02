import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  // The page fetches one JSON file per instrument and renders it. Nothing
  // boots and nothing compiles, so Playwright's defaults are generous; the longest walk answers
  // 405 items over 27 pages.
  timeout: 2 * 60 * 1000,
  expect: { timeout: 15 * 1000 },
  // One retry on every CI run, so a single hiccup does not turn the job red
  // on its own, such as one fetching an export from the package's site on
  // the weekly run. A second failure does. Pull request and push runs answer
  // the exports from tests/fixtures/exports/, and
  // tests/link-sections.spec.js does so on every run. Locally none: a red
  // run is what a plant is asking for.
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
