// Shared by every spec: where the page is served from, how a study link is
// built, and how a page of items is read and answered.
//
// The target is the deployed page when FORM_TARGET names it, and otherwise
// this checkout served on localhost. FORM_REQUIRE_TARGET makes a missing
// FORM_TARGET an error rather than a fallback, so the scheduled run can never
// quietly test the checkout instead.
//
// The instrument exports come from the copies in fixtures/exports/ when
// FORM_TARGET is empty, and from the package's site when it is set, except
// in link-sections.spec.js, which routes them to the copies always. Every
// spec takes `test` and `expect` from here rather than from
// '@playwright/test', so the `exportCopies` fixture below runs in each test.

import { test as baseTest, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
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

// The export the page gets, so a test's expectations come from the same
// file: the copy in fixtures/exports/ when FORM_TARGET is empty, as the
// `exportCopies` fixture answers the page from it, and the site's file
// when FORM_TARGET is set. With `text`, the file's text rather than its
// parsed JSON.
export async function fetchExport(instrument, { text = false } = {}) {
  if (process.env.FORM_TARGET?.trim()) {
    const res = await fetch(exportUrl(instrument));
    if (!res.ok) throw new Error(`fetching ${exportUrl(instrument)}: HTTP ${res.status}`);
    return text ? res.text() : res.json();
  }
  const body = await readFile(path.join(FIXTURES, 'exports', `${instrument}.json`), 'utf8');
  return text ? body : JSON.parse(body);
}

// The requests a test's routes answered. A route marks its request before
// its first await, so a request still held, or cancelled while its answer is
// read, counts as answered. Checks of the requests a test sent read this.
const answeredRequests = new WeakSet();
export function markAnswered(request) {
  answeredRequests.add(request);
}
export function isAnswered(request) {
  return answeredRequests.has(request);
}

// Answers an export request from its copy in fixtures/exports/, marked as
// answered. A request for an export with no copy there is unmarked and
// aborted, so a check of the test's requests names it.
export async function fulfillExport(route) {
  const request = route.request();
  markAnswered(request);
  const name = new URL(request.url()).pathname.split('/').pop();
  let body;
  try {
    body = await readFile(path.join(FIXTURES, 'exports', name), 'utf8');
  } catch {
    answeredRequests.delete(request);
    return route.abort();
  }
  return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body });
}

// Routes the page's request for an instrument's export to `handle`, the
// request marked as answered before `handle` runs. A test that serves its
// own export, or refuses one, routes it here, so `exportCopies` counts it
// as answered.
export function routeExport(page, instrument, handle) {
  return page.route(exportUrl(instrument), (route) => {
    markAnswered(route.request());
    return handle(route);
  });
}

// With FORM_TARGET empty, every page of the test's browser context gets the
// exports from the copies in fixtures/exports/, and the test fails on each
// export request that no route marked as answered. A page's own route for an
// export runs first, and route.fallback() passes the request on to the
// copies. With FORM_TARGET set, the fixture does nothing, and the exports
// come from the site unless the spec routes them.
export const test = baseTest.extend({
  exportCopies: [async ({ context }, use) => {
    if (process.env.FORM_TARGET?.trim()) {
      await use();
      return;
    }
    const asked = [];
    context.on('request', (req) => {
      if (req.url().startsWith(EXPORT_BASE)) asked.push(req);
    });
    await startExportCopies(context);
    await use();
    const unanswered = asked.filter((req) => !isAnswered(req)).map((req) => `${req.method()} ${req.url()}`);
    expect(unanswered, 'export requests that no route answered').toEqual([]);
  }, { auto: true }],
});
export { expect };

// Sets the copies route on the test's browser context, once, when
// FORM_TARGET is empty. The fixture calls it as the test starts, and
// openForm() before each load.
export async function startExportCopies(context) {
  if (process.env.FORM_TARGET?.trim()) return;
  await context.unroute(`${EXPORT_BASE}**`, fulfillExport);
  await context.route(`${EXPORT_BASE}**`, fulfillExport);
}

// Takes the copies route off the test's browser context. While a route is
// set on the context, the recording endpoint receives no CORS preflight: on
// 2026-10-02, with Playwright 1.56.1, the four Supabase sends of
// send.spec.js reached it with no OPTIONS before their POST. begin() calls
// this, since the online form shows its start screen only after every
// export of the link has loaded, and a walk fetches no export after it. An
// export request made later with no route is still recorded, and fails the
// test, so a test that loads a form again after begin() loads it through
// openForm() or calls startExportCopies() first.
export async function stopExportCopies(context) {
  await context.unroute(`${EXPORT_BASE}**`, fulfillExport);
}

