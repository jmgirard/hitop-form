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
// With a store in the link, the one request beyond that set is the POST to
// the store's address, and it is made only when Finish is pressed:
//
//   N4: the HiTOP-BR walk with a store that answers directly: the set at the
//       last page before Finish equals the three above, and after Finish it
//       equals them plus the store URL
//   N5: the same walk with a store that answers 302 to a third origin: after
//       Finish the set equals the three plus the store URL plus the redirect
//       target

import { test, expect } from '@playwright/test';
import {
  useTarget, useStore, allowLocalStore, webhook, openForm, begin, walkAll, fetchExport, readDescriptor,
  exportUrl, awaitDownload, answerPage, currentPage, nextButton,
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

for (const [label, storePath, extra] of [
  ['N4', '/record', () => []],
  ['N5', '/redirect', () => [`${store().targetOrigin}/record`]],
]) {
  test(`${label}: the HiTOP-BR walk with a store through ${storePath} requests the store only at Finish`, async ({ page, context }) => {
    await allowLocalStore(context);
    const s = webhook(store(), storePath);
    const urls = record(page);
    await openForm(page, base(), { instrument: 'hitopbr', study: 'net', participant: label.toLowerCase(), store: s });
    await begin(page);
    await walkToLast(page);
    expect([...urls].sort(), 'before Finish').toEqual([...ownFiles('hitopbr')].sort());
    await nextButton(page).click();
    await expect(page.locator('h1')).toHaveText('Thank you');
    await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
    expect([...urls].sort(), 'after Finish').toEqual([...ownFiles('hitopbr'), s.url, ...extra()].sort());
  });
}

test('N3: the altered-format refusal requests only its files and the export', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  const urls = record(page);
  await openForm(page, base(), { instrument: 'hitopbr', study: 'net', participant: 'n3' }, {
    exportJson: { ...exp, format: '2.0' },
  });
  await expect(page.locator('[role=alert]')).toContainText('format "2.0"');
  expect([...urls].sort()).toEqual([...ownFiles('hitopbr')].sort());
});
