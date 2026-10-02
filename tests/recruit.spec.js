// A link's `participantParam` field: the participant identifier taken from
// an address parameter the recruiting site fills (SONA's `id=%SURVEY_CODE%`,
// CloudResearch Connect's `participantId`).
//
//   P1: under participantParam: "id", an address carrying id=30039 shows no
//       identifier field, and the saved file's participant is 30039
//   P2: under participantParam: "id", the start screen asks for the
//       identifier when id is a lone %SURVEY_CODE%, blank, a {{…}} value, or
//       absent; the %SURVEY_CODE% walk saves the typed identifier
//   P3: an address carrying id twice, first as %SURVEY_CODE% and then
//       filled, shows no identifier field and saves the filled value
//   P4: a parameter name holding "." and "-" (survey.code-1) is read as P1
//       reads id
//   P5: a link with neither participantParam nor prolific: true and no
//       participant asks for the identifier with id=30039 in the address
//   P6: readParticipantParam() itself: the first filled value of a doubled
//       parameter in either order, the placeholder forms and blanks skipped
//   P7: with shuffle off and with shuffle on, the saved file's header and
//       the posted row's keys under participantParam equal those of the
//       same link without it, the identifier given as participant instead
//
// The {participant} token in a completion address, on a SONA-shaped
// address (P11's saved-file address a second one, on another host) except
// P13's address without the token. Each use of the address, and each
// source of the identifier:
//
//   P8: a confirmed send, identifier "a&b c" from the address: at the held
//       navigation request the sent screen's link is the filled address,
//       and the one navigation goes there
//   P9: a confirmed send under prolific: true, identifier 12345 from
//       PROLIFIC_PID: the one navigation goes to the filled address
//   P10: no store, identifier "a&b c" typed on the start screen: the saved
//       screen links to the filled complete address, and nothing is
//       requested of it
//   P11: no store, identifier 12345 from the link's participant field, with
//       complete and completeSaved both holding the token: the saved screen
//       links to the filled completeSaved address
//   P12: an unconfirmed send, identifier "a&b c" from the address: the
//       saved screen links to the filled complete address
//   P13: an address without the token, under participantParam, is used as
//       the link check returns it (its parsed href): the navigation and the
//       sent screen's link after a confirmed send, and the saved screen's
//       link to complete and to completeSaved after a walk with no store,
//       two of the addresses given with an uppercase host the parse
//       lowercases
//   P14: fillParticipant() itself: each token replaced, the value encoded
//       as one query value, an address without the token unchanged
//
// An identifier holding an unpaired surrogate, which cannot be encoded:
//
//   P15: the start screen refuses one entered as a lone high, a lone low,
//       and a low before a high surrogate, with one message; no item shows
//   P16: an address value percent-encoding a surrogate (%ED%A0%80) arrives
//       as three U+FFFD characters, and the sent screen links to the
//       address filled with them

import { readFile } from 'node:fs/promises';
import {
  test, expect, useTarget, useStore, allowLocalStore, webhook, openForm, begin, walkAll, awaitDownload, parseCsv, leadColumns,
  prolificQuery, COMPLETE_URL, CONTINUE, observeUntilLeave,
} from './helpers.mjs';
import { readParticipantParam, fillParticipant } from '../form.js';

const base = useTarget();
const store = useStore();

test.beforeEach(async ({ context }) => allowLocalStore(context));

const SONA_CODE = '30039';

// Walks the HiTOP-BR to Finish with no store and returns the saved file's
// rows. `typed` is entered on the start screen when it asks.
async function walkToFile(page, config, { extra = '', typed } = {}) {
  await openForm(page, base(), config, { extra });
  await begin(page, typed);
  const downloading = awaitDownload(page);
  await walkAll(page);
  return parseCsv(await readFile(await (await downloading).path(), 'utf8'));
}

