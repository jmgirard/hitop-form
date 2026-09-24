// Shared by every spec: where the page is served from, how a study link is
// built, and how a page of items is read and answered.
//
// The target is the deployed page when FORM_TARGET names it, and otherwise
// this checkout served on localhost. FORM_REQUIRE_TARGET makes a missing
// FORM_TARGET an error rather than a fallback, so the scheduled run can never
// quietly test the checkout instead.

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDir, serveStore } from './serve.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURES = path.join(ROOT, 'tests', 'fixtures');
export const EXPORT_BASE = 'https://jmgirard.github.io/hitop/downloads/';
export const PAGE_SIZE = 15;
// The page's limit on a send, stated here rather than read from form.js.
export const SEND_TIMEOUT_MS = 30 * 1000;

export function exportUrl(instrument) {
  return `${EXPORT_BASE}${instrument}.json`;
}

// Fetches the export the page will fetch, so a test's expectations come from
// the same file and not from a copy that could drift.
export async function fetchExport(instrument) {
  const res = await fetch(exportUrl(instrument));
  if (!res.ok) throw new Error(`fetching ${exportUrl(instrument)}: HTTP ${res.status}`);
  return res.json();
}

export async function readFixture(name) {
  return readFile(path.join(FIXTURES, name), 'utf8');
}

export async function readDescriptor(name) {
  return JSON.parse(await readFixture(name));
}

export function encodeConfig(config) {
  return Buffer.from(JSON.stringify(config), 'utf8').toString('base64url');
}

// Registers beforeAll/afterAll hooks that resolve the target, and returns a
// getter for its base URL (always ending in a slash).
export function useTarget() {
  let base;
  let server = null;
  test.beforeAll(async () => {
    const target = process.env.FORM_TARGET?.trim();
    if (target) {
      base = target.endsWith('/') ? target : `${target}/`;
    } else if (process.env.FORM_REQUIRE_TARGET) {
      throw new Error('FORM_REQUIRE_TARGET is set but FORM_TARGET is empty');
    } else {
      server = await serveDir(ROOT);
      base = `${server.origin}/`;
    }
  });
  test.afterAll(async () => {
    if (server) await server.close();
  });
  return () => base;
}

// Registers beforeAll/afterAll hooks that start and stop a recording
// endpoint (tests/serve.mjs serveStore()), whatever the target: the send
// tests need their own store even when FORM_TARGET names the deployed page.
// Returns a getter for the store.
export function useStore() {
  let store;
  test.beforeAll(async () => {
    store = await serveStore();
  });
  test.afterAll(async () => {
    if (store) await store.close();
  });
  return () => store;
}

// The deployed page is on a public origin, and Chromium lets a public page
// reach a local address only under a permission the browser grants by
// prompt. Under FORM_TARGET this asks Playwright to grant it, and skips the
// test with the reason when that call is refused. Against the checkout both
// origins are loopback, and nothing is asked.
export async function allowLocalStore(context) {
  if (!process.env.FORM_TARGET?.trim()) return;
  try {
    await context.grantPermissions(['local-network-access']);
  } catch (e) {
    test.skip(true, `the deployed page cannot post to the local recording endpoint: ${e.message}`);
  }
}

// The store a link names for a path on the recording endpoint.
export function webhook(store, p = '/record') {
  return { kind: 'webhook', url: store.url(p) };
}

// A supabase store whose project URL is the recording endpoint's origin
// (plus `p`, for the accepted suffixes), so the insert goes to
// /rest/v1/<table> there.
export function supabase(store, { key = 'sb_publishable_test', table = 'responses', p = '' } = {}) {
  return { kind: 'supabase', url: store.url(p), key, table };
}

// A key of the legacy anon shape: three dot-separated segments. Not a real
// token; only its shape is read.
export const JWT_SHAPED_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl';

// `extra` is appended to the address after the link's own parameter: the
// Prolific parameters a study URL carries, as `&PROLIFIC_PID=…`.
export function formUrl(base, config, extra = '') {
  return `${base}?c=${encodeConfig(config)}${extra}`;
}

// The three values a Prolific study fills in, of the shape its example ID
// has (24 hexadecimal characters), and the query that carries them.
export const PROLIFIC = {
  pid: '5a9d64f5f6dfdd0001eaa73d',
  study: '66f3a1b2c3d4e5f60718293a',
  session: '66f3a1b2c3d4e5f60718294b',
};

