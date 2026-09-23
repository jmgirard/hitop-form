// The send: with a store in the link, Finish posts one JSON row to it.
//
//   T1: one POST reaches the store's address when Finish is pressed, and
//       none before; the body is one JSON object whose keys are study,
//       participant, instrument, form_build, submitted, then one per item
//       in the order shown; its values equal the CSV fixture of the same
//       walk in every field but submitted and form_build; item values are
//       JSON integers
//   T2: the request is a CORS simple request: method POST, Content-Type
//       text/plain;charset=utf-8, no header of the page's own outside the
//       safelisted set, and the endpoint recorded no OPTIONS
//   T3: a store whose address answers 302 to a third origin is followed,
//       and the body is recorded at the first address
//   T4: Finish pressed twice in one gesture (a double click) sends one POST
//   T5: a 200 with {"ok":true} is confirmed: no file is saved, and the final
//       screen says the responses were sent to the study team
//   T6: a 200 with an HTML body, a 404, a 500, a refused connection and an
//       endpoint that never answers (the page's 30-second limit) are each
//       unconfirmed: the CSV is saved to the device, the final screen says
//       the send could not be confirmed and names the saved file, and that
//       final screen does not say that no answer was sent
//   T7: every nav button is disabled from Finish's first press until the
//       outcome screen
//   T8: the committed Google Sheet download (tests/fixtures/sheet-hitopbr.csv,
//       from the hand run the fixture README describes) has the HiTOP-BR
//       fixture's header, and two rows whose participant codes are the text
//       =1+1 and 007 and whose item columns equal the fixture's
//   T9: a supabase store: four HiTOP-BR walks (a JWT-shaped key, a
//       publishable key, a project URL ending in a slash, one ending in
//       /rest/v1/) each post one insert to <url>/rest/v1/<table> with
//       apikey, Content-Type application/json and Prefer return=minimal,
//       Authorization: Bearer only for the JWT shape, the fixture body,
//       after one answered OPTIONS preflight; a 201 with no body is
//       confirmed
//  T10: a supabase store answering 401, one refusing the connection and one
//       answering 302 are each unconfirmed: the file is saved and the
//       screen says so; through the twin, no request follows the 302
//  T11: the committed Supabase export (tests/fixtures/supabase-hitopbr.csv)
//       has the HiTOP-BR fixture's header and two rows, p001 and p002, whose
//       item columns equal the fixture's
//
// Walked for the HiTOP-BR and the shuffled HiTOP-SR module fixture through
// /record and through /redirect (T1 to T3), the HiTOP-BR for the rest. The
// endpoint is tests/serve.mjs serveStore(), started by every run, whatever
// the target.

import { test, expect } from '@playwright/test';
import {
  useTarget, useStore, allowLocalStore, webhook, supabase, JWT_SHAPED_KEY, openForm, begin, walkAll,
  fetchExport, readDescriptor, readFixture, parseCsv, awaitDownload, nextButton, SEND_TIMEOUT_MS,
} from './helpers.mjs';
import { readFile } from 'node:fs/promises';
import { unusedPort } from './serve.mjs';

const base = useTarget();
const store = useStore();
const LEAD = ['study', 'participant', 'instrument', 'form_build', 'submitted'];

test.beforeEach(async ({ context }) => allowLocalStore(context));

// Header names the browser sets on its own, which the page cannot add or
// remove; every other recorded name must be CORS-safelisted.
const BROWSER_SET = /^(host|connection|content-length|origin|referer|user-agent|accept-encoding|sec-|priority|pragma|cache-control|dnt|te|upgrade-insecure-requests)/;
const SAFELISTED = new Set(['accept', 'accept-language', 'content-language', 'content-type']);

// The endpoint's log runs across the file's tests; each test reads only the
// requests recorded after its own start.
function since(from) {
  return store().requests.slice(from);
}

async function walkWithStore(page, { instrument, module, storePath, study = 'fixture', participant = 'p001', finish }) {
  const config = { instrument, study, participant, ...(module ? { module } : {}), store: webhook(store(), storePath) };
  await openForm(page, base(), config);
  await begin(page);
  return walkAll(page, { finish });
}

const WALKS = [
  { name: 'hitopbr', instrument: 'hitopbr', fixture: 'responses-hitopbr.csv' },
  { name: 'shuffled module', module: 'module-shuffled.json', fixture: 'responses-module-shuffled.csv' },
];