// P1
test('under participantParam, a filled id in the address is the participant', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'id' }, { extra: `&id=${SONA_CODE}` });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
  expect(rows[0].slice(0, 5)).toEqual(leadColumns());
  expect(rows[1].slice(0, 3)).toEqual(['recruit', SONA_CODE, 'hitopbr']);
});

// P2
for (const c of [
  { name: 'a lone %SURVEY_CODE%', extra: '&id=%SURVEY_CODE%', walk: true },
  { name: 'blank', extra: '&id=' },
  { name: 'a {{…}} value', extra: '&id={{participantId}}' },
  { name: 'absent', extra: '' },
]) {
  test(`under participantParam, an id that is ${c.name} shows the identifier field`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'id' }, { extra: c.extra });
    await expect(page.locator('input[name="participant"]')).toBeVisible();
    await expect(page.locator('input[name="participant"]')).toHaveValue('');
    if (!c.walk) return;
    await begin(page, 'typed');
    const downloading = awaitDownload(page);
    await walkAll(page);
    const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
    expect(rows[1].slice(0, 3)).toEqual(['recruit', 'typed', 'hitopbr']);
  });
}

// P3
test('under participantParam, an id carried as %SURVEY_CODE% and then filled saves the filled value', async ({ page }) => {
  const rows = await walkToFile(page, { instrument: 'hitopbr', study: 'recruit', participantParam: 'id' }, {
    extra: `&id=%SURVEY_CODE%&id=${SONA_CODE}`,
  });
  expect(rows[1].slice(0, 3)).toEqual(['recruit', SONA_CODE, 'hitopbr']);
});

// P4
test('a participantParam holding "." and "-" is read from the address', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'survey.code-1' }, {
    extra: '&survey.code-1=777',
  });
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
  expect(rows[1].slice(0, 3)).toEqual(['recruit', '777', 'hitopbr']);
});

// P5
test('without participantParam or prolific, an id in the address does not fill the identifier', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit' }, { extra: `&id=${SONA_CODE}&participantId=abc` });
  await expect(page.locator('input[name="participant"]')).toBeVisible();
  await expect(page.locator('input[name="participant"]')).toHaveValue('');
});

// P6: read in Node from form.js, which the page imports unchanged.
test('readParticipantParam() reads the first filled value and skips blanks and placeholders', () => {
  expect(readParticipantParam(`?id=${SONA_CODE}`, 'id')).toBe(SONA_CODE);
  expect(readParticipantParam(`?id=%SURVEY_CODE%&id=${SONA_CODE}`, 'id'), 'placeholder then filled').toBe(SONA_CODE);
  expect(readParticipantParam(`?id=${SONA_CODE}&id=%SURVEY_CODE%`, 'id'), 'filled then placeholder').toBe(SONA_CODE);
  expect(readParticipantParam(`?id=${SONA_CODE}&id=second`, 'id'), 'two filled').toBe(SONA_CODE);
  expect(readParticipantParam('?id=&id=%20', 'id'), 'blanks').toBe('');
  expect(readParticipantParam('?id={{%PROLIFIC_PID%}}', 'id'), 'a Prolific placeholder').toBe('');
  expect(readParticipantParam(`?ID=${SONA_CODE}`, 'id'), 'another case is another name').toBe('');
  expect(readParticipantParam('?participantId=abc123', 'participantId')).toBe('abc123');
});