// A value given as null leaves its parameter out of the query.
export function prolificQuery(given = {}) {
  const { pid, study, session } = { ...PROLIFIC, ...given };
  const part = (name, v) => (v === null ? '' : `&${name}=${v}`);
  return part('PROLIFIC_PID', pid) + part('STUDY_ID', study) + part('SESSION_ID', session);
}

// A completion address for a link's `complete` field, of the shape Prolific's
// help center shows, and a route that answers it with a small page and
// counts the requests that reached it. The address is never fetched for
// real: Playwright fulfills it inside the browser.
export const COMPLETE_URL = 'https://app.prolific.com/submissions/complete?cc=CHHXQERF';
// A second address for a link's `completeSaved` field, on another host so a
// link labelled by its host tells the two apart in a test. A real study's
// two codes both sit on app.prolific.com; each outcome screen shows one
// link, so the label need not tell them apart there.
export const COMPLETE_SAVED_URL = 'https://saved.example.org/submissions/complete?cc=SAVED123';

export async function serveComplete(page, url = COMPLETE_URL) {
  const requests = [];
  await page.route(url, (route) => {
    requests.push({ method: route.request().method(), url: route.request().url() });
    return route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><title>Completed</title></head><body><h1>Submission complete</h1></body></html>',
    });
  });
  return requests;
}

// Opens the form for a config. `exportBody`, when given, is served in place
// of the real export (a string, sent as JSON); `exportJson` is an object to
// send. Either way the request still leaves the page and is seen by any
// request listener. `extra` is formUrl()'s.
export async function openForm(page, base, config, { exportBody, exportJson, extra } = {}) {
  if (exportBody !== undefined || exportJson !== undefined) {
    await page.route(exportUrl(config.instrument), (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: exportBody !== undefined ? exportBody : JSON.stringify(exportJson),
      }),
    );
  }
  await page.goto(formUrl(base, config, extra));
}

// Presses Begin on the start screen, entering a participant identifier first
// when the screen asks for one.
export async function begin(page, participant) {
  const input = page.locator('input[name="participant"]');
  if (participant !== undefined) await input.fill(participant);
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.locator('.progress')).toBeVisible();
}

// Reads the items on the current page: instrument number, position on the
// form, text, and option labels.
export function readItems(page) {
  return page.$$eval('fieldset.item', (nodes) =>
    nodes.map((n) => ({
      number: Number(n.dataset.number),
      position: Number(n.dataset.position),
      text: n.querySelector('legend .text').textContent,
      labels: [...n.querySelectorAll('.options .label')].map((l) => l.textContent),
      values: [...n.querySelectorAll('input[type=radio]')].map((r) => Number(r.value)),
    })),
  );
}

// The option chosen for an item at a given position on the form: a fixed
// pattern, so a saved file is reproducible.
export function chosenIndex(position, optionCount) {
  return (position * 7) % optionCount;
}

// The lead columns a row or a file carries: the five study fields, then
// item_order under shuffle, then the two Prolific columns under prolific.
// Stated here rather than read from form.js.
export function leadColumns({ shuffle = false, prolific = false } = {}) {
  return [
    'study', 'participant', 'instrument', 'form_build', 'submitted',
    ...(shuffle ? ['item_order'] : []),
    ...(prolific ? ['prolific_study', 'prolific_session'] : []),
  ];
}

