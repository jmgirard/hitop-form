// The export's version display and the format guard.
//
//   G1: the start screen and the done screen show the export's buildDate and
//       packageVersion (form_build in the saved file is S2 in save.spec.js)
//   G2: an export whose format is a string other than "1.0" is refused with
//       a message naming the format found, and no form starts
//   G3: an export with no format field is refused with a message saying so
//   G4: an export whose format is not a string is refused with a message
//       naming the value found
//   G7: a link's store is refused by name when it is null, an array or a
//       string, when its kind is unknown, and when its url is missing, not
//       text, unparsable, http: to a host other than 127.0.0.1 or localhost
//       (near misses included), or of another scheme; an https: url and an
//       http: url to 127.0.0.1 or localhost are accepted
//   G8: a supabase store is refused by name when its url fails the G7 rule,
//       its key is missing, empty or not text, or its table is missing or
//       not a lower-case Postgres name (a capital, a leading digit, a
//       hyphen, the empty string, 64 characters); four table forms accepted
//
// The altered exports are copies of the live export served in its place, so
// nothing but the one field differs.

import { test, expect } from '@playwright/test';
import { useTarget, openForm, begin, walkAll, fetchExport, readDescriptor } from './helpers.mjs';

const base = useTarget();

test('the start and done screens show the export build and package version', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g1' });
  // G1
  const version = page.locator('.version');
  await expect(version).toContainText(exp.buildDate);
  await expect(version).toContainText(exp.packageVersion);
  await begin(page);
  await walkAll(page);
  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(version).toContainText(exp.buildDate);
  await expect(version).toContainText(exp.packageVersion);
});

const PROBES = [
  { name: 'altered', alter: (e) => ({ ...e, format: '2.0' }), names: 'format "2.0"' },
  {
    name: 'absent',
    alter: (e) => { const c = { ...e }; delete c.format; return c; },
    names: 'no format field',
  },
  { name: 'non-string', alter: (e) => ({ ...e, format: 1 }), names: 'a format that is not text (1)' },
];

for (const probe of PROBES) {
  test(`an export with format ${probe.name} is refused, naming what was found`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const served = probe.alter(exp);
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g2' }, {
      exportJson: served,
    });
    // G2, G3, G4
    const alert = page.locator('[role=alert]');
    await expect(alert).toContainText('This page reads format "1.0"');
    await expect(alert).toContainText(probe.names);
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
  });
}

// G5: the fields the saved file carries are guarded too.
test('an export whose stem does not match the link is refused', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g5' }, {
    exportJson: { ...exp, stem: 'hitopsr' },
  });
  await expect(page.locator('[role=alert]')).toContainText('its stem is "hitopsr" and the link asked for "hitopbr"');
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('an export with no buildDate is refused', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  const served = { ...exp };
  delete served.buildDate;
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g5' }, {
    exportJson: served,
  });
  await expect(page.locator('[role=alert]')).toContainText('its buildDate field is missing or not text');
});

// G6: the link's own guards. A descriptor of another format is refused by
// name, and a blank participant identifier makes the start screen ask.
test('a descriptor whose format is not "1.0" is refused', async ({ page }) => {
  const module = { ...(await readDescriptor('module-plain.json')), format: '2.0' };
  await openForm(page, base(), { instrument: module.instrument, study: 'guard', module });
  await expect(page.locator('[role=alert]')).toContainText('this page reads format "1.0" and found format "2.0"');
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('a blank participant identifier in the link is asked for on the start screen', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: '   ' });
  await expect(page.locator('input[name="participant"]')).toBeVisible();
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.locator('[role=alert]')).toHaveText('Please enter your participant identifier before starting.');
  await expect(page.locator('.progress')).toHaveCount(0);
});