// P7: the file's header and the row's keys, each walked with and without
// participantParam, the identifier given as participant in the second.
for (const shuffle of [false, true]) {
  const extraFields = shuffle ? { shuffle } : {};
  test(`the saved file's header is the same with and without participantParam${shuffle ? ' under shuffle' : ''}`, async ({ page }) => {
    const withParam = await walkToFile(page, { instrument: 'hitopbr', study: 'recruit', participantParam: 'id', ...extraFields }, {
      extra: `&id=${SONA_CODE}`,
    });
    const without = await walkToFile(page, { instrument: 'hitopbr', study: 'recruit', participant: SONA_CODE, ...extraFields });
    expect(withParam[0].slice(0, shuffle ? 6 : 5)).toEqual(leadColumns({ shuffle }));
    expect(withParam[0]).toEqual(without[0]);
    expect(withParam[1][1]).toBe(SONA_CODE);
  });

  test(`the posted row's keys are the same with and without participantParam${shuffle ? ' under shuffle' : ''}`, async ({ page }) => {
    const rows = [];
    for (const [config, extra] of [
      [{ participantParam: 'id' }, `&id=${SONA_CODE}`],
      [{ participant: SONA_CODE }, ''],
    ]) {
      const from = store().requests.length;
      await openForm(page, base(), {
        instrument: 'hitopbr', study: 'recruit', ...config, ...extraFields, store: webhook(store(), '/record'),
      }, { extra });
      await begin(page);
      await walkAll(page);
      await expect(page.locator('.done')).toHaveText('Your answers were sent to the study team.');
      const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
      expect(sent.length).toBe(1);
      rows.push(JSON.parse(sent[0].body));
    }
    expect(Object.keys(rows[0]).slice(0, shuffle ? 6 : 5)).toEqual(leadColumns({ shuffle }));
    expect(Object.keys(rows[0])).toEqual(Object.keys(rows[1]));
    expect(rows[0].participant).toBe(SONA_CODE);
  });
}

// ---- The {participant} token ---------------------------------------------

// SONA's client-side completion address with the token where SONA's
// documentation puts XXXX, and a saved-file address with the same path and
// query on another host so a test tells the two apart. Neither is fetched
// for real: a route answers.
const SONA_COMPLETE = 'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code={participant}';
const SAVED_COMPLETE = 'https://saved.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code={participant}';
// The filled addresses, written out rather than computed with the code
// under test.
const SONA_FILLED_ABC = 'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code=a%26b%20c';
const SONA_FILLED_12345 = 'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code=12345';
const SAVED_FILLED_12345 = 'https://saved.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code=12345';
const ABC_QUERY = '&id=a%26b%20c';

// Answers every request to an address on either completion host, holding
// each until `release()` when `hold` is set, and records its URL.
async function serveCompletion(page, { hold = false } = {}) {
  const requests = [];
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route((url) => url.hostname === 'yourschool.sona-systems.com' || url.hostname === 'saved.sona-systems.com', async (route) => {
    requests.push(route.request().url());
    if (hold) await held;
    return route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><title>Credit</title></head><body><h1>Credit granted</h1></body></html>',
    });
  });
  return { requests, release };
}

// The document's states until the page starts to leave, the last of them
// the document at the navigation request (observeUntilLeave(); a locator
// waits on the pending navigation).
function observeLink(page) {
  return observeUntilLeave(page, () => ({
    h1: document.querySelector('h1')?.textContent ?? null,
    href: document.querySelector('p.complete a')?.getAttribute('href') ?? null,
    text: document.querySelector('p.complete a')?.textContent ?? null,
  }));
}

// P8
test('a confirmed send fills the token with the identifier from the address in the sent screen link and the navigation', async ({ page }) => {
  const { requests, release } = await serveCompletion(page, { hold: true });
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'recruit', participantParam: 'id', store: webhook(store(), '/record'), complete: SONA_COMPLETE,
  }, { extra: ABC_QUERY });
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await begin(page);
  const states = await observeLink(page);
  await walkAll(page, { finish: 'held' });
  await expect.poll(() => requests.length, 'the navigation request was made').toBe(1);
  await expect.poll(() => states.left, 'the page reported its navigation').toBe(true);
  expect(states.at(-1), 'the sent screen at the request').toEqual({
    h1: 'Thank you', href: SONA_FILLED_ABC, text: CONTINUE,
  });
  release();
  await expect(page).toHaveURL(SONA_FILLED_ABC);
  expect(requests).toEqual([SONA_FILLED_ABC]);
});

