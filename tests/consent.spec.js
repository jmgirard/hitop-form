// A link's `consent` field and its `completeDeclined` address.
//
// The link check. Each probe travels as z, since a 20,001-character text
// would make a c link longer than the test server reads:
//
//   C1: each fault in consent is refused naming the field and the fault,
//       and no screen of the form shows: not an object, a key other than
//       text and declined, text absent, not a string, blank, over 20,000
//       characters or holding a lone surrogate, and declined not a
//       string, blank, over 2,000 characters or holding a lone surrogate
//   C2: a text of exactly 20,000 characters and a declined text of exactly
//       2,000 are accepted, as is a text holding a paired character
//   C3: completeDeclined without consent, and an http: completeDeclined,
//       are refused naming completeDeclined
//
// The consent screen, on a text with two paragraphs, a single line break,
// a line of white space between paragraphs, `<b>x</b>` and `&amp;`:
//
//   C4: a hand-made link, its lines ended in CR LF and once in a lone CR,
//       shows the consent screen before the start screen: each paragraph's
//       innerText, a single line break as \n, no `b` element, the two
//       buttons, focus on the heading; "I agree" shows the start screen the
//       same link without consent shows; a link without consent shows no
//       consent screen
//
// "I do not agree", under no store, a webhook store and a Supabase store,
// each with `complete` set:
//
//   C5: the declined screen shows the link's declined text split as C4
//       splits, or the fixed sentence when there is none; it holds no
//       button and no link; for 2 seconds after the press the store logs no
//       request, the page makes none, no download fires and the address
//       stays
//   C6: with completeDeclined, the declined screen is drawn with a link to
//       the address, then the page goes there: a Prolific-shaped address
//       with its cc code, and a SONA-shaped address whose {participant} is
//       filled with the identifier from the address or, with none, the
//       empty string; the store and download assertions of C5 hold
//
// The columns, each pair walked or built with and without consent, with
// shuffle off and on:
//
//   C7: the saved file's header, the posted row's keys, and the SQL the
//       builder shows for a Supabase table are the same under both links

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  useTarget, openSectionOf, useStore, allowLocalStore, openForm, webhook, supabase, begin, walkAll, awaitDownload, parseCsv,
  leadColumns,
} from './helpers.mjs';

const base = useTarget();
const store = useStore();

test.beforeEach(async ({ context }) => allowLocalStore(context));

const LINK = { instrument: 'hitopbr', study: 'consent', participant: 'c1' };
const PROLIFIC_DECLINED = 'https://app.prolific.com/submissions/complete?cc=NOCONSENT';

async function expectRefused(page, message) {
  await expect(page.locator('[role=alert]')).toHaveText(message);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'I agree' })).toHaveCount(0);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
}

const consentFault = (why) => `The study link's consent field could not be used: ${why}`;

// C1
const REFUSED_CONSENT = [
  ...['Please read this.', null, ['a']].map((consent) => ({ name: JSON.stringify(consent), consent, why: 'it is not an object.' })),
  { name: 'a key "other"', consent: { text: 'a', other: 1 }, why: 'it has a field "other", and it takes only text and declined.' },
  { name: 'no text', consent: { declined: 'b' }, why: 'it has no text.' },
  { name: 'a text of 7', consent: { text: 7 }, why: 'its text is not a string.' },
  { name: 'an empty text', consent: { text: '' }, why: 'its text is empty or holds only white space.' },
  { name: 'a text of white space', consent: { text: ' \n\t\r\n ' }, why: 'its text is empty or holds only white space.' },
  { name: 'a text of 20,001 characters', consent: { text: 'x'.repeat(20_001) }, why: 'its text has 20,001 characters, more than the 20,000 it may hold.' },
  { name: 'a text holding a lone surrogate', consent: { text: 'I agree \ud800 here' }, why: 'its text holds half of a character (a lone surrogate), which cannot be written.' },
  { name: 'a declined text of 7', consent: { text: 'a', declined: 7 }, why: 'its declined text is not a string.' },
  { name: 'an empty declined text', consent: { text: 'a', declined: '' }, why: 'its declined text is empty or holds only white space.' },
  { name: 'a declined text of white space', consent: { text: 'a', declined: '\n \n' }, why: 'its declined text is empty or holds only white space.' },
  { name: 'a declined text of 2,001 characters', consent: { text: 'a', declined: 'y'.repeat(2_001) }, why: 'its declined text has 2,001 characters, more than the 2,000 it may hold.' },
  { name: 'a declined text holding a lone surrogate', consent: { text: 'a', declined: 'bye \udc00' }, why: 'its declined text holds half of a character (a lone surrogate), which cannot be written.' },
];

