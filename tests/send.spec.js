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
//  T12: a HiTOP-BR walk under shuffle: true posts one row, to a webhook and
//       to a supabase store, whose keys are the five study fields,
//       item_order, then the items in the export's order, item_order
//       holding the shown order and each item the answer chosen at the
//       position it was shown at
//  T13: a HiTOP-BR walk under prolific: true, with the three parameters in
//       the address, posts one row to a webhook and to a supabase store
//       whose keys are the five study fields, prolific_study,
//       prolific_session, then the items, the participant the PROLIFIC_PID
//       and the two holding STUDY_ID and SESSION_ID: without shuffle the
//       body equals responses-hitopbr-prolific.csv as T1 compares, and the
//       supabase keys equal supabase-hitopbr-prolific.sql's columns; with
//       shuffle the two follow item_order, the T12 checks apply, and the
//       supabase keys equal supabase-hitopbr-prolific-shuffle.sql's columns
//  T14: without a prolific field, the three parameters in the address change
//       nothing: the row posted to a webhook equals the T1 body without
//       shuffle and has the T12 shape under it
//  T15: with a complete address in the link, a confirmed send draws the
//       sent screen before it issues the one navigation request to it: while
//       the request is held open, the heading is "Thank you", the paragraph
//       says the responses were sent, a "Continue to <host>." paragraph
//       links to the address, and no nav button is in the document; the row
//       still reaches the store, and no file is saved
//  T16: with a complete address, an unconfirmed send shows the saved screen
//       with a link to the address after the file name, labelled by its
//       host, and no request reaches the address within five seconds
//  T17: with complete and completeSaved, a confirmed send's one navigation
//       request goes to complete and none reaches completeSaved
//  T18: with complete and completeSaved, an unconfirmed send's saved screen
//       links to completeSaved after the file name, and no request reaches
//       either address within five seconds
//  T19: on each T6 outcome's unconfirmed screen, the trail paragraph ends
//       with "If the file did not appear, press Save the file.", one "Save
//       the file" button follows it, and a first and a second click on it
//       each save the file again with the Finish download's suggested file
//       name and its bytes; without a complete address the screen's order is
//       the heading, the lead, the file name, the trail, the button, the
//       version line, and with one (the T16 walk) the screen's order is
//       the heading, the lead, the file name, the trail, the button, the
//       completion link, the version line
//  T20: the sent screen has no "Save the file" button: asserted in T5's
//       walks and the supabase walks after the screen shows, and in T15's
//       document at the held request
//
// Walked for the HiTOP-BR and the shuffled HiTOP-SR module fixture through
// /record and through /redirect (T1 to T3), the HiTOP-BR for the rest. The
// endpoint is tests/serve.mjs serveStore(), started by every run, whatever
// the target.

import { test, expect } from '@playwright/test';
import {
  useTarget, useStore, allowLocalStore, webhook, supabase, JWT_SHAPED_KEY, openForm, begin, walkAll,
  fetchExport, readDescriptor, readFixture, parseCsv, awaitDownload, nextButton, SEND_TIMEOUT_MS, expectShuffled,
  leadColumns, PROLIFIC, prolificQuery, COMPLETE_URL, COMPLETE_SAVED_URL, serveComplete,
  SAVE_AGAIN, expectSaveAgain, savedScreenOrder, screenOrder,
} from './helpers.mjs';
import { readFile } from 'node:fs/promises';
import { unusedPort } from './serve.mjs';