export async function readFixture(name) {
  return readFile(path.join(FIXTURES, name), 'utf8');
}

export async function readDescriptor(name) {
  return JSON.parse(await readFixture(name));
}

// Two alterations of a descriptor's items that are not in ascending order:
// the list reversed, and the list with its last two entries swapped. Each
// takes the items and returns the altered list. The form page and the link
// builder refuse both with NOT_ASCENDING_MESSAGE.
export const NOT_ASCENDING = [
  { name: 'reversed', alter: (items) => [...items].reverse() },
  {
    name: 'with its last two swapped',
    alter: (items) => {
      const a = [...items];
      const n = a.length;
      [a[n - 2], a[n - 1]] = [a[n - 1], a[n - 2]];
      return a;
    },
  },
];
export const NOT_ASCENDING_MESSAGE = 'The module file could not be used: its items are not in ascending order.';

// module-plain.json with its items altered by one NOT_ASCENDING entry.
export async function notAscendingDescriptor(entry) {
  const plain = await readDescriptor('module-plain.json');
  return { ...plain, items: entry.alter(plain.items) };
}

export function encodeConfig(config) {
  return Buffer.from(JSON.stringify(config), 'utf8').toString('base64url');
}

// The `z` form of a link: the UTF-8 JSON compressed with deflate-raw, then
// base64url with no padding, written here with Node's zlib rather than the
// browser's CompressionStream that link.html uses.
export function encodeCompressed(config) {
  return encodeCompressedText(JSON.stringify(config));
}
// The same from JSON text written by the caller.
export function encodeCompressedText(text) {
  return deflateRawSync(Buffer.from(text, 'utf8')).toString('base64url');
}

// A study link's config back from its `c` or `z` parameter, in Node.
export function decodeLinkParam(href) {
  const params = new URL(href).searchParams;
  if (params.has('z')) return JSON.parse(inflateRawSync(Buffer.from(params.get('z'), 'base64url')).toString('utf8'));
  return JSON.parse(Buffer.from(params.get('c'), 'base64url').toString('utf8'));
}

// The retired terms, stated here as the naming decision lists them: six
// case-insensitive patterns, four more, and two fixed strings. The Study
// Link Builder's text and its refusals hold none of them.
export const RETIRED = [
  /\bdescriptor\b/i, /\bscoring file\b/i, /\bbundle\b/i, /\bendpoint\b/i, /\bstores?\b/i, /\bcompressed\b/i,
  /\b(hitop-form )?form page\b/i, /(?<!study )\blink builder\b/i, /\b[cz] parameter\b/i, /\$\{[^}]*\} parameter/i,
  '?c=', '?z=',
];

// The terms of RETIRED that `s` holds.
export function retiredIn(s) {
  return RETIRED.filter((term) => (typeof term === 'string' ? s.includes(term) : term.test(s)));
}

// The fingerprint a setup file's link carries, computed here with Node's
// crypto rather than the browser's crypto.subtle that form.js uses: the
// SHA-256 of the UTF-8 bytes of JSON.stringify of the parsed setup, as
// base64url without padding.
export function setupFingerprint(setup) {
  return textFingerprint(JSON.stringify(setup));
}
// The same from the JSON.stringify() text of a setup, written by the caller.
export function textFingerprint(text) {
  return createHash('sha256').update(text, 'utf8').digest('base64url');
}

// The address the setup-file tests name. Nothing is served there: the
// tests answer it through a route, inside the browser.
export const SETUP_URL = 'https://setup.example.org/study/setup.json';

// The page's limit on fetching a setup file, stated here rather than read
// from form.js.
export const SETUP_TIMEOUT_MS = 30 * 1000;

// Answers `url` through a route with `body` (a string or bytes) and
// `status`, letting other sites read it. It aborts the request when
// `abort` is true, as a fetch that gets no answer, and never answers it
// when `hang` is true, as a host that keeps the request open. Returns the
// requests that reached the route, each as its method and address, with
// its headers as a property that toEqual() does not compare.
export async function serveSetup(page, body, { url = SETUP_URL, status = 200, abort = false, hang = false } = {}) {
  const requests = [];
  await page.route(url, (route) => {
    const request = { method: route.request().method(), url: route.request().url() };
    Object.defineProperty(request, 'headers', { value: route.request().headers() });
    requests.push(request);
    if (hang) return undefined;
    if (abort) return route.abort('connectionrefused');
    return route.fulfill({
      status,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'text/plain; charset=utf-8' },
      body: typeof body === 'string' ? body : Buffer.from(body),
    });
  });
  return requests;
}

