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

import { test, expect } from '@playwright/test';
import {
  useTarget, openForm, begin, walkAll, fetchExport, readDescriptor, exportUrl, awaitDownload,
} from './helpers.mjs';

const base = useTarget();

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

test('N3: the altered-format refusal requests only its files and the export', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  const urls = record(page);
  await openForm(page, base(), { instrument: 'hitopbr', study: 'net', participant: 'n3' }, {
    exportJson: { ...exp, format: '2.0' },
  });
  await expect(page.locator('[role=alert]')).toContainText('format "2.0"');
  expect([...urls].sort()).toEqual([...ownFiles('hitopbr')].sort());
});