for (const w of WALKS) {
  for (const storePath of ['/record', '/redirect']) {
    test(`${w.name} through ${storePath}: one simple POST whose body equals the fixture`, async ({ page }) => {
      const module = w.module ? await readDescriptor(w.module) : undefined;
      const instrument = module ? module.instrument : w.instrument;
      const exp = await fetchExport(instrument);
      const fixture = parseCsv(await readFixture(w.fixture));
      const downloads = [];
      page.on('download', (d) => downloads.push(d));

      const from = store().requests.length;
      // T4 on one walk: the double click.
      const finish = w.name === 'hitopbr' && storePath === '/record' ? 'dblclick' : 'click';
      const t0 = Date.now();
      const seen = await walkWithStore(page, { instrument, module, storePath, finish });
      await expect(page.locator('h1')).toHaveText('Thank you');
      const t1 = Date.now();
      // T5
      await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
      expect(downloads, 'no file is saved on a confirmed send').toEqual([]);

      // T1: exactly one POST, to the address the link named.
      const recorded = since(from);
      const sent = recorded.filter((r) => r.server === 'store' && r.method === 'POST');
      expect(sent.length, 'one POST').toBe(1);
      expect(sent[0].path).toBe(storePath);
      // T3: through /redirect the endpoint's twin saw the follow-up as a GET.
      const twin = recorded.filter((r) => r.server === 'target');
      if (storePath === '/redirect') {
        expect(twin.map((r) => [r.method, r.path])).toEqual([['GET', '/record']]);
      } else {
        expect(twin).toEqual([]);
      }

      // T2: a simple request, and no preflight.
      const { headers } = sent[0];
      expect(headers['content-type']).toBe('text/plain;charset=utf-8');
      const own = Object.keys(headers).filter((h) => !BROWSER_SET.test(h));
      for (const h of own) expect(SAFELISTED.has(h), `header ${h} is CORS-safelisted`).toBe(true);
      expect(recorded.filter((r) => r.method === 'OPTIONS'), 'no OPTIONS').toEqual([]);

      // T1: the body.
      expectBody(JSON.parse(sent[0].body), { fixture, exp, seen, t0, t1 });
    });
  }
}

// The posted body against the CSV fixture of the same walk: the keys are the
// fixture's header (the five lead fields, then the items in the order seen),
// submitted is a UTC timestamp inside the walk, form_build is the export's
// build date, and every item value is the fixture's as a JSON integer.
function expectBody(row, { fixture, exp, seen, t0, t1 }) {
  expect(Object.keys(row)).toEqual([...LEAD, ...seen.map((s) => exp.items.find((it) => it.number === s.number).name)]);
  expect(Object.keys(row), 'the fixture header').toEqual(fixture[0]);
  const values = fixture[1];
  for (let i = 0; i < fixture[0].length; i++) {
    const key = fixture[0][i];
    if (key === 'submitted') {
      expect(row.submitted).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
      const t = Date.parse(row.submitted);
      expect(t).toBeGreaterThanOrEqual(Math.floor(t0 / 1000) * 1000);
      expect(t).toBeLessThanOrEqual(t1);
    } else if (key === 'form_build') {
      expect(row.form_build).toBe(exp.buildDate);
    } else if (i < LEAD.length) {
      expect(row[key], key).toBe(values[i]);
    } else {
      expect(Number.isInteger(row[key]), `${key} is a JSON integer`).toBe(true);
      expect(row[key], key).toBe(Number(values[i]));
    }
  }
}

// T9: the supabase kind. Four HiTOP-BR walks: a legacy key of JWT shape, a
// publishable key, a publishable key with the project URL ending in a
// slash, and one with the URL ending in /rest/v1/ (the suffix dropped).
// Each posts once to <url>/rest/v1/<table> (the slash not doubled) with
// apikey, Content-Type and Prefer as literals, Authorization only for the
// JWT shape, the fixture body, and one OPTIONS preflight the endpoint
// answered.
const SUPABASE_WALKS = [
  { name: 'a JWT-shaped key', key: JWT_SHAPED_KEY, p: '', bearer: true },
  { name: 'a publishable key', key: 'sb_publishable_abc123', p: '', bearer: false },
  { name: 'a project URL ending in a slash', key: 'sb_publishable_abc123', p: '/', bearer: false },
  { name: 'a project URL ending in /rest/v1/', key: 'sb_publishable_abc123', p: '/rest/v1/', bearer: false },
];