// The query of a setup-file link, written by URLSearchParams. A field given
// as null is left out.
export function setupQuery({ setup = SETUP_URL, sha256 } = {}) {
  const q = new URLSearchParams();
  if (setup !== null) q.set('setup', setup);
  if (sha256 !== null && sha256 !== undefined) q.set('sha256', sha256);
  return q.toString();
}

// An init script that sets window.armed when the Study Link Builder's
// prefill starts: at prefill()'s first call, `opened.has('setup')`, made on
// the URLSearchParams of the page's own address. Nothing asks that for
// `setup` before then. A plant that throws only while window.armed is set
// throws at no earlier call.
export function armOnAddress() {
  const Real = URLSearchParams;
  window.URLSearchParams = class extends Real {
    constructor(init) {
      super(init);
      if (init !== window.location.search) return;
      const has = this.has.bind(this);
      this.has = (name) => {
        if (name === 'setup') window.armed = true;
        return has(name);
      };
    }
  };
}

// While the Study Link Builder's form is held during a prefill wait: types
// into the study box and presses "Add an instrument". An inert target makes
// Playwright wait, so both clicks are forced and the text goes in by
// keyboard. Then asserts that the box is still empty, that one instrument
// row is listed, and that the form is marked busy.
export async function expectHeldInput(page) {
  const study = page.locator('input[name="study"]');
  await study.click({ force: true });
  await page.keyboard.type('typed during the wait');
  await page.getByRole('button', { name: 'Add an instrument' }).click({ force: true });
  await expect(study).toHaveValue('');
  await expect(page.locator('#instrumentList .instrument-row')).toHaveCount(1);
  await expect(page.locator('#f')).toHaveAttribute('aria-busy', 'true');
}

// After the hold ends: the study box holds `value` from the opened link, the
// form is no longer busy, and the box takes typed text.
export async function expectReleasedInput(page, value) {
  const study = page.locator('input[name="study"]');
  await expect(study).toHaveValue(value);
  await expect(page.locator('#f')).not.toHaveAttribute('aria-busy');
  await study.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' typed after');
  await expect(study).toHaveValue(`${value} typed after`);
}

// A setup whose module is an object holding an array nested 20,000 deep,
// 40,000 bytes as JSON. Chromium writes it with plain JSON.stringify(), as
// the fingerprint does, and throws RangeError for the indented write the
// module box takes. On 2026-10-01, Chromium 141 in this suite threw on that
// write from a depth of about 6,150. The Study Link Builder refuses such a
// link with DEEP_MODULE_REFUSAL. expectIndentThrows() checks the browser
// still throws there, so a pass is not a module that fit. The JSON text
// is written here directly, as JSON.stringify() writes it, because on
// 2026-10-01 the CI's Node 20 threw RangeError stringifying this setup.
export const DEEP_MODULE_DEPTH = 20_000;
export function deepModuleText() {
  const deep = '['.repeat(DEEP_MODULE_DEPTH) + ']'.repeat(DEEP_MODULE_DEPTH);
  return `{"instrument":"hitopsr","study":"deep","module":{"deep":${deep}}}`;
}
export async function expectIndentThrows(page) {
  const thrown = await page.evaluate((n) => {
    let deep = [];
    for (let k = 1; k < n; k++) deep = [deep];
    try {
      JSON.stringify({ deep }, null, 2);
      return 'nothing';
    } catch (e) {
      return e.constructor.name;
    }
  }, DEEP_MODULE_DEPTH);
  expect(thrown, 'the indented write of the deep module').toBe('RangeError');
}
export const DEEP_MODULE_REFUSAL = 'The study link you opened holds a module nested too deeply for this browser to show. Fill in the form above to make a new link.';

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