const base = useTarget();
const store = useStore();
const LEAD = leadColumns();

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
      // Without a complete field the sent screen keeps its closing line and offers no link.
      await expect(page.locator('main')).toContainText('You can close this page.');
      await expect(page.locator('p.complete')).toHaveCount(0);
      // T20
      await expect(page.getByRole('button', { name: 'Save the file' })).toHaveCount(0);
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
// fixture's header (the lead fields, then the items in the order seen),
// submitted is a UTC timestamp inside the walk, form_build is the export's
// build date, and every item value is the fixture's as a JSON integer.
// `lead` is the lead fields the walk writes; LEAD's five by default.
function expectBody(row, { fixture, exp, seen, t0, t1, lead = LEAD }) {
  expect(Object.keys(row)).toEqual([...lead, ...seen.map((s) => exp.items.find((it) => it.number === s.number).name)]);
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
    } else if (i < lead.length) {
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
    // T20
    await expect(page.getByRole('button', { name: 'Save the file' })).toHaveCount(0);
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

// T12: the shuffled HiTOP-BR walk through each store kind. The row's keys
// and values are read as a header and a row of strings, so the file's
// check applies; the item values are also JSON integers.
for (const w of [
  { name: 'a webhook', make: () => webhook(store(), '/record'), path: '/record' },
  { name: 'a supabase store', make: () => supabase(store(), { table: 'hitopbr_shuffled' }), path: '/rest/v1/hitopbr_shuffled' },
]) {
  test(`a shuffled HiTOP-BR walk posts one row to ${w.name} in the export's order with item_order`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const numbers = exp.items.map((it) => it.number);
    const from = store().requests.length;
    await openForm(page, base(), { instrument: 'hitopbr', study: 'send', participant: 's12', shuffle: true, store: w.make() });
    await begin(page);
    const seen = await walkAll(page);
    await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');

    const sent = since(from).filter((r) => r.method === 'POST');
    expect(sent.map((r) => r.path)).toEqual([w.path]);
    const row = JSON.parse(sent[0].body);
    const shown = seen.map((s) => s.number);
    expect(shown, 'the walk saw a rearrangement').not.toEqual(numbers);
    expectShuffled(Object.keys(row), Object.values(row).map(String), { exp, numbers, shown });
    expect([row.study, row.participant, row.instrument, row.form_build]).toEqual(['send', 's12', exp.stem, exp.buildDate]);
    for (const it of exp.items) expect(Number.isInteger(row[it.name]), `${it.name} is a JSON integer`).toBe(true);
    if (w.name === 'a supabase store') {
      // The posted keys are the columns of the SQL the builder shows for a
      // HiTOP-BR table under shuffle, in its order: the fixture's column
      // lines, each `  "name" type,`.
      const columns = (await readFixture('supabase-hitopbr-shuffle.sql'))
        .split('\n')
        .filter((l) => /^ {2}"/.test(l))
        .map((l) => /^ {2}"([^"]+)"/.exec(l)[1]);
      expect(columns.length, 'the fixture has column lines').toBe(51);
      expect(Object.keys(row)).toEqual(columns);
    }
  });
}

// T13: the HiTOP-BR walk under prolific through each store kind, with and
// without shuffle. Without shuffle the body is compared to the by-rule
// prolific fixture as T1 compares; with shuffle the T12 checks apply with
// the two Prolific cells after item_order. The supabase keys equal the
// matching SQL fixture's column lines, so the row the page posts fits the
// table the builder makes.
const sqlColumns = async (fixture) => (await readFixture(fixture))
  .split('\n')
  .filter((l) => /^ {2}"/.test(l))
  .map((l) => /^ {2}"([^"]+)"/.exec(l)[1]);