// The header and the values a shuffled walk writes, for a file's row or a
// posted row read back as an array of strings. `numbers` is the column
// order the file keeps (the export's items, or a module's `items`);
// `shown` the item numbers in the order the walk saw them, from
// walkAll(); `exp` the export. `prolific`, when given, is the `{ study,
// session }` the two Prolific columns must hold, after item_order. Checks
// the header, the item_order cell, the Prolific cells, and each item's value
// against the option chosenIndex() picked at the position that item was
// shown at.
export function expectShuffled(header, values, { exp, numbers, shown, prolific }) {
  const byNumber = new Map(exp.items.map((it) => [it.number, it]));
  const lead = leadColumns({ shuffle: true, prolific: prolific !== undefined });
  expect(header).toEqual([...lead, ...numbers.map((n) => byNumber.get(n).name)]);
  expect(values[5], 'item_order').toBe(shown.join(' '));
  if (prolific) expect(values.slice(6, 8), 'the Prolific cells').toEqual([prolific.study, prolific.session]);
  expect([...shown].sort((a, b) => a - b), 'shown is a rearrangement of the columns').toEqual([...numbers].sort((a, b) => a - b));
  const optionCount = exp.instructions.options.length;
  const items = values.slice(lead.length);
  expect(items.length).toBe(numbers.length);
  for (let i = 0; i < numbers.length; i++) {
    const position = shown.indexOf(numbers[i]) + 1;
    const expected = exp.instructions.options[chosenIndex(position, optionCount)].value;
    expect(Number(items[i]), `item ${numbers[i]}, shown at ${position}`).toBe(expected);
    expect(items[i], 'an integer').toMatch(/^-?\d+$/);
  }
}

// Answers every item on the current page, except those whose position on the
// page (1-based) is in `skip`.
export async function answerPage(page, { skip = [] } = {}) {
  const items = page.locator('fieldset.item');
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    if (skip.includes(i + 1)) continue;
    const item = items.nth(i);
    const position = Number(await item.getAttribute('data-position'));
    const radios = item.locator('input[type=radio]');
    await radios.nth(chosenIndex(position, await radios.count())).check();
  }
}

// A promise for the file the page saves. Started before the walk that ends
// in Finish, so it covers the whole walk: the 405-item HiTOP-SR takes longer
// than the action timeout on a slow runner, and the page's default timeout
// would otherwise cut the wait short.
export function awaitDownload(page) {
  return page.waitForEvent('download', { timeout: 110 * 1000 });
}

// The sentence a saved-file screen's trail paragraph ends with, naming the
// button below it.
export const SAVE_AGAIN = 'If the file did not appear, press Save the file.';

// The "Save the file" button on a saved-file screen: one button, and a
// first and a second click each save the file again under the Finish
// download's name, with its bytes. The download promise is created before
// each click, so a click that saves nothing fails on the wait.
export async function expectSaveAgain(page, download) {
  const button = page.getByRole('button', { name: 'Save the file' });
  await expect(button).toHaveCount(1);
  const bytes = await readFile(await download.path(), 'utf8');
  for (const click of ['first', 'second']) {
    const again = awaitDownload(page);
    await button.click();
    const d = await again;
    expect(d.suggestedFilename(), `the ${click} click's file name`).toBe(download.suggestedFilename());
    expect(await readFile(await d.path(), 'utf8'), `the ${click} click's bytes`).toBe(bytes);
  }
}

// The saved-file screen's children in document order, each as its tag and
// class: the heading, the lead paragraph, the file name's paragraph, the
// trail paragraph, the button, the completion link's paragraph when the link
// carries an address, then the version line.
export function savedScreenOrder({ complete = false } = {}) {
  return ['H1', 'P.done', 'P', 'P', 'BUTTON', ...(complete ? ['P.complete'] : []), 'P.version'];
}

export function screenOrder(page) {
  return page.$$eval('main > *', (nodes) => nodes.map((n) => n.tagName + (n.className ? `.${n.className}` : '')));
}

// RFC 4180: fields separated by commas, quoted when they hold a comma, a
// quote or a line break, a quote inside doubled; rows end in CRLF.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function nextButton(page) {
  return page.locator('.nav button').last();
}

export async function currentPage(page) {
  const text = await page.locator('.progress').textContent();
  const m = /Page (\d+) of (\d+)/.exec(text);
  return { page: Number(m[1]), of: Number(m[2]) };
}

// Walks every page from the first, answering each, collecting the items seen,
// and pressing Finish on the last (with a double click when `finish` is
// 'dblclick'). Returns the items in rendered order.
export async function walkAll(page, { finish = 'click' } = {}) {
  const seen = [];
  for (;;) {
    const { page: p, of } = await currentPage(page);
    seen.push(...(await readItems(page)));
    await answerPage(page);
    if (p === of) {
      if (finish === 'dblclick') await nextButton(page).dblclick();
      else await nextButton(page).click();
      break;
    }
    await nextButton(page).click();
    await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${of}`);
  }
  return seen;
}