// Opens the Study Link Builder's optional section that holds a control, by
// a click on the section's summary, as a researcher opens it. `control` is a
// field's name, such as 'participant', or a CSS selector, such as
// '#questionsFile'. A section already open takes no click. A control in
// none of the sections is an error, so a call that names a wrong control
// fails here rather than at the fill after it.
//
// After an opened c, z or setup-file link fills the form, a call passes
// `wasOpen`: the open state the fill leaves the section in. The call fails
// when the section is not in that state within the expect timeout, so a fill
// that leaves the section closed fails the test, and a call that expects the
// section open never clicks its summary. A closed section passes
// `wasOpen: false` at once, even when a fill still running would open it, so
// the caller waits for the fill to finish before such a call.
export async function openSectionOf(page, control, { wasOpen } = {}) {
  const selector = /^\w+$/.test(control) ? `[name="${control}"]` : control;
  const section = page.locator(`details.optional:has(${selector})`);
  await expect(section, `the section holding ${selector}`).toHaveCount(1);
  if (wasOpen !== undefined) {
    await expect(section, `the section holding ${selector}, ${wasOpen ? 'open' : 'closed'} before the call`).toHaveJSProperty('open', wasOpen);
  }
  if (!(await section.evaluate((d) => d.open))) await section.locator('> summary').click();
  await expect(section).toHaveJSProperty('open', true);
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
// Prolific parameters a study URL carries, as `&PROLIFIC_PID=…`. `param`
// 'z' writes the link compressed.
export function formUrl(base, config, extra = '', param = 'c') {
  const value = param === 'z' ? encodeCompressed(config) : encodeConfig(config);
  return `${base}?${param}=${value}${extra}`;
}

// Opens `href`, an address too long for any host: the deployed page's host
// answers 414 past 8,192 characters of path and query, and the local server
// refuses a request line past Node's 16 KiB. The browser asks for `href`, and
// the answer is the page fetched at the same address with no query, so the
// page still reads the long query from its own location.
export async function gotoLong(page, href) {
  const long = new URL(href);
  const short = new URL(href);
  short.search = '';
  await page.route((url) => url.href === long.href, async (route) => {
    await route.fulfill({ response: await route.fetch({ url: short.href }) });
  });
  await page.goto(href);
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
// request listener. `extra` and `param` are formUrl()'s.
export async function openForm(page, base, config, { exportBody, exportJson, extra, param } = {}) {
  await startExportCopies(page.context());
  if (exportBody !== undefined || exportJson !== undefined) {
    await routeExport(page, config.instrument, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: exportBody !== undefined ? exportBody : JSON.stringify(exportJson),
      }),
    );
  }
  await page.goto(formUrl(base, config, extra, param));
}

// The words of every link to a completion address, which name no host.
export const CONTINUE = 'Continue to the next step of the study';

// The refusal's own text on an error screen, which sits in the screen's
// closed "Details for the study team" section.
export function refusalText(page) {
  return page.locator('details.study-team .fault');
}