for (const shuffle of [false, true]) {
  for (const w of [
    { name: 'a webhook', make: () => webhook(store(), '/record'), path: '/record' },
    { name: 'a supabase store', make: () => supabase(store(), { table: 'hitopbr_prolific' }), path: '/rest/v1/hitopbr_prolific', sql: shuffle ? 'supabase-hitopbr-prolific-shuffle.sql' : 'supabase-hitopbr-prolific.sql' },
  ]) {
    test(`a HiTOP-BR walk under prolific${shuffle ? ' and shuffle' : ''} posts one row to ${w.name} with the two Prolific keys`, async ({ page }) => {
      const exp = await fetchExport('hitopbr');
      const numbers = exp.items.map((it) => it.number);
      const lead = leadColumns({ shuffle, prolific: true });
      const from = store().requests.length;
      const t0 = Date.now();
      await openForm(page, base(), {
        instrument: 'hitopbr', study: 'fixture', prolific: true, ...(shuffle ? { shuffle } : {}), store: w.make(),
      }, { extra: prolificQuery() });
      await expect(page.locator('input[name="participant"]')).toHaveCount(0);
      await begin(page);
      const seen = await walkAll(page);
      await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
      const t1 = Date.now();

      const sent = since(from).filter((r) => r.method === 'POST');
      expect(sent.map((r) => r.path)).toEqual([w.path]);
      const row = JSON.parse(sent[0].body);
      expect([row.study, row.participant, row.instrument, row.form_build]).toEqual(['fixture', PROLIFIC.pid, exp.stem, exp.buildDate]);
      expect([row.prolific_study, row.prolific_session]).toEqual([PROLIFIC.study, PROLIFIC.session]);
      if (shuffle) {
        const shown = seen.map((s) => s.number);
        expect(shown, 'the walk saw a rearrangement').not.toEqual(numbers);
        expectShuffled(Object.keys(row), Object.values(row).map(String), {
          exp, numbers, shown, prolific: { study: PROLIFIC.study, session: PROLIFIC.session },
        });
      } else {
        expectBody(row, { fixture: parseCsv(await readFixture('responses-hitopbr-prolific.csv')), exp, seen, t0, t1, lead });
      }
      for (const it of exp.items) expect(Number.isInteger(row[it.name]), `${it.name} is a JSON integer`).toBe(true);
      if (w.sql) {
        const columns = await sqlColumns(w.sql);
        expect(columns.length, 'the fixture has column lines').toBe(lead.length + 45);
        expect(Object.keys(row)).toEqual(columns);
      }
    });
  }
}

// T14: the parameters in the address with no prolific field in the link.
for (const shuffle of [false, true]) {
  test(`without a prolific field, the Prolific parameters change nothing in the row posted${shuffle ? ' under shuffle' : ''}`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const numbers = exp.items.map((it) => it.number);
    const from = store().requests.length;
    const t0 = Date.now();
    await openForm(page, base(), {
      instrument: 'hitopbr', study: 'fixture', participant: 'p001', ...(shuffle ? { shuffle } : {}), store: webhook(store(), '/record'),
    }, { extra: prolificQuery() });
    await begin(page);
    const seen = await walkAll(page);
    await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
    const t1 = Date.now();

    const sent = since(from).filter((r) => r.method === 'POST');
    expect(sent.map((r) => r.path)).toEqual(['/record']);
    const row = JSON.parse(sent[0].body);
    expect(Object.keys(row)).not.toContain('prolific_study');
    expect(Object.keys(row)).not.toContain('prolific_session');
    if (shuffle) {
      const shown = seen.map((s) => s.number);
      expect(shown, 'the walk saw a rearrangement').not.toEqual(numbers);
      expectShuffled(Object.keys(row), Object.values(row).map(String), { exp, numbers, shown });
      expect(row.participant).toBe('p001');
    } else {
      expectBody(row, { fixture: parseCsv(await readFixture('responses-hitopbr.csv')), exp, seen, t0, t1 });
    }
  });
}