for (const probe of REFUSED_CONSENT) {
  test(`a consent field with ${probe.name} is refused, naming the fault`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, consent: probe.consent }, { param: 'z' });
    await expectRefused(page, consentFault(probe.why));
  });
}

// C2
for (const probe of [
  { name: 'a text of exactly 20,000 characters', consent: { text: 'x'.repeat(20_000) } },
  { name: 'a declined text of exactly 2,000 characters', consent: { text: 'a', declined: 'y'.repeat(2_000) } },
  { name: 'a text holding a paired character', consent: { text: 'I agree 😀' } },
]) {
  test(`a consent field with ${probe.name} is accepted`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, consent: probe.consent }, { param: 'z' });
    await expect(page.getByRole('button', { name: 'I agree' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}

// C3
test('a completeDeclined field without consent is refused, naming the field', async ({ page }) => {
  await openForm(page, base(), { ...LINK, completeDeclined: PROLIFIC_DECLINED });
  await expectRefused(page, `The study link's completeDeclined field could not be used: it needs a consent field beside it, and the link carries none; it is "${PROLIFIC_DECLINED}".`);
});

test('an http: completeDeclined field is refused, naming the field', async ({ page }) => {
  await openForm(page, base(), { ...LINK, consent: { text: 'a' }, completeDeclined: 'http://example.org/declined' }, { param: 'z' });
  await expectRefused(page, 'The study link\'s completeDeclined field could not be used: it must start with https://, and it is "http://example.org/declined".');
});

// ---- The consent screen ---------------------------------------------------

// The text and its paragraphs as the page must write them, stated here
// rather than computed with the code under test.
const TEXT = [
  'You are invited to take part in a study.',
  'It takes <b>x</b> minutes.',
  ' \t ',
  '',
  'Risks &amp; benefits are small.',
  'Ask us anything.',
].join('\n');
const TEXT_PARAGRAPHS = [
  'You are invited to take part in a study.\nIt takes <b>x</b> minutes.',
  'Risks &amp; benefits are small.\nAsk us anything.',
];
// The same text with its lines ended in CR LF, and the single line break
// of the second paragraph a lone CR.
const TEXT_CRLF = TEXT.replace(/\n/g, '\r\n').replace('small.\r\n', 'small.\r');

const DECLINED = 'Thank you for your time.\nYou may close this tab.\n\n<b>x</b> &amp; y.';
const DECLINED_PARAGRAPHS = ['Thank you for your time.\nYou may close this tab.', '<b>x</b> &amp; y.'];

function paragraphs(page, selector) {
  return page.$$eval(`${selector} p`, (ns) => ns.map((n) => n.innerText));
}

// C4
test('a hand-made link with CR LF shows the consent text as paragraphs before the start screen', async ({ page }) => {
  await openForm(page, base(), { ...LINK, consent: { text: TEXT_CRLF } });
  await expect(page.locator('h1')).toHaveText('Consent to take part');
  expect(await paragraphs(page, '.consent')).toEqual(TEXT_PARAGRAPHS);
  await expect(page.locator('main b')).toHaveCount(0);
  await expect(page.locator('main button')).toHaveText(['I agree', 'I do not agree']);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
  expect(await page.evaluate(() => [document.activeElement.tagName, document.activeElement.textContent])).toEqual(['H1', 'Consent to take part']);

  await page.getByRole('button', { name: 'I agree' }).click();
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  const agreed = await page.locator('main').innerHTML();

  await openForm(page, base(), LINK);
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I agree' })).toHaveCount(0);
  expect(agreed, 'the start screen after "I agree"').toBe(await page.locator('main').innerHTML());
});

// ---- "I do not agree" -----------------------------------------------------

const COMPLETE = 'https://app.prolific.com/submissions/complete?cc=CHHXQERF';
const STORES = {
  'no store': () => ({}),
  'a webhook store': () => ({ store: webhook(store()) }),
  'a Supabase store': () => ({ store: supabase(store()) }),
};

// Presses "I do not agree" and watches for 2 seconds: the requests the page
// makes, the store's log, downloads and the address. Returns what was seen.
async function declineAndWatch(page) {
  const requests = [];
  let downloads = 0;
  page.on('request', (r) => requests.push(r.url()));
  page.on('download', () => { downloads += 1; });
  const logged = store().requests.length;
  const before = page.url();
  await page.getByRole('button', { name: 'I do not agree' }).click();
  await page.waitForTimeout(2000);
  return { requests, downloads, logged: store().requests.length - logged, before };
}

for (const [storeName, storeFields] of Object.entries(STORES)) {
  for (const declined of [DECLINED, undefined]) {
    // C5
    test(`under ${storeName}, "I do not agree" shows ${declined ? 'the declined text' : 'the fixed sentence'} and sends and saves nothing`, async ({ page }) => {
      const consent = declined ? { text: TEXT, declined } : { text: TEXT };
      await openForm(page, base(), { ...LINK, ...storeFields(), complete: COMPLETE, consent }, { param: 'z' });
      await expect(page.locator('h1')).toHaveText('Consent to take part');
      const seen = await declineAndWatch(page);
      await expect(page.locator('h1')).toHaveText('Thank you');
      expect(await paragraphs(page, '.declined')).toEqual(declined ? DECLINED_PARAGRAPHS : ['You chose not to take part. You can close this page.']);
      await expect(page.locator('main b')).toHaveCount(0);
      await expect(page.locator('main button')).toHaveCount(0);
      await expect(page.locator('main a')).toHaveCount(0);
      await expect(page.locator('fieldset.item')).toHaveCount(0);
      expect(seen.logged, 'requests the store logged').toBe(0);
      expect(seen.requests, 'requests the page made').toEqual([]);
      expect(seen.downloads, 'downloads').toBe(0);
      expect(page.url(), 'the address').toBe(seen.before);
    });
  }
}

// The document at the moment of a navigation request, reported through a
// mutation observer (a locator waits on the pending navigation).
async function observeScreen(page) {
  const states = [];
  await page.exposeFunction('noteScreen', (s) => states.push(s));
  await page.evaluate(`(() => {
    const snap = () => ({
      h1: document.querySelector('h1')?.textContent ?? null,
      declined: [...document.querySelectorAll('.declined p')].map((p) => p.innerText),
      links: [...document.querySelectorAll('main a')].map((a) => [a.getAttribute('href'), a.textContent]),
    });
    new MutationObserver(() => window.noteScreen(snap())).observe(document.body, { childList: true, subtree: true });
  })()`);
  return states;
}

// Answers every request to the host of `address`, holding each until
// `release()`, and records its URL.
async function holdHost(page, address) {
  const requests = [];
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const host = new URL(address).hostname;
  await page.route((url) => url.hostname === host, async (route) => {
    requests.push(route.request().url());
    await held;
    return route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><title>Done</title></head><body><h1>Returned</h1></body></html>',
    });
  });
  return { requests, release };
}