// P9
test('a confirmed send under prolific fills the token with the PROLIFIC_PID', async ({ page }) => {
  const { requests } = await serveCompletion(page);
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'recruit', prolific: true, store: webhook(store(), '/record'), complete: SONA_COMPLETE,
  }, { extra: prolificQuery({ pid: '12345' }) });
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await begin(page);
  await walkAll(page);
  await expect(page).toHaveURL(SONA_FILLED_12345);
  expect(requests).toEqual([SONA_FILLED_12345]);
});

// P10
test('with no store, the saved screen links to complete filled with the identifier typed on the start screen', async ({ page }) => {
  const { requests } = await serveCompletion(page);
  await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'id', complete: SONA_COMPLETE });
  await begin(page, 'a&b c');
  const downloading = awaitDownload(page);
  await walkAll(page);
  await downloading;
  const link = page.locator('p.complete a');
  await expect(link).toHaveAttribute('href', SONA_FILLED_ABC);
  await expect(link).toHaveText(CONTINUE);
  await page.waitForTimeout(2000);
  expect(requests, 'nothing requested of the completion address').toEqual([]);
});

// P11
test('with no store, the saved screen links to completeSaved filled with the link\'s participant', async ({ page }) => {
  const { requests } = await serveCompletion(page);
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'recruit', participant: '12345', complete: SONA_COMPLETE, completeSaved: SAVED_COMPLETE,
  });
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  await downloading;
  const link = page.locator('p.complete a');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', SAVED_FILLED_12345);
  await expect(link).toHaveText(CONTINUE);
  await page.waitForTimeout(2000);
  expect(requests, 'nothing requested of either address').toEqual([]);
});

// P12
test('an unconfirmed send links to complete filled with the identifier from the address', async ({ page }) => {
  const { requests } = await serveCompletion(page);
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'recruit', participantParam: 'id', store: webhook(store(), '/status/500'), complete: SONA_COMPLETE,
  }, { extra: ABC_QUERY });
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  await downloading;
  await expect(page.locator('h1')).toHaveText('Your answers were not sent');
  await expect(page.locator('.done')).toContainText('This page got no confirmation that your answers reached the study team.');
  await expect(page.locator('p.complete a')).toHaveAttribute('href', SONA_FILLED_ABC);
  await page.waitForTimeout(2000);
  expect(requests, 'nothing requested of the completion address').toEqual([]);
});

// P13: an address without the token, as the link check returns it (the
// parsed address's href), at each use. EXAMPLE_GIVEN is one the parse
// changes: the host is lowercased. The parsed forms are written out rather
// than computed with the code under test.
const EXAMPLE_GIVEN = 'https://Example.org/done?x=1';
const EXAMPLE_PARSED = 'https://example.org/done?x=1';
const EXAMPLE_SAVED_GIVEN = 'https://Example.org/saved?y=2';
const EXAMPLE_SAVED_PARSED = 'https://example.org/saved?y=2';

test('under participantParam, a confirmed send uses a completion address without the token as parsed, in the sent screen link and the navigation', async ({ page }) => {
  const requests = [];
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route((url) => url.hostname === 'example.org', async (route) => {
    requests.push(route.request().url());
    await held;
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>Done</title><h1>Done</h1>' });
  });
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'recruit', participantParam: 'id', store: webhook(store(), '/record'), complete: EXAMPLE_GIVEN,
  }, { extra: `&id=${SONA_CODE}` });
  await begin(page);
  const states = await observeLink(page);
  await walkAll(page, { finish: 'held' });
  await expect.poll(() => requests.length, 'the navigation request was made').toBe(1);
  await expect.poll(() => states.left, 'the page reported its navigation').toBe(true);
  expect(states.at(-1), 'the sent screen at the request').toEqual({ h1: 'Thank you', href: EXAMPLE_PARSED, text: CONTINUE });
  release();
  await expect(page).toHaveURL(EXAMPLE_PARSED);
  expect(requests).toEqual([EXAMPLE_PARSED]);
});