for (const w of SUPABASE_WALKS) {
  test(`supabase with ${w.name}: one insert with the literal headers and the fixture body, after one preflight`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const fixture = parseCsv(await readFixture('responses-hitopbr.csv'));
    const downloads = [];
    page.on('download', (d) => downloads.push(d));
    const s = supabase(store(), { key: w.key, table: 'hitopbr_responses', p: w.p });

    const from = store().requests.length;
    const t0 = Date.now();
    await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture', participant: 'p001', store: s });
    await begin(page);
    const seen = await walkAll(page);
    await expect(page.locator('h1')).toHaveText('Thank you');
    const t1 = Date.now();
    await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
    expect(downloads, 'no file is saved on a confirmed send').toEqual([]);

    const recorded = since(from);
    const sent = recorded.filter((r) => r.method === 'POST');
    expect(sent.length, 'one POST').toBe(1);
    expect(sent[0].server).toBe('store');
    expect(sent[0].path).toBe('/rest/v1/hitopbr_responses');

    const { headers } = sent[0];
    // The page's own headers are exactly these, no others.
    const own = Object.keys(headers).filter((h) => !BROWSER_SET.test(h) && !SAFELISTED.has(h) || h === 'content-type').sort();
    expect(own).toEqual(['apikey', ...(w.bearer ? ['authorization'] : []), 'content-type', 'prefer']);
    expect(headers.apikey).toBe(w.key);
    expect(headers['content-type']).toBe('application/json');
    expect(headers.prefer).toBe('return=minimal');
    if (w.bearer) expect(headers.authorization).toBe(`Bearer ${w.key}`);
    else expect(headers.authorization, 'no Authorization header with a key that is not a JWT').toBeUndefined();

    const preflights = recorded.filter((r) => r.method === 'OPTIONS');
    expect(preflights.map((r) => r.path), 'one preflight, to the insert address').toEqual(['/rest/v1/hitopbr_responses']);
    // The preflight was answered: the POST that followed it is the proof,
    // and its request line asked for the page's own headers.
    expect(preflights[0].headers['access-control-request-method']).toBe('POST');
    expect(preflights[0].headers['access-control-request-headers']).toContain('apikey');

    expectBody(JSON.parse(sent[0].body), { fixture, exp, seen, t0, t1 });
  });
}

// T6: each unconfirmed outcome saves the file and says so.
const UNCONFIRMED = [
  { name: 'a 200 with an HTML body', path: () => '/html', why: 'did not answer with JSON' },
  { name: 'a 404', path: () => '/status/404', why: 'answered HTTP 404' },
  { name: 'a 500', path: () => '/status/500', why: 'answered HTTP 500' },
  { name: 'a refused connection', url: async () => `http://127.0.0.1:${await unusedPort()}/record`, why: 'the connection failed' },
  { name: 'an endpoint that never answers', path: () => '/hang/record', why: 'no answer within 30 seconds', hang: true },
];

for (const u of UNCONFIRMED) {
  test(`${u.name} is unconfirmed: the file is saved and the screen says so`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const storeUrl = u.url ? await u.url() : store().url(u.path());
    await openForm(page, base(), {
      instrument: 'hitopbr', study: 'send', participant: 'u1', store: { kind: 'webhook', url: storeUrl },
    });
    await begin(page);
    const downloading = awaitDownload(page);
    const t0 = Date.now();
    const seen = await walkAll(page);
    if (u.hang) {
      // T7: every nav button, Back included, is disabled while the send is
      // pending, and Finish reads Sending….
      const finish = nextButton(page);
      await expect(finish).toBeDisabled();
      await expect(finish).toHaveText('Sending…');
      const buttons = page.locator('.nav button');
      expect(await buttons.count()).toBeGreaterThan(1);
      for (const b of await buttons.all()) await expect(b).toBeDisabled();
    }
    const download = await downloading;
    if (u.hang) expect(Date.now() - t0, 'the outcome waited for the limit').toBeGreaterThanOrEqual(SEND_TIMEOUT_MS);

    await expect(page.locator('h1')).toHaveText('Thank you');
    const done = page.locator('.done');
    await expect(done).toContainText('The send to the study team could not be confirmed');
    await expect(done).toContainText(u.why);
    await expect(page.locator('code.filename')).toHaveText(download.suggestedFilename());
    const text = await page.locator('main').textContent();
    expect(text).not.toContain('No answer');
    expect(text).not.toContain('sent from this page');

    const rows = parseCsv(await readFile(await download.path(), 'utf8'));
    expect(rows[0]).toEqual([...LEAD, ...seen.map((s) => exp.items.find((it) => it.number === s.number).name)]);
    expect(rows[1].slice(0, 4)).toEqual(['send', 'u1', exp.stem, exp.buildDate]);
  });
}