const PROLIFIC_NO_CONSENT = 'https://app.prolific.com/submissions/complete?cc=NOCONSENT';
const SONA_DECLINED = 'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code={participant}';
// The filled addresses, written out rather than computed with the code
// under test.
const SONA_FILLED_ABC = 'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code=a%26b%20c';
const SONA_FILLED_EMPTY = 'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code=';

const DECLINED_CASES = [
  {
    name: 'a Prolific-shaped address with its cc code',
    fields: { ...LINK, completeDeclined: PROLIFIC_NO_CONSENT },
    extra: '', reached: PROLIFIC_NO_CONSENT, host: 'app.prolific.com',
  },
  {
    name: 'a SONA-shaped address, the identifier from the address',
    fields: { instrument: 'hitopbr', study: 'consent', participantParam: 'id', completeDeclined: SONA_DECLINED },
    extra: '&id=a%26b%20c', reached: SONA_FILLED_ABC, host: 'yourschool.sona-systems.com',
  },
  {
    name: 'a SONA-shaped address, with no identifier',
    fields: { instrument: 'hitopbr', study: 'consent', participantParam: 'id', completeDeclined: SONA_DECLINED },
    extra: '', reached: SONA_FILLED_EMPTY, host: 'yourschool.sona-systems.com',
  },
];