// T15: the completion address on a confirmed send, through a webhook and a
// supabase store. The route for the address holds its one request open
// while the test reads the document, so what it reads is the page's state
// at the moment the navigation was asked for: the sent screen, with its
// link to the address and no nav button left. Then the route answers. A
// locator or an evaluate waits on the pending navigation, so the document
// reaches the test through a mutation observer that reports its state on
// every change through an exposed function; the last report before the
// request is the document at that request.
function snapshot() {
  return {
    h1: document.querySelector('h1')?.textContent ?? null,
    done: document.querySelector('.done')?.textContent ?? null,
    cont: document.querySelector('p.complete')?.textContent ?? null,
    href: document.querySelector('p.complete a')?.getAttribute('href') ?? null,
    close: document.body.textContent.includes('You can close this page.'),
    navButtons: document.querySelectorAll('.nav button').length,
    saveButtons: [...document.querySelectorAll('button')].filter((b) => b.textContent.trim().includes('Save the file')).length,
  };
}
async function observeDocument(page) {
  const states = [];
  await page.exposeFunction('noteState', (s) => states.push(s));
  await page.evaluate(`(() => {
    const snapshot = ${snapshot.toString()};
    new MutationObserver(() => window.noteState(snapshot())).observe(document.body, { childList: true, subtree: true });
  })()`);
  return states;
}
for (const w of [
  { name: 'a webhook', make: () => webhook(store(), '/record'), path: '/record' },
  { name: 'a supabase store', make: () => supabase(store(), { table: 'complete_responses' }), path: '/rest/v1/complete_responses' },
]) {
  test(`with a complete address, a confirmed send to ${w.name} draws the sent screen, then navigates there once`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const downloads = [];
    page.on('download', (d) => downloads.push(d));
    const requests = [];
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route(COMPLETE_URL, async (route) => {
      requests.push({ method: route.request().method(), url: route.request().url() });
      await held;
      return route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html><head><title>Completed</title></head><body><h1>Submission complete</h1></body></html>',
      });
    });

    const from = store().requests.length;
    await openForm(page, base(), {
      instrument: 'hitopbr', study: 'send', participant: 'c1', store: w.make(), complete: COMPLETE_URL,
    });
    await begin(page);
    const states = await observeDocument(page);
    await walkAll(page);
    // The request is seen, and held. The document is the sent screen.
    await expect.poll(() => requests.length, 'the navigation request was made').toBe(1);
    expect(states.length, 'the observer saw the page walk').toBeGreaterThan(0);
    // The selector finds the form's buttons, so a count of zero means they are gone.
    expect(states.some((s) => s.navButtons > 0), 'the observer saw nav buttons on the form').toBe(true);
    const sentScreen = {
      h1: 'Thank you',
      done: 'Your responses were sent to the study team.',
      cont: `Continue to ${new URL(COMPLETE_URL).host}.`,
      href: COMPLETE_URL,
      close: false,
      navButtons: 0,
      // T20
      saveButtons: 0,
    };
    expect(states.at(-1), 'the document at the request').toEqual(sentScreen);
    expect(states.filter((s) => s.h1 === 'Thank you'), 'the sent screen was drawn once, whole').toEqual([sentScreen]);
    release();
    await expect(page).toHaveURL(COMPLETE_URL);
    await expect(page.locator('h1')).toHaveText('Submission complete');

    expect(requests.map((r) => r.method), 'one navigation request').toEqual(['GET']);
    expect(downloads, 'no file is saved on a confirmed send').toEqual([]);
    const sent = since(from).filter((r) => r.method === 'POST');
    expect(sent.map((r) => r.path)).toEqual([w.path]);
    const row = JSON.parse(sent[0].body);
    expect([row.study, row.participant, row.instrument, row.form_build]).toEqual(['send', 'c1', exp.stem, exp.buildDate]);
  });
}

// T17: with both addresses, a confirmed send goes to complete alone.
test('with complete and completeSaved, a confirmed send navigates to complete and requests nothing of completeSaved', async ({ page }) => {
  const requests = await serveComplete(page);
  const savedRequests = await serveComplete(page, COMPLETE_SAVED_URL);
  const navigations = [];
  page.on('request', (r) => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navigations.push(r.url()); });
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'send', participant: 'c4', store: webhook(store(), '/record'),
    complete: COMPLETE_URL, completeSaved: COMPLETE_SAVED_URL,
  });
  await begin(page);
  await walkAll(page);
  await expect(page).toHaveURL(COMPLETE_URL);
  await expect(page.locator('h1')).toHaveText('Submission complete');
  expect(requests.map((r) => r.method), 'one request to complete').toEqual(['GET']);
  expect(savedRequests, 'no request to completeSaved').toEqual([]);
  // The one navigation after the page's own is to complete.
  expect(navigations.filter((u) => !u.startsWith(base()))).toEqual([COMPLETE_URL]);
});