// T10: a supabase store that answers 401 (a wrong key, or a table the key
// cannot insert into), one whose connection is refused, and one that
// answers 302 (not followed: the POST would become a GET) are each
// unconfirmed: the file is saved and the screen says so.
const SUPABASE_UNCONFIRMED = [
  { name: 'a 401', make: () => supabase(store(), { table: 'status_401' }), why: 'answered HTTP 401' },
  { name: 'a 302', make: () => supabase(store(), { table: 'redirect_302' }), why: 'the endpoint redirected the send' },
  {
    name: 'a refused connection',
    make: async () => ({ kind: 'supabase', url: `http://127.0.0.1:${await unusedPort()}`, key: 'sb_publishable_x', table: 'responses' }),
    why: 'the connection failed',
  },
];

for (const u of SUPABASE_UNCONFIRMED) {
  test(`a supabase store with ${u.name} is unconfirmed: the file is saved and the screen says so`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const from = store().requests.length;
    await openForm(page, base(), { instrument: 'hitopbr', study: 'send', participant: 'u2', store: await u.make() });
    await begin(page);
    const downloading = awaitDownload(page);
    const seen = await walkAll(page);
    const download = await downloading;

    await expect(page.locator('h1')).toHaveText('Thank you');
    const done = page.locator('.done');
    await expect(done).toContainText('The send to the study team could not be confirmed');
    await expect(done).toContainText(u.why);
    await expect(page.locator('code.filename')).toHaveText(download.suggestedFilename());
    if (u.name === 'a 401') {
      // The 401 was the endpoint's answer to the insert, not to the preflight.
      expect(since(from).map((r) => [r.method, r.path])).toEqual([
        ['OPTIONS', '/rest/v1/status_401'], ['POST', '/rest/v1/status_401'],
      ]);
    }
    if (u.name === 'a 302') {
      // Not followed: the twin the 302 pointed at saw no request.
      expect(since(from).filter((r) => r.server === 'target')).toEqual([]);
    }

    const rows = parseCsv(await readFile(await download.path(), 'utf8'));
    expect(rows[0]).toEqual([...LEAD, ...seen.map((s) => exp.items.find((it) => it.number === s.number).name)]);
    expect(rows[1].slice(0, 4)).toEqual(['send', 'u2', exp.stem, exp.buildDate]);
  });
}

// T11: the committed Supabase export (tests/fixtures/supabase-hitopbr.csv,
// from the hand run the fixture README describes) has the HiTOP-BR
// fixture's header and two rows, p001 and p002, whose item columns equal
// the fixture's.
test('the committed Supabase export has the fixture header and both walks', async () => {
  const exported = parseCsv(await readFixture('supabase-hitopbr.csv'));
  const fixture = parseCsv(await readFixture('responses-hitopbr.csv'));
  expect(exported[0]).toEqual(fixture[0]);
  expect(exported).toHaveLength(3);
  expect(exported.slice(1).map((r) => r[1])).toEqual(['p001', 'p002']);
  for (const r of exported.slice(1)) {
    // The export's build date at the hand run, a literal: the other fixture
    // is regenerated with each new export and would move this.
    expect(r.slice(0, 4)).toEqual(['fixture', r[1], 'hitopbr', '2026-09-20']);
    expect(r[4]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(r.slice(5)).toEqual(fixture[1].slice(5));
  }
});

// T8: the sheet download keeps what the page posted. The Apps Script code
// in the README writes every cell as text, so a participant code such as
// =1+1 or 007 comes back unchanged.
test('the committed sheet download has the fixture header and both participant codes as text', async () => {
  const sheet = parseCsv(await readFixture('sheet-hitopbr.csv'));
  const fixture = parseCsv(await readFixture('responses-hitopbr.csv'));
  expect(sheet[0]).toEqual(fixture[0]);
  expect(sheet).toHaveLength(3);
  expect(sheet[1][0]).toBe('fixture');
  expect(sheet[1][1]).toBe('=1+1');
  expect(sheet[2][1]).toBe('007');
  expect(sheet[2][0]).toBe('fixture');
  for (const r of sheet.slice(1)) {
    expect(r[2]).toBe('hitopbr');
    expect(r[4]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(r.slice(5)).toEqual(fixture[1].slice(5));
  }
});