// C6
for (const c of DECLINED_CASES) {
  for (const [storeName, storeFields] of Object.entries(STORES)) {
    for (const declined of [undefined, DECLINED]) {
      test(`completeDeclined, ${c.name}, under ${storeName}${declined ? ', with declined text' : ''}: the screen links to it, then the page goes there`, async ({ page }) => {
        const consent = declined ? { text: TEXT, declined } : { text: TEXT };
        const { requests, release } = await holdHost(page, c.reached);
        await openForm(page, base(), { ...c.fields, ...storeFields(), consent }, { param: 'z', extra: c.extra });
        await expect(page.locator('h1')).toHaveText('Consent to take part');
        const states = await observeScreen(page);
        let downloads = 0;
        page.on('download', () => { downloads += 1; });
        const logged = store().requests.length;
        // The press navigates at once, and the navigation is held, so the
        // click does not wait for it.
        await page.getByRole('button', { name: 'I do not agree' }).click({ noWaitAfter: true });
        await expect.poll(() => requests.length, 'the navigation request was made').toBe(1);
        expect(states.at(-1), 'the declined screen at the request').toEqual({
          h1: 'Thank you',
          declined: declined ? DECLINED_PARAGRAPHS : ['You chose not to take part.'],
          links: [[c.reached, c.host]],
        });
        release();
        await expect(page).toHaveURL(c.reached);
        await page.waitForTimeout(2000);
        expect(requests).toEqual([c.reached]);
        expect(store().requests.length - logged, 'requests the store logged').toBe(0);
        expect(downloads, 'downloads').toBe(0);
      });
    }
  }
}

// ---- The columns ----------------------------------------------------------

// Opens the link, presses "I agree" when it carries consent, and walks the
// form to Finish.
async function walkLink(page, config) {
  await openForm(page, base(), config, { param: config.consent ? 'z' : 'c' });
  if (config.consent) await page.getByRole('button', { name: 'I agree' }).click();
  await begin(page);
  await walkAll(page);
}

// C7
for (const shuffle of [false, true]) {
  const extra = shuffle ? { shuffle } : {};
  const under = shuffle ? ' under shuffle' : '';

  test(`the saved file's header is the same with and without consent${under}`, async ({ page }) => {
    const headers = [];
    for (const consent of [{ consent: { text: TEXT } }, {}]) {
      const downloading = awaitDownload(page);
      await walkLink(page, { ...LINK, ...extra, ...consent });
      headers.push(parseCsv(await readFile(await (await downloading).path(), 'utf8'))[0]);
    }
    expect(headers[0].slice(0, leadColumns({ shuffle }).length)).toEqual(leadColumns({ shuffle }));
    expect(headers[0]).toEqual(headers[1]);
  });

  test(`the posted row's keys are the same with and without consent${under}`, async ({ page }) => {
    const rows = [];
    for (const consent of [{ consent: { text: TEXT } }, {}]) {
      const from = store().requests.length;
      await walkLink(page, { ...LINK, ...extra, ...consent, store: webhook(store()) });
      await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
      const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
      expect(sent.length).toBe(1);
      rows.push(JSON.parse(sent[0].body));
    }
    expect(Object.keys(rows[0]).slice(0, leadColumns({ shuffle }).length)).toEqual(leadColumns({ shuffle }));
    expect(Object.keys(rows[0])).toEqual(Object.keys(rows[1]));
  });

  test(`the builder's Supabase SQL is the same with and without consent${under}`, async ({ page }) => {
    const sqls = [];
    for (const consent of [TEXT, '']) {
      await page.goto(`${base()}link.html`);
      await page.locator('select[name="instrument"]').selectOption('hitopbr');
      await page.locator('input[name="study"]').fill('consent');
      if (shuffle) {
        await openSectionOf(page, 'shuffle');
        await page.locator('input[name="shuffle"]').check();
      }
      await openSectionOf(page, 'consentText');
      await page.locator('textarea[name="consentText"]').fill(consent);
      await page.locator('select[name="storeKind"]').selectOption('supabase');
      await page.locator('input[name="supabaseUrl"]').fill('https://abcdefghijkl.supabase.co');
      await page.locator('input[name="supabaseKey"]').fill('sb_publishable_x');
      await page.locator('input[name="supabaseTable"]').fill('responses');
      await page.getByRole('button', { name: 'Make the link' }).click();
      await expect(page.locator('#sqlBlock')).toBeVisible();
      await expect(page.locator('#err')).toHaveText('');
      const href = await page.locator('#out').textContent();
      expect([...new URL(href).searchParams.keys()]).toEqual([consent ? 'z' : 'c']);
      sqls.push(await page.locator('#sql').inputValue());
    }
    expect(sqls[0]).toContain('create table "responses" (');
    expect(sqls[0].includes('"item_order" text')).toBe(shuffle);
    expect(sqls[0]).toBe(sqls[1]);
  });
}