// T18: with both addresses, an unconfirmed send's saved screen links to
// completeSaved.
test('with complete and completeSaved, an unconfirmed send links to completeSaved and does not navigate', async ({ page }) => {
  const requests = await serveComplete(page);
  const savedRequests = await serveComplete(page, COMPLETE_SAVED_URL);
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'send', participant: 'c5', store: webhook(store(), '/status/500'),
    complete: COMPLETE_URL, completeSaved: COMPLETE_SAVED_URL,
  });
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const download = await downloading;

  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(page.locator('.done')).toContainText('The send to the study team could not be confirmed');
  await expect(page.locator('code.filename')).toHaveText(download.suggestedFilename());
  const link = page.locator('p.complete a');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', COMPLETE_SAVED_URL);
  await expect(link).toHaveText(new URL(COMPLETE_SAVED_URL).host);
  const order = await page.$$eval('code.filename, p.complete a', (nodes) => nodes.map((n) => n.tagName));
  expect(order).toEqual(['CODE', 'A']);
  await page.waitForTimeout(5000);
  expect(requests, 'no request to complete').toEqual([]);
  expect(savedRequests, 'no request to completeSaved').toEqual([]);
  await expect(page).not.toHaveURL(COMPLETE_URL);
  await expect(page).not.toHaveURL(COMPLETE_SAVED_URL);
});

// T16: the completion address on an unconfirmed send: a link, and no
// navigation.
test('with a complete address, an unconfirmed send shows the saved screen with a link to it and does not navigate', async ({ page }) => {
  const requests = await serveComplete(page);
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'send', participant: 'c2', store: webhook(store(), '/status/500'), complete: COMPLETE_URL,
  });
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const download = await downloading;

  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(page.locator('.done')).toContainText('The send to the study team could not be confirmed');
  await expect(page.locator('code.filename')).toHaveText(download.suggestedFilename());
  const link = page.locator('p.complete a');
  await expect(link).toHaveAttribute('href', COMPLETE_URL);
  await expect(link).toHaveText('app.prolific.com');
  // The link follows the file name in the document.
  const order = await page.$$eval('code.filename, p.complete a', (nodes) => nodes.map((n) => n.tagName));
  expect(order).toEqual(['CODE', 'A']);
  // T19: the trail sentence, and the whole screen's order, the button
  // between the trail and the link.
  await expect(page.locator('main > p').nth(2)).toHaveText(`Please send that file to the study team the way they asked. ${SAVE_AGAIN}`);
  expect(await screenOrder(page)).toEqual(savedScreenOrder({ complete: true }));
  await page.waitForTimeout(5000);
  expect(requests, 'no request to the completion address').toEqual([]);
  await expect(page).not.toHaveURL(COMPLETE_URL);
});

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
    // Without a complete field the saved screen offers no completion link.
    await expect(page.locator('p.complete')).toHaveCount(0);
    const text = await page.locator('main').textContent();
    expect(text).not.toContain('No answer');
    expect(text).not.toContain('sent from this page');

    const rows = parseCsv(await readFile(await download.path(), 'utf8'));
    expect(rows[0]).toEqual([...LEAD, ...seen.map((s) => exp.items.find((it) => it.number === s.number).name)]);
    expect(rows[1].slice(0, 4)).toEqual(['send', 'u1', exp.stem, exp.buildDate]);

    // T19: the trail paragraph names the button, the screen's order, and
    // two clicks each save the file again.
    await expect(page.locator('main > p').nth(2)).toHaveText(`Please send that file to the study team the way they asked. ${SAVE_AGAIN}`);
    expect(await screenOrder(page)).toEqual(savedScreenOrder());
    await expectSaveAgain(page, download);
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
    // Without a complete field the saved screen offers no completion link.
    await expect(page.locator('p.complete')).toHaveCount(0);
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
