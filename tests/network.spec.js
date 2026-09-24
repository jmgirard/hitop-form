// The page transmits nothing: over three recorded walks, every request the
// page makes is one of its own files or the one export fetch.
//
//   N1: the full HiTOP-BR through save
//   N2: the shuffled module through save
//   N3: the altered-format refusal
//
// Each walk records every request the page issues and asserts the set of
// URLs (query strings dropped: the page's own address carries the study link)
// equals { the page, form.js, the export }. A request the page never made
// cannot be in the set, and one it made to anywhere else fails the walk.
//
// With a store in the link, the requests beyond that set are the POST to
// the store's address and any redirect it answers with, and the POST is
// made only when Finish is pressed:
//
//   N4: the HiTOP-BR walk with a store that answers directly: the set at the
//       last page before Finish equals the three above, and after Finish it
//       equals them plus the store URL
//   N5: the same walk with a store that answers 302 to a third origin: after
//       Finish the set equals the three plus the store URL plus the redirect
//       target
//   N6: the same walk with a supabase store: after Finish the set equals
//       the three plus the insert address under the project URL
//   N7: the N4 walk with a complete address in the link: after Finish the
//       set equals the three plus the store URL plus the completion address,
//       reached once, and nothing else

import { test, expect } from '@playwright/test';
import {
  useTarget, useStore, allowLocalStore, webhook, supabase, openForm, begin, walkAll, fetchExport, readDescriptor,
  exportUrl, awaitDownload, answerPage, currentPage, nextButton, COMPLETE_URL, serveComplete,
} from './helpers.mjs';

const base = useTarget();
const store = useStore();

// The page's own address carries the study link as its query string, which
// is dropped; any other request keeps its query, so an answer smuggled onto
// a request for one of the page's own files fails the walk too.
function recorded(u) {
  const url = new URL(u);
  const bare = `${url.origin}${url.pathname}`;
  return bare === base() ? bare : u;
}

function record(page) {
  const urls = new Set();
  page.on('request', (req) => urls.add(recorded(req.url())));
  return urls;
}

function ownFiles(instrument) {
  return new Set([base(), `${base()}form.js`, exportUrl(instrument)]);
}

test('N1: the HiTOP-BR walk through save requests only its files and the export', async ({ page }) => {
  const urls = record(page);
  await openForm(page, base(), { instrument: 'hitopbr', study: 'net', participant: 'n1' });
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  await downloading;
  await expect(page.locator('h1')).toHaveText('Thank you');
  expect([...urls].sort()).toEqual([...ownFiles('hitopbr')].sort());
});

test('N2: the shuffled module walk through save requests only its files and the export', async ({ page }) => {
  const module = await readDescriptor('module-shuffled.json');
  const urls = record(page);
  await openForm(page, base(), { instrument: module.instrument, study: 'net', module });
  await begin(page, 'n2');
  const downloading = awaitDownload(page);
  await walkAll(page);
  await downloading;
  await expect(page.locator('h1')).toHaveText('Thank you');
  expect([...urls].sort()).toEqual([...ownFiles(module.instrument)].sort());
});

// Answers every page up to and including the last, without pressing Finish.
async function walkToLast(page) {
  for (;;) {
    const { page: p, of } = await currentPage(page);
    await answerPage(page);
    if (p === of) return;
    await nextButton(page).click();
    await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${of}`);
  }
}

for (const [label, storePath, extra, make] of [
  ['N4', '/record', () => [], (s) => webhook(s, '/record')],
  ['N5', '/redirect', () => [`${store().targetOrigin}/record`], (s) => webhook(s, '/redirect')],
  // N6: a supabase store: the one further address is the insert's, which
  // the preflight and the POST share.
  ['N6', '/rest/v1/net_responses', () => [], (s) => supabase(s, { table: 'net_responses' })],
]) {
  test(`${label}: the HiTOP-BR walk with a store through ${storePath} requests the store only at Finish`, async ({ page, context }) => {
    await allowLocalStore(context);
    const s = make(store());
    const sent = store().url(storePath);
    const urls = record(page);
    await openForm(page, base(), { instrument: 'hitopbr', study: 'net', participant: label.toLowerCase(), store: s });
    await begin(page);
    await walkToLast(page);
    expect([...urls].sort(), 'before Finish').toEqual([...ownFiles('hitopbr')].sort());
    await nextButton(page).click();
    await expect(page.locator('h1')).toHaveText('Thank you');
    await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
    expect([...urls].sort(), 'after Finish').toEqual([...ownFiles('hitopbr'), sent, ...extra()].sort());
  });
}

test('N7: the HiTOP-BR walk with a store and a complete address requests the store at Finish, draws the sent screen, then the address, once', async ({ page, context }) => {
  await allowLocalStore(context);
  const sent = store().url('/record');
  const urls = record(page);
  // The address's route holds the request open while the document is read.
  const requests = [];
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route(COMPLETE_URL, async (route) => {
    requests.push(route.request().method());
    await held;
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<h1>Submission complete</h1>' });
  });
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'net', participant: 'n7', store: webhook(store(), '/record'), complete: COMPLETE_URL,
  });
  await begin(page);
  const states = [];
  await page.exposeFunction('noteState', (s) => states.push(s));
  await page.evaluate(() => {
    const snapshot = () => ({
      h1: document.querySelector('h1')?.textContent ?? null,
      href: document.querySelector('p.complete a')?.getAttribute('href') ?? null,
      navButtons: document.querySelectorAll('.nav button').length,
    });
    new MutationObserver(() => window.noteState(snapshot())).observe(document.body, { childList: true, subtree: true });
  });
  await walkToLast(page);
  expect([...urls].sort(), 'before Finish').toEqual([...ownFiles('hitopbr')].sort());
  await nextButton(page).click();
  await expect.poll(() => requests.length, 'the navigation request was made').toBe(1);
  // The document at the request, as the observer last reported it: a
  // locator or an evaluate would wait on the held navigation (send T15).
  expect(states.some((s) => s.navButtons > 0), 'the observer saw nav buttons on the form').toBe(true);
  expect(states.at(-1)).toEqual({ h1: 'Thank you', href: COMPLETE_URL, navButtons: 0 });
  release();
  await expect(page).toHaveURL(COMPLETE_URL);
  expect([...urls].sort(), 'after Finish').toEqual([...ownFiles('hitopbr'), sent, COMPLETE_URL].sort());
  expect(requests, 'one navigation to the completion address').toEqual(['GET']);
});

test('N3: the altered-format refusal requests only its files and the export', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  const urls = record(page);
  await openForm(page, base(), { instrument: 'hitopbr', study: 'net', participant: 'n3' }, {
    exportJson: { ...exp, format: '2.0' },
  });
  await expect(page.locator('[role=alert]')).toContainText('format "2.0"');
  expect([...urls].sort()).toEqual([...ownFiles('hitopbr')].sort());
});
