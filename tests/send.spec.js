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
//       the send could not be confirmed and names the saved file, and no
//       screen says that no answer was sent
//   T7: Finish is disabled from its first press until the outcome screen
//
// Walked for the HiTOP-BR and the shuffled HiTOP-SR module fixture through
// /record and through /redirect (T1 to T3), the HiTOP-BR for the rest. The
// endpoint is tests/serve.mjs serveStore(), started by every run, whatever
// the target.

import { test, expect } from '@playwright/test';
import {
  useTarget, useStore, allowLocalStore, webhook, openForm, begin, walkAll, fetchExport, readDescriptor,
  readFixture, parseCsv, awaitDownload, nextButton, SEND_TIMEOUT_MS,
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
      const row = JSON.parse(sent[0].body);
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
    });
  }
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
      // T7: Finish is disabled while the send is pending.
      const finish = nextButton(page);
      await expect(finish).toBeDisabled();
      await expect(finish).toHaveText('Sending…');
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