// G7: the store guard. Each refused form names its fault; no request is sent
// before Finish, so the accepted forms need no endpoint to open.
const REFUSED_STORES = [
  { name: 'null', store: null, names: 'it is not an object.' },
  { name: 'an array', store: ['https://example.com/hook'], names: 'it is not an object.' },
  { name: 'a string', store: 'https://example.com/hook', names: 'it is not an object.' },
  {
    name: 'an unknown kind',
    store: { kind: 'ftp', url: 'https://example.com/hook' },
    names: 'its kind is "ftp", and this page knows only "webhook", "supabase".',
  },
  { name: 'a missing url', store: { kind: 'webhook' }, names: 'it names no url.' },
  { name: 'a url that is not text', store: { kind: 'webhook', url: 7 }, names: 'its url is not text.' },
  {
    name: 'an unparsable url',
    store: { kind: 'webhook', url: 'not a url' },
    names: 'its url is not a web address: "not a url".',
  },
  ...[
    'http://example.com/hook',
    'http://localhost.example.com/hook',
    'http://127.0.0.1.example.com/hook',
    'javascript:alert(1)',
    'data:text/plain,x',
  ].map((url) => ({
    name: `the url ${url}`,
    store: { kind: 'webhook', url },
    names: `its url must start with https:// (http:// is accepted only for 127.0.0.1 or localhost), and it is ${JSON.stringify(url)}.`,
  })),
  {
    name: 'a url with a user name and password',
    store: { kind: 'webhook', url: 'https://user:pass@example.com/hook' },
    names: 'its url must not carry a user name or password, and it is "https://user:pass@example.com/hook".',
  },
  // G8: the supabase kind. Its url takes the webhook rule; its key and its
  // table have rules of their own.
  {
    name: 'a supabase store with an http: url to another host',
    store: { kind: 'supabase', url: 'http://example.supabase.co', key: 'k', table: 'responses' },
    names: 'its url must start with https:// (http:// is accepted only for 127.0.0.1 or localhost), and it is "http://example.supabase.co".',
  },
  { name: 'a supabase store with no key', store: { kind: 'supabase', url: 'https://example.supabase.co', table: 'responses' }, names: 'it names no key.' },
  { name: 'a supabase store whose key is empty', store: { kind: 'supabase', url: 'https://example.supabase.co', key: '  ', table: 'responses' }, names: 'its key is empty.' },
  { name: 'a supabase store whose key is not text', store: { kind: 'supabase', url: 'https://example.supabase.co', key: 7, table: 'responses' }, names: 'its key is not text.' },
  { name: 'a supabase store with no table', store: { kind: 'supabase', url: 'https://example.supabase.co', key: 'k' }, names: 'it names no table.' },
  ...['Responses', '1abc', 'a-b', '', 'a'.repeat(64)].map((table) => ({
    name: `a supabase store whose table is ${JSON.stringify(table)}`,
    store: { kind: 'supabase', url: 'https://example.supabase.co', key: 'k', table },
    names: `its table must be a lower-case name of up to 63 letters, digits and underscores, not starting with a digit, and it is ${JSON.stringify(table)}.`,
  })),
];

for (const probe of REFUSED_STORES) {
  test(`a store that is ${probe.name} is refused, naming the fault`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g7', store: probe.store });
    const alert = page.locator('[role=alert]');
    await expect(alert).toContainText("The study link's store could not be used: ");
    await expect(alert).toContainText(probe.names);
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  });
}

for (const url of ['https://example.com/hook', 'http://127.0.0.1:8123/record', 'http://localhost:8123/record']) {
  test(`a store at ${url} is accepted`, async ({ page }) => {
    await openForm(page, base(), {
      instrument: 'hitopbr', study: 'guard', participant: 'g7', store: { kind: 'webhook', url },
    });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}

// The accepted table forms: the shortest, one with digits and underscores
// after the first letter, one starting with an underscore, and the longest.
for (const table of ['a', 'r2_d2', '_x', 'a'.repeat(63)]) {
  test(`a supabase store whose table is ${JSON.stringify(table)} is accepted`, async ({ page }) => {
    await openForm(page, base(), {
      instrument: 'hitopbr', study: 'guard', participant: 'g8',
      store: { kind: 'supabase', url: 'https://example.supabase.co', key: 'sb_publishable_x', table },
    });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}

test('the live export is accepted (the probes fail for their field, not for the copy)', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g3' }, {
    exportJson: exp,
  });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  // The start screen holds an empty alert slot for the participant box; a
  // refusal would have filled it.
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
});