// Presses Begin on the start screen, entering a participant identifier first
// when the screen asks for one. Once Begin shows, the exports are loaded, so
// the copies route comes off (stopExportCopies()).
export async function begin(page, participant) {
  const press = page.getByRole('button', { name: 'Begin' });
  await expect(press).toBeVisible();
  await stopExportCopies(page.context());
  const input = page.locator('input[name="participant"]');
  if (participant !== undefined) await input.fill(participant);
  await press.click();
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

// The pattern for the instrument at place `k` (from 0) of a list link:
// chosenIndex() moved on by `k` options, so no two instruments of a walk
// are answered alike. Place 0 is chosenIndex() itself.
export function chosenIndexFor(k) {
  return (position, optionCount) => (chosenIndex(position, optionCount) + k) % optionCount;
}

// Answers every item on the current page, except those whose position on the
// page (1-based) is in `skip`, choosing each option by `choose`.
export async function answerPage(page, { skip = [], choose = chosenIndex } = {}) {
  const items = page.locator('fieldset.item');
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    if (skip.includes(i + 1)) continue;
    const item = items.nth(i);
    const position = Number(await item.getAttribute('data-position'));
    const radios = item.locator('input[type=radio]');
    await radios.nth(choose(position, await radios.count())).check();
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

// The sentence the status region under the button holds after a press.
export const SAVED_AGAIN = 'The file was saved again.';

// The status region under the "Save the file" button before any press: one
// `p.saved-again` with `role="status"` and no text, so the live region
// exists before the first press.
export async function expectStatusEmpty(page) {
  const status = page.locator('p.saved-again');
  await expect(status).toHaveCount(1);
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveText('');
}

// The "Save the file" button on a saved-file screen: one button, and a
// first and a second press each save the file again with the Finish
// download's suggested file name and its bytes. The first press is made from
// the keyboard (the button focused, then Enter) and leaves focus on the
// button; each press writes SAVED_AGAIN into the status region, the second
// as a fresh write, seen by a mutation observer installed before it. The
// download promise is created before each press with a short timeout of its
// own, so a press that saves nothing fails on that wait, named, rather than
// on the test's limit.
export async function expectSaveAgain(page, download) {
  const button = page.getByRole('button', { name: 'Save the file' });
  await expect(button).toHaveCount(1);
  const status = page.locator('p.saved-again');
  const bytes = await readFile(await download.path(), 'utf8');
  for (const press of ['first', 'second']) {
    const again = page.waitForEvent('download', { timeout: 15 * 1000 });
    if (press === 'first') {
      await button.focus();
      await page.keyboard.press('Enter');
    } else {
      await page.evaluate(() => {
        window.__savedAgainWrites = 0;
        new MutationObserver((records) => { window.__savedAgainWrites += records.length; })
          .observe(document.querySelector('p.saved-again'), { childList: true, characterData: true, subtree: true });
      });
      await button.click();
    }
    const d = await again;
    expect(d.suggestedFilename(), `the ${press} press's file name`).toBe(download.suggestedFilename());
    expect(await readFile(await d.path(), 'utf8'), `the ${press} press's bytes`).toBe(bytes);
    if (press === 'first') {
      const focused = await page.evaluate(() => [document.activeElement?.tagName, document.activeElement?.textContent]);
      expect(focused, 'focus after the keyboard press').toEqual(['BUTTON', 'Save the file']);
    }
    await expect(status, `the status after the ${press} press`).toHaveText(SAVED_AGAIN);
    if (press === 'second') {
      expect(await page.evaluate(() => window.__savedAgainWrites), 'the second press rewrote the region').toBeGreaterThan(0);
    }
  }
}

// The saved-file screen's children in document order, each as its tag and
// class, the file name's paragraph marked by its code child so a swap with
// the trail paragraph is seen: the heading, the lead paragraph, the file
// name's paragraph, the trail paragraph, the button, the status region, the
// completion link's paragraph when the link carries an address, then the
// closed study-team section that holds the version line.
export function savedScreenOrder({ complete = false } = {}) {
  return ['H1', 'P.done', 'P>CODE.filename', 'P', 'BUTTON', 'P.saved-again', ...(complete ? ['P.complete'] : []), 'DETAILS.study-team'];
}

export function screenOrder(page) {
  return page.$$eval('main > *', (nodes) => nodes.map((n) =>
    n.tagName + (n.className ? `.${n.className}` : '') + (n.querySelector('code.filename') ? '>CODE.filename' : '')));
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

// The document's states from now until the page starts to leave, in the
// order they arose. `snapshot` is a function run in the page, taking no
// arguments and closing over nothing. A mutation observer reports its result
// at each change. The Navigation API's `navigate` event reports it once more
// when a script starts a navigation, before the navigation's request, and
// nothing is recorded after that. Both reports go through one exposed
// function, so they arrive in the order the page made them, and
// `states.left` turns true with the last. `states.at(-1)` is then the
// document as the navigation starts. A change after that, such as a redraw
// while a route holds the navigation's request, is not recorded.
export async function observeUntilLeave(page, snapshot) {
  const states = [];
  states.left = false;
  await page.exposeFunction('noteUntilLeave', (state, leaving) => {
    if (states.left) return;
    states.push(state);
    if (leaving) states.left = true;
  });
  await page.evaluate(`(() => {
    const snapshot = ${snapshot.toString()};
    let left = false;
    new MutationObserver(() => { if (!left) window.noteUntilLeave(snapshot(), false); })
      .observe(document.body, { childList: true, subtree: true });
    navigation.addEventListener('navigate', () => {
      if (left) return;
      left = true;
      window.noteUntilLeave(snapshot(), true);
    });
  })()`);
  return states;
}

// Walks every page from the first, answering each, collecting the items seen,
// and pressing Finish on the last (with a double click when `finish` is
// 'dblclick'). With `finish` 'held', the press does not wait for the
// navigation it starts, which a route holds. Returns the items in rendered order. Under a list link it
// walks the pages of the instrument on screen, and its last press leads to
// the next start screen, or after the last instrument to the after screen
// or Finish. `choose` is answerPage()'s.
export async function walkAll(page, { finish = 'click', choose } = {}) {
  const seen = [];
  for (;;) {
    const { page: p, of } = await currentPage(page);
    seen.push(...(await readItems(page)));
    await answerPage(page, { choose });
    if (p === of) {
      if (finish === 'dblclick') await nextButton(page).dblclick();
      else if (finish === 'held') await nextButton(page).click({ noWaitAfter: true });
      else await nextButton(page).click();
      break;
    }
    await nextButton(page).click();
    await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${of}`);
  }
  return seen;
}