for (const c of [
  { name: 'complete', config: { complete: COMPLETE_URL }, href: COMPLETE_URL },
  { name: 'complete, in a form the parse changes', config: { complete: EXAMPLE_GIVEN }, href: EXAMPLE_PARSED },
  { name: 'completeSaved', config: { complete: EXAMPLE_GIVEN, completeSaved: EXAMPLE_SAVED_GIVEN }, href: EXAMPLE_SAVED_PARSED },
]) {
  test(`under participantParam, the saved screen links to ${c.name} without the token as parsed`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'id', ...c.config }, {
      extra: `&id=${SONA_CODE}`,
    });
    await begin(page);
    const downloading = awaitDownload(page);
    await walkAll(page);
    await downloading;
    await expect(page.locator('p.complete a')).toHaveCount(1);
    await expect(page.locator('p.complete a')).toHaveAttribute('href', c.href);
  });
}

// P14: read in Node from form.js.
test('fillParticipant() replaces each token with the encoded identifier', () => {
  expect(fillParticipant(SONA_COMPLETE, 'a&b c')).toBe(SONA_FILLED_ABC);
  expect(fillParticipant('https://example.org/done?a={participant}&b={participant}#c={participant}', 'x/y?z'))
    .toBe('https://example.org/done?a=x%2Fy%3Fz&b=x%2Fy%3Fz#c=x%2Fy%3Fz');
  expect(fillParticipant(COMPLETE_URL, 'a&b c'), 'no token').toBe(COMPLETE_URL);
  expect(fillParticipant('https://example.org/done?code={participant}', 'ü#1')).toBe('https://example.org/done?code=%C3%BC%231');
});

// P15: Playwright's fill() and typing replace a lone surrogate with U+FFFD,
// so the field is set by script through the page, and its value read
// back before Begin to show the surrogate is there.
for (const [name, value] of [['a lone high', 'a\ud800b'], ['a lone low', 'a\udc00b'], ['a low before a high', '\udc00\ud800']]) {
  test(`the start screen refuses an identifier holding ${name} surrogate, and no item shows`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'id', complete: SONA_COMPLETE });
    const input = page.locator('input[name="participant"]');
    await expect(input).toBeVisible();
    const held = await input.evaluate((el, v) => {
      el.value = v;
      return [...el.value].map((ch) => ch.codePointAt(0));
    }, value);
    expect(held, 'the field holds the surrogate').toEqual([...value].map((ch) => ch.codePointAt(0)));
    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page.locator('[role=alert]')).toHaveText('Your participant identifier holds a character this page cannot read. Please type it again.');
    await expect(page.locator('fieldset.item')).toHaveCount(0);
    await expect(page.locator('.progress')).toHaveCount(0);
    await expect(input).toBeVisible();
  });
}

// P16
test('an address value encoding a surrogate arrives as replacement characters, and the sent screen links to the filled address', async ({ page }) => {
  const requests = [];
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route((url) => url.hostname === 'example.org', async (route) => {
    requests.push(route.request().url());
    await held;
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>Done</title><h1>Done</h1>' });
  });
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'recruit', participantParam: 'id', store: webhook(store(), '/record'), complete: 'https://example.org/done?code={participant}',
  }, { extra: '&id=%ED%A0%80' });
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await begin(page);
  const states = await observeLink(page);
  await walkAll(page, { finish: 'held' });
  await expect.poll(() => requests.length, 'the navigation request was made').toBe(1);
  await expect.poll(() => states.left, 'the page reported its navigation').toBe(true);
  const filled = 'https://example.org/done?code=%EF%BF%BD%EF%BF%BD%EF%BF%BD';
  expect(states.at(-1), 'the sent screen at the request').toEqual({ h1: 'Thank you', href: filled, text: CONTINUE });
  release();
  await expect(page).toHaveURL(filled);
  expect(requests).toEqual([filled]);
});
