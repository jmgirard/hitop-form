// The link builder: link.html makes a study link for each instrument.
//
//   L1: the instrument selector offers the five instruments, each with its
//       item count, and "HiTOP-SR module (scales you choose)" right after the
//       HiTOP-SR, in this order
//   L2: a link built for each instrument opens that instrument's form, whose
//       heading names the instrument and whose start screen counts its items
//   L3: the hint in a module row names where a module file comes from and
//       links the Module Builder and the README's module section
//   L4: a "Send responses to" address the form page would refuse is refused
//       here, naming the fault, and no link is built; the web-address kind
//       with an empty address is refused too; the file kind builds a link
//       with no store even when the hidden address field holds an
//       invalid address
//   L5: a link built with the address set opens a form whose Finish posts
//       the responses to that address
//   L6: a Supabase store the form page would refuse (its URL, its key, its
//       table, a secret key) is refused here, naming the fault; no link and
//       no SQL, and a refused build clears the link and SQL shown before it
//   L7: the SQL shown for a Supabase store equals the hand-written fixture
//       for the HiTOP-BR and for the shuffled module, and the link carries
//       the store's four fields; with the random-order box checked it
//       equals the two shuffle fixtures, whose item_order column follows
//       submitted and whose item columns are in the instrument's order
//   L9: the builder has a checkbox "Show the items in a random order" whose
//       hint says each participant sees a new order in place of a module's
//       printed order, that the file still lists the items in the
//       instrument's order, and that item_order records the order seen;
//       checked, the link carries
//       shuffle: true and opens a page that renders a rearrangement;
//       unchecked, the link carries no shuffle field
//  L10: the "Recruiting site" menu starts at None; the Prolific choice's
//       hint (L24 checks when it shows) says the Prolific ID in the address is the identifier,
//       the menu's hint that the participant field stays empty, that the link is pasted as
//       the study URL with its placeholders, and names the two columns; the
//       link carries prolific: true and the printed link ends in the three
//       placeholders, and opened as printed it asks for the identifier
//       (the placeholders read as absent); with no site, the link carries no
//       prolific field and no placeholders
//  L11: Prolific chosen beside a filled participant field is refused,
//       naming both, and no link is built
//  L12: the "Completion URL" field puts complete in the link; an http://
//       address is refused through the form page's check, naming the fault,
//       and no link is built
//  L13: with Prolific as the recruiting site, the SQL shown for a Supabase store
//       equals supabase-hitopbr-prolific.sql, and with the random-order box
//       too supabase-hitopbr-prolific-shuffle.sql, byte for byte
//  L14: the "Completion URL after a saved file" field, whose hint says it
//       goes only beside a completion URL and takes the URL of the study's
//       completion code for a saved file, puts completeSaved in the link
//       beside complete; an http:// address is refused naming the field,
//       and the field filled beside an empty completion field is refused,
//       and no link is built either way
//  L15: a pasted descriptor whose items are not in ascending order,
//       reversed or with its last two swapped, is refused with the form
//       page's message, and no link is built
//  L16: link.html?c=<p> fills each control from the config <p> encodes,
//       shows the chosen store kind's field group and hides the other (both
//       for no store), and "Make the link" then builds a link whose c
//       decodes to a config deep-equal to the one opened: once per store
//       choice (none, a web address, a Supabase table), two runs with a
//       participant and one under Prolific with none, every run with a
//       module, the random order and both completion URLs
//  L17: a c carrying only the instrument selects it and leaves every other
//       control as a load with no c leaves it; one carrying the instrument
//       and a module also fills the module textarea with JSON that parses
//       to the descriptor
//  L18: a c that cannot be decoded, one that is not a plain object, and one
//       naming an instrument the select does not offer each write their
//       fault's message, naming the c parameter, into #err and leave every
//       control at its no-c value, over nine values of c, two whose module
//       makes the module box's write throw RangeError among them (one in
//       a link that also holds a completion URL), refused as nested too
//       deeply, and the submit handler still runs; a load with no c leaves
//       #err empty; a c that decodes to 100,001 bytes is refused naming its
//       size and the limit, and one of exactly 100,000 bytes fills the form
//  L19: above the form, the intro asks for the required parts, names
//       "Make the link" and links the online-collection tutorial; the module
//       hint links the Module Builder
//  L20: a c filling any of the four address fields (Web address, Project
//       URL, Completion URL, Completion URL after a saved file) with a string
//       that leaves the field non-empty lists each filled one, after its
//       label name, in a notice between the intro and the form, as the
//       field holds it: each field alone, the most one c can carry once per
//       store kind, and an address over two lines, listed joined; a load
//       with no c, a c filling no address (seven shapes, two an address
//       that is only a line break) and every refused L18 load show no notice
//  L21: markup and an entity in each address show verbatim in the notice,
//       which holds the same elements as for plain addresses and no img
//  L22: "Make the link" empties and hides the notice, on a built link and
//       on the refusal of an empty study
//  L23: after load, focus is on #err for every refused L18 load, on the
//       notice for every L20 load that shows it, and on no element for
//       every L20 silent load; this is focus in Chromium, not what a screen
//       reader speaks
//  L24: the "Recruiting site" menu offers None, Prolific, SONA, CloudResearch
//       Connect and Another site, in that order; each choice shows its own
//       hint (for another site, the "Address parameter" field) and hides
//       the others'; the SONA hint names the id parameter, the
//       id=%SURVEY_CODE% ending and the readable credit token; the Connect
//       hint names participantId; the
//       completion hint says where {participant} goes
//  L25: each choice builds its link: no field and no ending for None;
//       prolific: true and the three placeholders for Prolific;
//       participantParam "id" and the ending &id=%SURVEY_CODE% for SONA;
//       participantParam "participantId" and no ending for Connect; the
//       trimmed typed name and no ending for another site
//  L26: the builder refuses, with the form page's messages under the
//       field's name, an address parameter that is empty, holds a space, is
//       over 64 characters, is c, or is a Prolific name; and SONA or another
//       site beside a filled participant field; no link is built
//  L27: a c parameter selects Prolific for prolific: true, SONA for "id",
//       Connect for "participantId", another site with the field filled for
//       any other name, and None with no field; a participantParam that is
//       not text selects None; each other case round-trips through "Make
//       the link", and the not-text one builds a link without the field
//  L28: the SONA link opened through "Open the link", %SURVEY_CODE%
//       unfilled, shows the start screen's identifier question
//  L29: the Supabase SQL under SONA equals the SQL with no site, with the
//       random-order box clear and checked
//  L30: each completion field refuses, with the form page's messages under
//       the field's name, the {participant} token in the host or the path
//       and another spelling of it after the ? or the #; no link is built
//  L31: the menu is described by the chosen site's hint for Prolific, SONA
//       and Connect, and by none for None and another site
//  L32: another site refuses "id", " id " and "participantId", naming the
//       choice that writes the name; no link is built
//  L33: a participant field prefilled from a c with an unpaired surrogate is
//       refused and no link is built; a participant holding U+1F600
//       round-trips
//  L34: "Make the link" carries disabled and autocomplete="off" in the
//       markup. While a z link's unpacking waits, and while the request
//       for form.js waits, a forced click on the button and Enter in the
//       study name box change no address and start no navigation; once the
//       wait ends, a press shows "Your study link". The button is enabled
//       after a load with no link, a refused link and a filled one
//  L35: the four form.js messages the builder shows from its imports name
//       the online form, not "this page": an unknown instrument in an opened
//       link, a store kind added to the destination menu, a module file of
//       another format, and an instrument export of another format
//  L36: a z link the builder cannot use is refused by name and fills
//       nothing: in a browser with no DecompressionStream, and for text
//       that is not base64url, a stream that unpacks to more than 100,000
//       bytes, bytes that are not UTF-8, text that is not JSON, and JSON
//       that holds no form. The form's elements, the instrument rows and
//       the question list equal those of a load with no link
//  L37: a link of exactly 8,000 characters shows no long-link warning, and
//       one of 8,001 shows it naming the length, as a status a screen reader
//       announces; the line beside "Open the link" writes the length with
//       the same comma; the study name and the participant-parameter name
//       are padded at run time to reach each length
//  L39: form.js answered with HTTP 404, and form.js served with a syntax
//       error, each show the load-failure message, with "Make the link"
//       disabled; with JavaScript off, the noscript message shows; a
//       normal load shows neither
//  L40: while a z link unpacks, typing in the study box and pressing "Add
//       an instrument" change nothing, and the form is marked busy; once
//       it unpacks, the box holds the link's study name and takes typed
//       text
//  L41: a z link whose module is an object holding an array nested 20,000
//       deep is refused by name, with nothing filled and no uncaught error;
//       the test first checks that the browser throws on the module's
//       indented write

import { test, expect } from '@playwright/test';
import { deflateRawSync } from 'node:zlib';
import {
  useTarget, openSectionOf, useStore, allowLocalStore, begin, walkAll, fetchExport, exportUrl, readDescriptor, readFixture, COMPLETE_URL, COMPLETE_SAVED_URL,
  NOT_ASCENDING, NOT_ASCENDING_MESSAGE, notAscendingDescriptor, encodeConfig, encodeCompressed, decodeLinkParam, gotoLong,
  expectHeldInput, expectReleasedInput, deepModuleText, encodeCompressedText, DEEP_MODULE_REFUSAL, expectIndentThrows,
} from './helpers.mjs';

const base = useTarget();
const store = useStore();

// Stated here rather than read from form.js or the exports, so a change to
// either shows up as a failure.
const OFFERED = [
  { value: 'hitopsr', label: 'HiTOP-SR (405 items)', title: 'HiTOP-SR', items: 405 },
  { value: 'hitopsr-module', label: 'HiTOP-SR module (scales you choose)' },
  { value: 'hitopbr', label: 'HiTOP-BR (45 items)', title: 'HiTOP-BR', items: 45 },
  { value: 'pid5', label: 'PID-5 (220 items)', title: 'PID-5', items: 220 },
  { value: 'pid5sf', label: 'PID-5-SF (100 items)', title: 'PID-5-SF', items: 100 },
  { value: 'pid5bf', label: 'PID-5-BF (25 items)', title: 'PID-5-BF', items: 25 },
];

test('the selector offers the five instruments and the HiTOP-SR module, with their item counts', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const options = await page.$$eval('select[name="instrument"] option', (nodes) =>
    nodes.map((n) => ({ value: n.value, label: n.textContent })),
  );
  // L1
  expect(options).toEqual(OFFERED.map(({ value, label }) => ({ value, label })));
});

// The module entry names no form of its own: a module row opens the
// HiTOP-SR, as the module tests below check.
for (const o of OFFERED.filter(({ items }) => items !== undefined)) {
  test(`${o.value}: a built link opens the ${o.title} form`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    await page.locator('select[name="instrument"]').selectOption(o.value);
    await page.locator('input[name="study"]').fill('link');
    await openSectionOf(page, 'participant');
    await page.locator('input[name="participant"]').fill('l1');
    await page.getByRole('button', { name: 'Make the link' }).click();
    const href = await page.locator('#out').textContent();
    expect(href).toMatch(/\?c=/);

    // L2
    await page.goto(href);
    await expect(page.locator('h1')).toHaveText(o.title);
    await expect(page.locator('p.muted')).toContainText(`${o.items} items over `);
  });
}

// Fills the builder for the HiTOP-BR with the web-address kind and a store
// address and presses the button; returns the alert text and the built link
// (empty when refused).
async function build(page, storeUrl) {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await openSectionOf(page, 'participant');
  await page.locator('input[name="participant"]').fill('l4');
  await page.locator('select[name="storeKind"]').selectOption('webhook');
  await page.locator('input[name="store"]').fill(storeUrl);
  await page.getByRole('button', { name: 'Make the link' }).click();
  return { err: await page.locator('#err').textContent(), href: await page.locator('#out').textContent() };
}

// The same with the Supabase kind and its three fields, for an instrument
// and an optional pasted descriptor, the random-order box checked when
// `shuffle` is set; returns the shown SQL too.
async function buildSupabase(page, { instrument = 'hitopbr', module, shuffle = false, prolific = false, url, key, table }) {
  await page.goto(`${base()}link.html`);
  // A module is the HiTOP-SR's, set as a HiTOP-SR module row holding it.
  await page.locator('select[name="instrument"]').selectOption(module ? 'hitopsr-module' : instrument);
  await page.locator('input[name="study"]').fill('link');
  // Prolific as the recruiting site needs the participant field empty.
  await openSectionOf(page, 'participant');
  if (!prolific) await page.locator('input[name="participant"]').fill('l6');
  if (module) await page.locator('textarea[name="module"]').fill(JSON.stringify(module));
  if (shuffle) {
    await openSectionOf(page, 'shuffle');
    await page.locator('input[name="shuffle"]').check();
  }
  if (prolific) await page.locator('select[name="site"]').selectOption('prolific');
  await page.locator('select[name="storeKind"]').selectOption('supabase');
  await page.locator('input[name="supabaseUrl"]').fill(url);
  await page.locator('input[name="supabaseKey"]').fill(key);
  await page.locator('input[name="supabaseTable"]').fill(table);
  await page.getByRole('button', { name: 'Make the link' }).click();
  // The SQL waits on the export fetch; the link and the SQL appear together.
  await expect(page.locator('#err, #out').filter({ hasText: /./ }).first()).toBeVisible();
  return {
    err: await page.locator('#err').textContent(),
    href: await page.locator('#out').textContent(),
    sql: await page.locator('#sql').inputValue(),
    sqlShown: await page.locator('#sqlBlock').isVisible(),
  };
}

function decodeLink(href) {
  const c = new URL(href).searchParams.get('c');
  return JSON.parse(Buffer.from(c, 'base64url').toString('utf8'));
}

// The three placeholders a Prolific link ends in, stated here rather than
// read from form.js.
const PLACEHOLDERS = '&PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}';

// L4: one builder test per builder fault.
const BUILDER_FAULTS = [
  { url: 'http://example.com/hook', names: 'its url must start with https://' },
  { url: 'not a url', names: 'its url is not a web address: "not a url".' },
  { url: 'javascript:alert(1)', names: 'its url must start with https://' },
];

for (const fault of BUILDER_FAULTS) {
  test(`the builder refuses the address ${fault.url}`, async ({ page }) => {
    const { err, href } = await build(page, fault.url);
    expect(err).toContain("Where responses go could not be used: ");
    expect(err).toContain(fault.names);
    expect(href, 'no link is built').toBe('');
  });
}

test('the web-address kind with an empty address is refused, naming the fault', async ({ page }) => {
  const { err, href } = await build(page, '   ');
  expect(err).toContain('its url is not a web address: "".');
  expect(href, 'no link is built').toBe('');
});

test('the file kind builds a link with no store even when the hidden address field is invalid', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await openSectionOf(page, 'participant');
  await page.locator('input[name="participant"]').fill('l4');
  await page.locator('select[name="storeKind"]').selectOption('webhook');
  await page.locator('input[name="store"]').fill('not a url');
  await page.locator('select[name="storeKind"]').selectOption('');
  await expect(page.locator('input[name="store"]')).toBeHidden();
  await page.getByRole('button', { name: 'Make the link' }).click();
  expect(await page.locator('#err').textContent()).toBe('');
  expect(decodeLink(await page.locator('#out').textContent())).toEqual({ instrument: 'hitopbr', study: 'link', participant: 'l4' });
});

// L6: one builder test per Supabase fault (the url, the key, the table).
const SUPABASE_FAULTS = [
  { name: 'an http: project URL', url: 'http://abc.supabase.co', key: 'sb_publishable_x', table: 'responses', names: 'its url must start with https://' },
  { name: 'an empty key', url: 'https://abc.supabase.co', key: '   ', table: 'responses', names: 'its key is empty.' },
  { name: 'a table name with a capital', url: 'https://abc.supabase.co', key: 'sb_publishable_x', table: 'Responses', names: 'its table must be a lower-case name of up to 63 letters, digits and underscores, not starting with a digit, and it is "Responses".' },
  { name: 'a secret key', url: 'https://abc.supabase.co', key: 'sb_secret_x', table: 'responses', names: 'its key is a secret key (sb_secret_…), which must never be in a study link.' },
];

for (const fault of SUPABASE_FAULTS) {
  test(`the builder refuses a Supabase store with ${fault.name}`, async ({ page }) => {
    const { err, href, sqlShown } = await buildSupabase(page, fault);
    expect(err).toContain("Where responses go could not be used: ");
    expect(err).toContain(fault.names);
    expect(href, 'no link is built').toBe('');
    expect(sqlShown, 'no SQL is shown').toBe(false);
  });
}

// A project URL pasted with the dashboard's /rest/v1 path builds a link
// whose store url is the project origin, so the send does not double it.
test('the builder drops a /rest/v1/ suffix from the project URL', async ({ page }) => {
  const { err, href } = await buildSupabase(page, { url: 'https://abc.supabase.co/rest/v1/', key: 'sb_publishable_x', table: 'r' });
  expect(err).toBe('');
  expect(decodeLink(href).store.url).toBe('https://abc.supabase.co');
});

// L7: the SQL shown for a Supabase store equals the hand-written fixture,
// for the HiTOP-BR and for the shuffled module, and the link carries the
// four store fields with the URL in its parsed form.
for (const w of [
  { name: 'the HiTOP-BR', table: 'hitopbr_responses', fixture: 'supabase-hitopbr.sql' },
  { name: 'the shuffled module', module: 'module-shuffled.json', table: 'module_responses', fixture: 'supabase-module-shuffled.sql' },
  { name: 'the HiTOP-BR under shuffle', shuffle: true, table: 'hitopbr_responses', fixture: 'supabase-hitopbr-shuffle.sql' },
  { name: 'the shuffled module under shuffle', shuffle: true, module: 'module-shuffled.json', table: 'module_responses', fixture: 'supabase-module-shuffle.sql' },
]) {
  test(`${w.name}: the shown SQL equals ${w.fixture}`, async ({ page }) => {
    const module = w.module ? await readDescriptor(w.module) : undefined;
    const { err, href, sql, sqlShown } = await buildSupabase(page, {
      instrument: module ? module.instrument : 'hitopbr', module, shuffle: w.shuffle,
      url: 'https://abc.supabase.co', key: 'sb_publishable_x', table: w.table,
    });
    expect(err).toBe('');
    expect(sqlShown).toBe(true);
    expect(sql).toBe(await readFixture(w.fixture));
    expect(decodeLink(href).store).toEqual({
      kind: 'supabase', url: 'https://abc.supabase.co', key: 'sb_publishable_x', table: w.table,
    });
    expect(decodeLink(href).shuffle).toBe(w.shuffle ? true : undefined);
  });
}

// L9: the random-order box. Its hint is checked sentence by sentence; a
// link built with it checked carries shuffle: true and renders a
// rearrangement of the HiTOP-BR's 45 items; one built with it clear carries
// no shuffle field.
test('the random-order box: its label and hint, and the link it builds', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await openSectionOf(page, 'shuffle');
  const box = page.getByRole('checkbox', { name: /Show the items in a random order/ });
  await expect(box).toBeVisible();
  await expect(box).not.toBeChecked();
  const hint = page.locator('label.check', { hasText: 'Show the items in a random order' }).locator('.hint');
  await expect(hint).toContainText("Each participant sees a new order, in place of a module's printed order");
  await expect(hint).toContainText("The responses still list the items in the instrument's order");
  await expect(hint).toContainText('item_order column records the order that participant saw');

  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await openSectionOf(page, 'participant');
  await page.locator('input[name="participant"]').fill('l9');
  await page.getByRole('button', { name: 'Make the link' }).click();
  const plain = await page.locator('#out').textContent();
  expect(decodeLink(plain)).toEqual({ instrument: 'hitopbr', study: 'link', participant: 'l9' });

  await box.check();
  await page.getByRole('button', { name: 'Make the link' }).click();
  const href = await page.locator('#out').textContent();
  expect(decodeLink(href)).toEqual({ instrument: 'hitopbr', study: 'link', participant: 'l9', shuffle: true });

  const exp = await fetchExport('hitopbr');
  const numbers = exp.items.map((it) => it.number);
  await page.goto(href);
  await begin(page);
  const seen = await walkAll(page);
  const shown = seen.map((s) => s.number);
  expect([...shown].sort((a, b) => a - b)).toEqual(numbers);
  expect(shown).not.toEqual(numbers);
  expect(seen.map((s) => s.position)).toEqual(numbers.map((_, i) => i + 1));
});

// L10: Prolific as the recruiting site. Its hint is checked sentence by
// sentence; a link built with it chosen carries prolific: true and the
// placeholders, and opened as printed asks for the identifier; one built
// with no site carries neither.
test('Prolific as the recruiting site: its hint, and the link it builds', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await openSectionOf(page, 'site');
  const box = page.getByRole('combobox', { name: /Recruiting site/ });
  await expect(box).toBeVisible();
  await expect(box).toHaveValue('');
  const hint = page.locator('#prolificHint');
  await expect(hint).toContainText("reads each participant's Prolific ID from the address");
  await expect(page.locator('label:has(select[name="site"]) .hint')).toContainText('Leave the participant field empty');
  await expect(hint).toContainText('Paste the link, placeholders included, as the study URL');
  await expect(hint).toContainText('prolific_study');
  await expect(hint).toContainText('prolific_session');

  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await page.getByRole('button', { name: 'Make the link' }).click();
  const plain = await page.locator('#out').textContent();
  expect(plain.endsWith(PLACEHOLDERS)).toBe(false);
  expect(plain).not.toContain('PROLIFIC_PID');
  expect(decodeLink(plain)).toEqual({ instrument: 'hitopbr', study: 'link' });

  await box.selectOption('prolific');
  await page.getByRole('button', { name: 'Make the link' }).click();
  const href = await page.locator('#out').textContent();
  expect(href.endsWith(PLACEHOLDERS), 'the printed link ends in the placeholders').toBe(true);
  expect(decodeLink(href)).toEqual({ instrument: 'hitopbr', study: 'link', prolific: true });
  await expect(page.locator('#open a')).toHaveAttribute('href', href);

  // Opened as printed, the placeholders are no identifier.
  await page.goto(href);
  await expect(page.locator('h1')).toHaveText('HiTOP-BR');
  await expect(page.locator('input[name="participant"]')).toBeVisible();
});

// L11: Prolific beside a participant.
test('Prolific as the recruiting site beside a filled participant field is refused, naming both', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await openSectionOf(page, 'participant');
  await page.locator('input[name="participant"]').fill('l11');
  await page.locator('select[name="site"]').selectOption('prolific');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err')).toHaveText(
    "The participant field must be empty when recruiting through Prolific: the online form takes each participant's identifier from the Prolific ID in the address.",
  );
  expect(await page.locator('#out').textContent(), 'no link is built').toBe('');
});

// L12: the completion field.
test('the Completion URL field puts complete in the link, and an http:// address is refused', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await openSectionOf(page, 'participant');
  await page.locator('input[name="participant"]').fill('l12');
  await openSectionOf(page, 'complete');
  await page.locator('input[name="complete"]').fill(COMPLETE_URL);
  await page.getByRole('button', { name: 'Make the link' }).click();
  expect(await page.locator('#err').textContent()).toBe('');
  expect(decodeLink(await page.locator('#out').textContent())).toEqual({
    instrument: 'hitopbr', study: 'link', participant: 'l12', complete: COMPLETE_URL,
  });

  // One of the forms the page's own check refuses (guard G11).
  await page.locator('input[name="complete"]').fill('http://localhost');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err')).toHaveText(
    'The completion URL could not be used: it must start with https://, and it is "http://localhost".',
  );
  expect(await page.locator('#out').textContent(), 'no link is built').toBe('');
});

// L14: the saved-file completion field.
test('the Completion URL after a saved file field puts completeSaved in the link, and refuses http:// and an empty completion field', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  // The fuller account of completion codes is in the README section the
  // completion hint links to; S9 in link-sections.spec.js checks the rule
  // this hint keeps.
  const hint = page.locator('label:has(input[name="completeSaved"]) .hint');
  await expect(hint).toContainText('Only beside a completion URL');
  await expect(hint).toContainText("For Prolific, your saved-file code's URL.");

  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await openSectionOf(page, 'participant');
  await page.locator('input[name="participant"]').fill('l14');
  await openSectionOf(page, 'complete');
  await page.locator('input[name="complete"]').fill(COMPLETE_URL);
  await page.locator('input[name="completeSaved"]').fill(COMPLETE_SAVED_URL);
  await page.getByRole('button', { name: 'Make the link' }).click();
  expect(await page.locator('#err').textContent()).toBe('');
  expect(decodeLink(await page.locator('#out').textContent())).toEqual({
    instrument: 'hitopbr', study: 'link', participant: 'l14', complete: COMPLETE_URL, completeSaved: COMPLETE_SAVED_URL,
  });

  // One of the forms the page's own check refuses (guard G12).
  await page.locator('input[name="completeSaved"]').fill('http://localhost');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err')).toHaveText(
    'The completion URL after a saved file could not be used: it must start with https://, and it is "http://localhost".',
  );
  expect(await page.locator('#out').textContent(), 'no link is built').toBe('');

  // Filled beside an empty completion field.
  await page.locator('input[name="completeSaved"]').fill(COMPLETE_SAVED_URL);
  await page.locator('input[name="complete"]').fill('');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err')).toHaveText(
    'The completion URL after a saved file needs a completion URL beside it: give the completion URL first, or leave this field empty.',
  );
  expect(await page.locator('#out').textContent(), 'no link is built').toBe('');
});

// L13: the SQL under Prolific, with and without the random order.
for (const w of [
  { name: 'the HiTOP-BR under Prolific', fixture: 'supabase-hitopbr-prolific.sql' },
  { name: 'the HiTOP-BR under Prolific and shuffle', shuffle: true, fixture: 'supabase-hitopbr-prolific-shuffle.sql' },
]) {
  test(`${w.name}: the shown SQL equals ${w.fixture}`, async ({ page }) => {
    const { err, href, sql, sqlShown } = await buildSupabase(page, {
      shuffle: w.shuffle, prolific: true, url: 'https://abc.supabase.co', key: 'sb_publishable_x', table: 'hitopbr_responses',
    });
    expect(err).toBe('');
    expect(sqlShown).toBe(true);
    expect(sql).toBe(await readFixture(w.fixture));
    const config = decodeLink(href);
    expect(config.prolific).toBe(true);
    expect(config.participant).toBeUndefined();
    expect(config.shuffle).toBe(w.shuffle ? true : undefined);
    expect(href.endsWith(PLACEHOLDERS)).toBe(true);
  });
}

// L8: a refused build on a page that already shows a link and its SQL
// clears both.
test('a refused build clears the link and the SQL of the build before it', async ({ page }) => {
  const good = await buildSupabase(page, { url: 'https://abc.supabase.co', key: 'sb_publishable_x', table: 'responses' });
  expect(good.err).toBe('');
  expect(good.sqlShown).toBe(true);
  await page.locator('input[name="supabaseTable"]').fill('Responses');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err')).toContainText('its table must be a lower-case name');
  expect(await page.locator('#out').textContent()).toBe('');
  await expect(page.locator('#sqlBlock')).toBeHidden();
  expect(await page.locator('#sql').inputValue()).toBe('');
});

// L5
test('a link built with the address set opens a form whose Finish posts to it', async ({ page, context }) => {
  await allowLocalStore(context);
  const exp = await fetchExport('hitopbr');
  const address = store().url('/record');
  const { err, href } = await build(page, address);
  expect(err).toBe('');
  expect(decodeLink(href).store).toEqual({ kind: 'webhook', url: address });

  const from = store().requests.length;
  await page.goto(href);
  await expect(page.locator('p.muted')).toContainText('When you finish, your answers are sent to the study team.');
  await begin(page);
  const seen = await walkAll(page);
  await expect(page.locator('.done')).toHaveText('Your answers were sent to the study team.');
  const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
  expect(sent.map((r) => r.path)).toEqual(['/record']);
  const row = JSON.parse(sent[0].body);
  expect([row.study, row.participant, row.instrument]).toEqual(['link', 'l4', exp.stem]);
  expect(Object.keys(row).slice(5)).toEqual(seen.map((s) => exp.items.find((it) => it.number === s.number).name));
});

// L3: a module is the HiTOP-SR's by its row's menu, so the hint no longer
// says so; it says what to choose, what the form shows, and where to read more.
test('the module hint in a module row names the file sources and links the builder and the README', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopsr-module');
  const hint = page.locator('.instrument-row label:has(textarea[name="module"]) .hint');
  await expect(hint).toHaveText(
    'Choose or paste a module file from the Module Builder or write_module(). The online form shows only its items, in its printed order if any. More on modules.',
  );
  await expect(hint.locator('a')).toHaveCount(2);
  await expect(hint.locator('a[href="https://jmgirard.github.io/hitop-builder/"]')).toHaveText('Module Builder');
  await expect(hint.locator('a[href="https://github.com/jmgirard/hitop-form#a-hitop-sr-module"]')).toHaveText('More on modules');
});

// L15: a pasted descriptor whose items are not in ascending order is refused
// here, at the researcher, with the form page's own message.
for (const entry of NOT_ASCENDING) {
  test(`the builder refuses a descriptor whose items are ${entry.name}`, async ({ page }) => {
    const module = await notAscendingDescriptor(entry);
    await page.goto(`${base()}link.html`);
    await page.locator('select[name="instrument"]').selectOption('hitopsr-module');
    await page.locator('input[name="study"]').fill('link');
    await openSectionOf(page, 'participant');
    await page.locator('input[name="participant"]').fill('l15');
    await page.locator('textarea[name="module"]').fill(JSON.stringify(module));
    await page.getByRole('button', { name: 'Make the link' }).click();
    await expect(page.locator('#err')).toHaveText(NOT_ASCENDING_MESSAGE);
    await expect(page.locator('#out')).toHaveText('');
  });
}

// ---- Opening the builder with a c parameter ------------------------------

// Every control of the builder's form as {name, value}: a checkbox's checked
// state, every other control's value. Read from the form's own elements so a
// control added later is compared too.
function controls(page) {
  return page.$$eval('#f input, #f select, #f textarea', (nodes) =>
    nodes.map((n) => ({ name: n.name, value: n.type === 'checkbox' ? n.checked : n.value })),
  );
}

// The id of the element holding focus, or 'body' when nothing does.
function focused(page) {
  return page.evaluate(() => (document.activeElement === document.body ? 'body' : document.activeElement.id));
}

// Opens link.html with `c` set to the encoding of `config`, or with no c
// when `config` is undefined, or with `c` set verbatim when `raw` is given.
async function openBuilder(page, { config, raw } = {}) {
  const query = raw !== undefined ? `?c=${raw}` : config !== undefined ? `?c=${encodeConfig(config)}` : '';
  await page.goto(`${base()}link.html${query}`);
}

// L16: three configs, one per store choice, each with a module, the random
// order and both completion URLs; the first and third with a participant,
// the second under Prolific with none. Every URL and text value is in the
// form the builder itself writes (trimmed, https://, a project origin with
// no path), so the round trip has nothing to normalise.
const PREFILL_STORES = [
  { name: 'no store, with a participant', participant: 'l16' },
  { name: 'a web address, under Prolific', prolific: true, store: { kind: 'webhook', url: 'https://script.google.com/macros/s/abc/exec' } },
  {
    name: 'a Supabase table, with a participant',
    participant: 'l16s',
    store: { kind: 'supabase', url: 'https://abc.supabase.co', key: 'sb_publishable_x', table: 'prefill_responses' },
  },
];

for (const w of PREFILL_STORES) {
  test(`a c parameter fills the builder and round-trips: ${w.name}`, async ({ page }) => {
    const module = await readDescriptor('module-plain.json');
    const config = { instrument: module.instrument, study: 'prefill', module, shuffle: true, complete: COMPLETE_URL, completeSaved: COMPLETE_SAVED_URL };
    if (w.participant) config.participant = w.participant;
    if (w.prolific) config.prolific = true;
    if (w.store) config.store = w.store;
    await openBuilder(page, { config });
    await expect(page.locator('#err')).toHaveText('');

    // Each control holds its field of the config.
    // A config holding a module fills its HiTOP-SR as a module row.
    await expect(page.locator('select[name="instrument"]')).toHaveValue('hitopsr-module');
    await expect(page.locator('input[name="study"]')).toHaveValue('prefill');
    await expect(page.locator('input[name="participant"]')).toHaveValue(w.participant ?? '');
    await expect(page.locator('input[name="shuffle"]')).toBeChecked();
    await expect(page.locator('select[name="site"]')).toHaveValue(w.prolific ? 'prolific' : '');
    await expect(page.locator('input[name="complete"]')).toHaveValue(COMPLETE_URL);
    await expect(page.locator('input[name="completeSaved"]')).toHaveValue(COMPLETE_SAVED_URL);
    expect(JSON.parse(await page.locator('textarea[name="module"]').inputValue())).toEqual(module);
    const kind = w.store ? w.store.kind : '';
    await expect(page.locator('select[name="storeKind"]')).toHaveValue(kind);
    // The chosen kind's field group shows and any other is hidden.
    await expect(page.locator('#webhookFields')).toBeVisible({ visible: kind === 'webhook' });
    await expect(page.locator('#supabaseFields')).toBeVisible({ visible: kind === 'supabase' });
    if (kind === 'webhook') await expect(page.locator('input[name="store"]')).toHaveValue(w.store.url);
    if (kind === 'supabase') {
      await expect(page.locator('input[name="supabaseUrl"]')).toHaveValue(w.store.url);
      await expect(page.locator('input[name="supabaseKey"]')).toHaveValue(w.store.key);
      await expect(page.locator('input[name="supabaseTable"]')).toHaveValue(w.store.table);
    }

    // The link the filled builder makes carries the config it was opened with.
    await page.getByRole('button', { name: 'Make the link' }).click();
    await expect(page.locator('#err, #out').filter({ hasText: /./ }).first()).toBeVisible();
    expect(await page.locator('#err').textContent()).toBe('');
    const href = await page.locator('#out').textContent();
    expect(href.endsWith(PLACEHOLDERS)).toBe(w.prolific === true);
    expect(decodeLink(href)).toEqual(config);
  });
}

// L17: the instrument alone, against a load with no c.
test('a c carrying only the instrument selects it and leaves every other control at its no-c value', async ({ page }) => {
  await openBuilder(page);
  const plain = await controls(page);
  expect(plain.find((c) => c.name === 'instrument').value, 'the no-c load selects the first instrument').toBe('hitopsr');
  await openBuilder(page, { config: { instrument: 'pid5sf' } });
  await expect(page.locator('#err')).toHaveText('');
  const filled = await controls(page);
  expect(filled.find((c) => c.name === 'instrument').value).toBe('pid5sf');
  expect(filled.filter((c) => c.name !== 'instrument')).toEqual(plain.filter((c) => c.name !== 'instrument'));
});

test('a c carrying the instrument and a module fills the module textarea with the descriptor', async ({ page }) => {
  const module = await readDescriptor('module-shuffled.json');
  await openBuilder(page);
  const plain = await controls(page);
  await openBuilder(page, { config: { instrument: module.instrument, module } });
  await expect(page.locator('#err')).toHaveText('');
  expect(JSON.parse(await page.locator('textarea[name="module"]').inputValue())).toEqual(module);
  const filled = await controls(page);
  const untouched = (c) => c.name !== 'instrument' && c.name !== 'module';
  expect(filled.find((c) => c.name === 'instrument').value).toBe('hitopsr-module');
  expect(filled.filter(untouched)).toEqual(plain.filter(untouched));
});

// L18: nine bad values of c over the three faults, and a load with no c.
// Each bad value writes its fault's message, naming the c parameter, and
// leaves every control as the no-c load leaves it. The eighth and ninth
// pass the three checks and make the module box's indented write throw
// RangeError, the ninth in a link that also holds a completion URL. The
// page writes that text before it fills any field, so it refuses the link
// by name with nothing filled and no address listed, and the script still
// reaches its submit handler. A module nested past some six thousand
// levels throws that way in V8, but its c runs to some 16 KB, past what
// the test server and a page host accept in an address, so the throw is
// provoked by an init script that makes JSON.stringify throw on a marked
// module instead. L41 opens a real one as a z link.
const COULD_NOT_BE_READ = 'could not be read.';
const NOT_A_FORM = 'does not hold a form.';
const TOO_DEEP = 'holds a module nested too deeply for this browser to show.';
const throwOnMarkedModule = () => {
  const stringify = JSON.stringify;
  JSON.stringify = (value, ...rest) => {
    if (value !== null && typeof value === 'object' && value.throwOnStringify === true) {
      throw new RangeError('Maximum call stack size exceeded');
    }
    return stringify(value, ...rest);
  };
};
const BAD_C = [
  { name: 'a string that is not base64url', raw: '%%%not-base64url%%%', message: COULD_NOT_BE_READ },
  { name: 'a base64url string that is not JSON', raw: Buffer.from('not json', 'utf8').toString('base64url'), message: COULD_NOT_BE_READ },
  { name: 'a JSON array', config: [], message: NOT_A_FORM },
  { name: 'JSON null', config: null, message: NOT_A_FORM },
  { name: 'a JSON string', config: 'x', message: NOT_A_FORM },
  { name: 'an instrument the page does not offer', config: { instrument: 'hitophsum' }, message: 'names an instrument the Study Link Builder does not offer: "hitophsum".' },
  // The menu's value for a HiTOP-SR module, which no link carries: a link
  // writes that row as hitopsr.
  { name: 'the menu value of the HiTOP-SR module', config: { instrument: 'hitopsr-module' }, message: 'names an instrument the Study Link Builder does not offer: "hitopsr-module".' },
  {
    name: 'a module that makes JSON.stringify throw RangeError',
    config: { instrument: 'hitopsr', study: 'deep', module: { throwOnStringify: true } },
    message: TOO_DEEP,
    init: throwOnMarkedModule,
  },
  {
    name: 'a module that makes JSON.stringify throw RangeError, in a link that also holds a completion URL',
    config: { instrument: 'hitopsr', study: 'deep', complete: COMPLETE_URL, module: { throwOnStringify: true } },
    message: TOO_DEEP,
    init: throwOnMarkedModule,
  },
];

for (const bad of BAD_C) {
  test(`a c parameter that is ${bad.name} is refused by name and fills nothing`, async ({ page }) => {
    await openBuilder(page);
    const plain = await controls(page);
    if (bad.init) await page.addInitScript(bad.init);
    await openBuilder(page, bad.raw !== undefined ? { raw: bad.raw } : { config: bad.config });
    await expect(page.locator('#err')).toHaveText(`The study link you opened ${bad.message} Fill in the form above to make a new link.`);
    expect(await controls(page)).toEqual(plain);
    // L20: a refused c lists no address, even one the link holds.
    await expect(page.locator('#prefilled')).toBeHidden();
    await expect(page.locator('#prefilled li')).toHaveCount(0);
    // L23: focus is on the refusal.
    expect(await focused(page)).toBe('err');
    // The script reached its submit handler: a press with the study empty
    // is the handler's own refusal, not a native submit that would put every
    // field into the address.
    await page.getByRole('button', { name: 'Make the link' }).click();
    await expect(page.locator('#err')).toHaveText('Give the study a name.');
    expect(new URL(page.url()).searchParams.has('instrument'), 'no native submit').toBe(false);
  });
}

test('a load with no c leaves #err empty', async ({ page }) => {
  await openBuilder(page);
  await expect(page.locator('#err')).toHaveText('');
  await expect(page.locator('#err')).toBeHidden();
});

// The study name pads the config's JSON to `n` bytes, and the c is that
// JSON as base64url, as encodeConfig() writes it.
function paddedC(n) {
  const config = { instrument: 'hitopbr', study: '' };
  const study = 's'.repeat(n - Buffer.byteLength(JSON.stringify(config)));
  const json = JSON.stringify({ ...config, study });
  expect(Buffer.byteLength(json)).toBe(n);
  return { study, c: Buffer.from(json, 'utf8').toString('base64url') };
}

test('a c that decodes to 100,001 bytes is refused naming its size, and one of 100,000 bytes fills the form', async ({ page }) => {
  await openBuilder(page);
  const plain = await controls(page);
  await gotoLong(page, `${base()}link.html?c=${paddedC(100_001).c}`);
  await expect(page.locator('#err')).toHaveText('The study link you opened holds a setup of 100,001 bytes, more than the 100,000 bytes the online form reads. Fill in the form above to make a new link.');
  expect(await controls(page)).toEqual(plain);

  const fits = paddedC(100_000);
  await gotoLong(page, `${base()}link.html?c=${fits.c}`);
  await expect(page.locator('input[name="study"]')).toHaveValue(fits.study);
  await expect(page.locator('#err')).toHaveText('');
});

// L36: what the builder holds, as values: each of the form's elements, the
// instrument rows' menus, and the question list's groups.
function builderValues(page) {
  return page.evaluate(() => ({
    elements: [...document.getElementById('f').elements].map((n) => ({
      tag: n.tagName, name: n.name, value: n.type === 'checkbox' ? n.checked : n.value,
    })),
    rows: [...document.querySelectorAll('#instrumentList select')].map((s) => s.value),
    questions: [...document.getElementById('questionList').children].map((g) => g.querySelector('[name="qName"]')?.value ?? null),
  }));
}

// A z parameter of `bytes` deflated, base64url with no padding.
const zOf = (bytes) => deflateRawSync(Buffer.from(bytes)).toString('base64url');

// L36: the six refusals, each with the words the builder puts between "The
// study link you opened" and "Fill in the form above".
const BAD_Z = [
  {
    name: 'a good stream, in a browser with no DecompressionStream',
    z: encodeCompressed({ instrument: 'hitopbr', study: 'zbad' }),
    init: () => { delete window.DecompressionStream; },
    message: 'could not be read, because this browser cannot unpack it.',
  },
  { name: 'text that is not base64url', z: 'not*base64url', message: 'is not base64url text.' },
  { name: 'a stream that unpacks to more than 100,000 bytes', z: zOf(Buffer.alloc(100_001, 0x20)), message: 'unpacks to more than 100,000 bytes.' },
  { name: 'bytes that are not UTF-8', z: zOf([0x7b, 0xff, 0xfe, 0x7d]), message: 'is not UTF-8 text.' },
  { name: 'text that is not JSON', z: zOf(Buffer.from('not json', 'utf8')), message: 'is not JSON.' },
  { name: 'JSON that holds no form', z: zOf(Buffer.from('[]', 'utf8')), message: 'does not hold a form.' },
];

for (const bad of BAD_Z) {
  test(`L36: a z parameter of ${bad.name} is refused by name and fills nothing`, async ({ page }) => {
    await openBuilder(page);
    const plain = await builderValues(page);
    if (bad.init) await page.addInitScript(bad.init);
    await page.goto(`${base()}link.html?z=${bad.z}`);
    if (bad.init) expect(await page.evaluate(() => typeof window.DecompressionStream)).toBe('undefined');
    await expect(page.locator('#err')).toHaveText(`The study link you opened ${bad.message} Fill in the form above to make a new link.`);
    expect(await builderValues(page)).toEqual(plain);
    await expect(page.locator('#prefilled')).toBeHidden();
  });
}

// L19: the intro above the form asks for the required parts and links
// the tutorial; the module hint links the Module Builder.
test('the intro above the form, the builder link in the module hint, and the tutorial link', async ({ page }) => {
  await openBuilder(page);
  const intro = page.locator('#intro');
  await expect(intro).toContainText('Fill in the required parts');
  await expect(intro).toContainText('press "Make the link"');
  const introBox = await intro.boundingBox();
  const formBox = await page.locator('#f').boundingBox();
  expect(introBox.y + introBox.height, 'the intro sits above the form').toBeLessThanOrEqual(formBox.y);
  const hint = page.locator('label:has(textarea[name="module"]) .hint');
  await expect(hint.locator('a[href="https://jmgirard.github.io/hitop-builder/"]')).toHaveCount(1);
  await expect(intro.locator('a[href="https://jmgirard.github.io/hitop/articles/online-collection.html"]')).toHaveCount(1);
});

// ---- The notice of the addresses a c filled --------------------------------

// Stated here rather than read from link.html, so a change to the notice's
// wording or to a field's label name shows up as a failure.
const NOTICE_TEXT = 'The link you opened filled in these addresses. Check each one.';
const WEB_URL = 'https://script.google.com/macros/s/abc/exec';
const SUPABASE_URL = 'https://abc.supabase.co';

// The notice's lines, or null when it is hidden.
async function noticeLines(page) {
  if (await page.locator('#prefilled').isHidden()) return null;
  return page.locator('#prefilled li').allTextContents();
}

// L20: each of the four address fields filled alone, the most one c can
// carry (both completion URLs and one store address, once per store kind),
// and an address over two lines.
const NOTICE_SHOWN = [
  { name: 'the completion URL alone', fields: { complete: COMPLETE_URL }, lines: [`Completion URL: ${COMPLETE_URL}`] },
  {
    name: 'the completion URL after a saved file alone',
    fields: { completeSaved: COMPLETE_SAVED_URL },
    lines: [`Completion URL after a saved file: ${COMPLETE_SAVED_URL}`],
  },
  { name: 'a web address alone', fields: { store: { kind: 'webhook', url: WEB_URL } }, lines: [`Web address: ${WEB_URL}`] },
  { name: 'a Supabase project URL alone', fields: { store: { kind: 'supabase', url: SUPABASE_URL } }, lines: [`Project URL: ${SUPABASE_URL}`] },
  {
    name: 'both completion URLs and a web address',
    fields: { complete: COMPLETE_URL, completeSaved: COMPLETE_SAVED_URL, store: { kind: 'webhook', url: WEB_URL } },
    lines: [`Completion URL: ${COMPLETE_URL}`, `Completion URL after a saved file: ${COMPLETE_SAVED_URL}`, `Web address: ${WEB_URL}`],
  },
  {
    name: 'both completion URLs and a Supabase project URL',
    fields: {
      complete: COMPLETE_URL,
      completeSaved: COMPLETE_SAVED_URL,
      store: { kind: 'supabase', url: SUPABASE_URL, key: 'sb_publishable_x', table: 'prefill_responses' },
    },
    lines: [`Completion URL: ${COMPLETE_URL}`, `Completion URL after a saved file: ${COMPLETE_SAVED_URL}`, `Project URL: ${SUPABASE_URL}`],
  },
  // A text field drops line breaks from the value it is given, so this
  // address fills the field as one joined string, and the notice lists that.
  {
    name: 'a completion URL written over two lines',
    fields: { complete: 'https://c.test/one\nhttps://c.test/two' },
    lines: ['Completion URL: https://c.test/onehttps://c.test/two'],
    held: { complete: 'https://c.test/onehttps://c.test/two' },
  },
];

for (const w of NOTICE_SHOWN) {
  test(`a c filling ${w.name} lists it in a notice between the intro and the form`, async ({ page }) => {
    await openBuilder(page, { config: { instrument: 'hitopbr', study: 'notice', ...w.fields } });
    await expect(page.locator('#err')).toHaveText('');
    await expect(page.locator('#prefilled')).toBeVisible();
    await expect(page.locator('#prefilled p')).toHaveText(NOTICE_TEXT);
    expect(await noticeLines(page)).toEqual(w.lines);
    for (const [name, value] of Object.entries(w.held ?? {})) {
      await expect(page.locator(`#f [name="${name}"]`)).toHaveValue(value);
    }
    // L23: focus is on the notice.
    expect(await focused(page)).toBe('prefilled');
    const intro = await page.locator('#intro').boundingBox();
    const notice = await page.locator('#prefilled').boundingBox();
    const form = await page.locator('#f').boundingBox();
    expect(intro.y + intro.height, 'the intro sits above the notice').toBeLessThanOrEqual(notice.y);
    expect(notice.y + notice.height, 'the notice sits above the form').toBeLessThanOrEqual(form.y);
  });
}

// L20: loads that fill no address show no notice. The refused loads are
// asserted in L18's loop.
const NOTICE_SILENT = [
  { name: 'no c' },
  { name: 'the instrument only', config: { instrument: 'hitopbr' } },
  { name: 'the instrument and a module', module: 'module-plain.json' },
  { name: 'a Supabase store with a key and a table and no url', config: { instrument: 'hitopbr', store: { kind: 'supabase', key: 'sb_publishable_x', table: 't' } } },
  { name: 'a web store whose url is not a string', config: { instrument: 'hitopbr', store: { kind: 'webhook', url: 123 } } },
  { name: 'empty completion URLs', config: { instrument: 'hitopbr', complete: '', completeSaved: '' } },
  // A text field drops line breaks, so each of these leaves its field empty.
  { name: 'a completion URL that is only a line break', config: { instrument: 'hitopbr', complete: '\n' } },
  { name: 'a web store whose url is only a line break', config: { instrument: 'hitopbr', store: { kind: 'webhook', url: '\r\n' } } },
];

for (const w of NOTICE_SILENT) {
  test(`a load with ${w.name} shows no notice`, async ({ page }) => {
    let config = w.config;
    if (w.module) {
      const module = await readDescriptor(w.module);
      config = { instrument: module.instrument, module };
    }
    await openBuilder(page, config === undefined ? {} : { config });
    await expect(page.locator('#err')).toHaveText('');
    expect(await noticeLines(page)).toBeNull();
    await expect(page.locator('#prefilled li')).toHaveCount(0);
    // L23: nothing takes focus.
    expect(await focused(page)).toBe('body');
  });
}

// L21: markup and an entity in each address show as written. Read as markup,
// the first would add an img to the notice and the second would read "&".
const MARKUP = '"><img src=x>&amp;';
for (const kind of ['webhook', 'supabase']) {
  test(`addresses holding markup show verbatim as text in the notice: ${kind}`, async ({ page }) => {
    const plainFields = (tail) => ({
      complete: `https://c.test/${tail}`,
      completeSaved: `https://s.test/${tail}`,
      store: { kind, url: `https://w.test/${tail}` },
    });
    await openBuilder(page, { config: { instrument: 'hitopbr', ...plainFields('plain') } });
    const plainTags = await page.$$eval('#prefilled *', (nodes) => nodes.map((n) => n.tagName));
    await openBuilder(page, { config: { instrument: 'hitopbr', ...plainFields(MARKUP) } });
    const label = kind === 'webhook' ? 'Web address' : 'Project URL';
    expect(await noticeLines(page)).toEqual([
      `Completion URL: https://c.test/${MARKUP}`,
      `Completion URL after a saved file: https://s.test/${MARKUP}`,
      `${label}: https://w.test/${MARKUP}`,
    ]);
    expect(await page.$$eval('#prefilled *', (nodes) => nodes.map((n) => n.tagName))).toEqual(plainTags);
    await expect(page.locator('#prefilled img')).toHaveCount(0);
  });
}

// L22: "Make the link" empties and hides the notice, on a build and on the
// first refusal.
test('a built link empties and hides the notice', async ({ page }) => {
  await openBuilder(page, { config: { instrument: 'hitopbr', study: 'notice', complete: COMPLETE_URL } });
  await expect(page.locator('#prefilled')).toBeVisible();
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toHaveText('');
  await expect(page.locator('#prefilled')).toBeHidden();
  await expect(page.locator('#prefilled li')).toHaveCount(0);
});

test('a refused build with the study empty empties and hides the notice', async ({ page }) => {
  await openBuilder(page, { config: { instrument: 'hitopbr', complete: COMPLETE_URL } });
  await expect(page.locator('#prefilled')).toBeVisible();
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err')).toHaveText('Give the study a name.');
  await expect(page.locator('#prefilled')).toBeHidden();
  await expect(page.locator('#prefilled li')).toHaveCount(0);
});

// ---- The recruiting site ---------------------------------------------------

// The menu's choices, stated here rather than read from link.html, and the
// element each shows: its hint, or for another site the name field.
const SITE_CHOICES = [
  { value: '', label: 'None', shows: null },
  { value: 'prolific', label: 'Prolific', shows: '#prolificHint' },
  { value: 'sona', label: 'SONA', shows: '#sonaHint' },
  { value: 'connect', label: 'CloudResearch Connect', shows: '#connectHint' },
  { value: 'other', label: 'Another site', shows: '#otherFields' },
];
const SITE_ELEMENTS = SITE_CHOICES.map((c) => c.shows).filter(Boolean);

// Fills the builder for the HiTOP-BR with a site chosen and presses the
// button; returns the alert and the built link.
async function buildSite(page, { site, param, participant = '' }) {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await openSectionOf(page, 'site');
  if (participant !== '') await page.locator('input[name="participant"]').fill(participant);
  await page.locator('select[name="site"]').selectOption(site);
  if (param !== undefined) await page.locator('input[name="participantParam"]').fill(param);
  await page.getByRole('button', { name: 'Make the link' }).click();
  return { err: await page.locator('#err').textContent(), href: await page.locator('#out').textContent() };
}

// The printed link with only the page's own parameter, for a config.
const bare = (href) => `${new URL(href).origin}${new URL(href).pathname}?c=${new URL(href).searchParams.get('c')}`;

// L24: the menu's choices in order, and the one element each shows.
test('the recruiting-site menu offers five choices and shows only the chosen one\'s hint or field', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await openSectionOf(page, 'site');
  const options = await page.$$eval('select[name="site"] option', (nodes) => nodes.map((n) => ({ value: n.value, label: n.textContent })));
  expect(options).toEqual(SITE_CHOICES.map(({ value, label }) => ({ value, label })));
  for (const c of SITE_CHOICES) {
    await page.locator('select[name="site"]').selectOption(c.value);
    for (const sel of SITE_ELEMENTS) await expect(page.locator(sel), `${sel} under ${c.value || 'none'}`).toBeVisible({ visible: sel === c.shows });
  }
  const sona = page.locator('#sonaHint');
  // S9 in link-sections.spec.js checks the XXXX rule and the credit token.
  await expect(sona).toContainText("Paste the link, ending in id=%SURVEY_CODE%, as SONA's Study URL.");
  await expect(page.locator('#connectHint')).toContainText('from the participantId parameter');
  await expect(page.locator('label:has(input[name="complete"]) .hint')).toContainText('{participant} after its ? or # becomes the identifier');
});

// L25: the link each choice builds.
for (const c of [
  { site: '', config: {}, suffix: '' },
  { site: 'prolific', config: { prolific: true }, suffix: PLACEHOLDERS },
  { site: 'sona', config: { participantParam: 'id' }, suffix: '&id=%SURVEY_CODE%' },
  { site: 'connect', config: { participantParam: 'participantId' }, suffix: '' },
  { site: 'other', param: 'workerId', config: { participantParam: 'workerId' }, suffix: '' },
  { site: 'other', param: '  survey.code-1  ', config: { participantParam: 'survey.code-1' }, suffix: '' },
]) {
  test(`the recruiting site ${JSON.stringify(c.site)}${c.param ? ` with ${JSON.stringify(c.param)}` : ''} builds its link`, async ({ page }) => {
    const { err, href } = await buildSite(page, { site: c.site, param: c.param });
    expect(err).toBe('');
    expect(decodeLink(href)).toEqual({ instrument: 'hitopbr', study: 'link', ...c.config });
    expect(href).toBe(bare(href) + c.suffix);
    await expect(page.locator('#open a')).toHaveAttribute('href', href);
  });
}

// L26: the builder's refusals, each through the form page's own check or
// the participant conflict; no link is built.
const LONG_PARAM = 'p'.repeat(65);
for (const c of [
  { site: 'other', param: '', names: 'The address parameter could not be used: it is empty, and it is "".' },
  { site: 'other', param: 'survey code', names: 'The address parameter could not be used: it must hold only the letters A-Z and a-z, digits, "_", "." and "-", and it is "survey code".' },
  { site: 'other', param: LONG_PARAM, names: `The address parameter could not be used: it is longer than 64 characters, and it is "${LONG_PARAM}".` },
  { site: 'other', param: 'c', names: 'The address parameter could not be used: it is "c", the parameter that carries the study link itself.' },
  { site: 'other', param: 'PROLIFIC_PID', names: 'The address parameter could not be used: it is "PROLIFIC_PID", one of Prolific\'s parameters. For a Prolific study choose Prolific as the recruiting site, which also keeps STUDY_ID and SESSION_ID.' },
  { site: 'sona', participant: 'l26', names: 'The participant field must be empty when a recruiting site fills the identifier: the online form takes each participant\'s identifier from the address parameter "id".' },
  { site: 'other', param: 'workerId', participant: 'l26', names: 'The participant field must be empty when a recruiting site fills the identifier: the online form takes each participant\'s identifier from the address parameter "workerId".' },
]) {
  test(`the builder refuses ${c.participant ? `the site ${c.site} beside a participant` : `the address parameter ${JSON.stringify(c.param).slice(0, 30)}`}`, async ({ page }) => {
    const { err, href } = await buildSite(page, c);
    expect(err).toBe(c.names);
    expect(href, 'no link is built').toBe('');
  });
}

// L32: another site refuses the two names the SONA and Connect choices
// write, trimmed first, so a link with either name always reloads as the
// choice that made it; no link is built.
for (const c of [
  { param: 'id', names: 'The address parameter could not be used: "id" is the name SONA fills. For a SONA study choose SONA as the recruiting site.' },
  { param: ' id ', names: 'The address parameter could not be used: "id" is the name SONA fills. For a SONA study choose SONA as the recruiting site.' },
  { param: 'participantId', names: 'The address parameter could not be used: "participantId" is the name CloudResearch Connect fills. For a CloudResearch Connect study choose CloudResearch Connect as the recruiting site.' },
]) {
  test(`another site refuses the address parameter ${JSON.stringify(c.param)}`, async ({ page }) => {
    const { err, href } = await buildSite(page, { site: 'other', param: c.param });
    expect(err).toBe(c.names);
    expect(href, 'no link is built').toBe('');
  });
}

// L33: FormData would write an unpaired surrogate as U+FFFD, so the builder
// refuses a participant field holding one. Only a c can put one
// in: Node's JSON.stringify() writes it as a \u escape, which the page's
// JSON.parse() reads back as the lone code unit. The field is read back
// before the build to show the surrogate is there.
for (const [name, participant] of [['a lone high', 'a\ud800b'], ['a lone low', 'a\udc00b'], ['a low before a high', '\udc00\ud800']]) {
  test(`the builder refuses a participant field holding ${name} surrogate`, async ({ page }) => {
    await openBuilder(page, { config: { instrument: 'hitopbr', study: 'prefill', participant } });
    const held = await page.locator('input[name="participant"]').evaluate((el) => [...el.value].map((ch) => ch.codePointAt(0)));
    expect(held, 'the field holds the surrogate').toEqual([...participant].map((ch) => ch.codePointAt(0)));
    await page.getByRole('button', { name: 'Make the link' }).click();
    expect(await page.locator('#err').textContent()).toBe('The participant field holds a character that cannot be written. Type the identifier again.');
    expect(await page.locator('#out').textContent(), 'no link is built').toBe('');
  });
}

test('the builder keeps a participant holding a paired character', async ({ page }) => {
  const config = { instrument: 'hitopbr', study: 'prefill', participant: 'p\u{1F600}' };
  await openBuilder(page, { config });
  await page.getByRole('button', { name: 'Make the link' }).click();
  expect(await page.locator('#err').textContent()).toBe('');
  expect(decodeLink(await page.locator('#out').textContent())).toEqual(config);
});

// L27: a c parameter selects the site its fields name and round-trips, the
// printed link ending in that site's ending after the c value; a
// participantParam that is not text is skipped and selects none.
for (const c of [
  { name: 'no site', config: {}, site: '', field: '', suffix: '' },
  { name: 'Prolific', config: { prolific: true }, site: 'prolific', field: '', suffix: PLACEHOLDERS },
  { name: 'SONA', config: { participantParam: 'id' }, site: 'sona', field: '', suffix: '&id=%SURVEY_CODE%' },
  { name: 'Connect', config: { participantParam: 'participantId' }, site: 'connect', field: '', suffix: '' },
  { name: 'another site', config: { participantParam: 'workerId' }, site: 'other', field: 'workerId', suffix: '' },
  { name: 'a participantParam that is not text, left out of the rebuilt link', config: { participantParam: 7 }, site: '', field: '', built: {}, suffix: '' },
]) {
  test(`a c parameter selects the recruiting site and rebuilds the link: ${c.name}`, async ({ page }) => {
    const config = { instrument: 'hitopbr', study: 'prefill', ...c.config };
    await openBuilder(page, { config });
    await openSectionOf(page, 'site');
    await expect(page.locator('#err')).toHaveText('');
    await expect(page.locator('select[name="site"]')).toHaveValue(c.site);
    await expect(page.locator('input[name="participantParam"]')).toHaveValue(c.field);
    await expect(page.locator('#otherFields')).toBeVisible({ visible: c.site === 'other' });
    await page.getByRole('button', { name: 'Make the link' }).click();
    expect(await page.locator('#err').textContent()).toBe('');
    const expected = c.built === undefined ? config : { instrument: 'hitopbr', study: 'prefill', ...c.built };
    const printed = await page.locator('#out').textContent();
    expect(decodeLink(printed)).toEqual(expected);
    expect(printed, 'the text after the c value is the site\'s ending').toBe(bare(printed) + c.suffix);
  });
}

// L28: the SONA link opened as printed, %SURVEY_CODE% unfilled, asks for the
// identifier.
test('the SONA link opened as printed shows the start screen\'s identifier question', async ({ page }) => {
  const { href } = await buildSite(page, { site: 'sona' });
  expect(href.endsWith('&id=%SURVEY_CODE%')).toBe(true);
  await page.goto(await page.locator('#open a').getAttribute('href'));
  await expect(page.locator('h1')).toHaveText('HiTOP-BR');
  await expect(page.locator('input[name="participant"]')).toBeVisible();
  await expect(page.locator('input[name="participant"]')).toHaveValue('');
});

// L29: the Supabase SQL under SONA equals the SQL with no site, with the
// random order off and on.
for (const shuffle of [false, true]) {
  test(`the Supabase SQL under SONA equals the SQL with no site${shuffle ? ' under shuffle' : ''}`, async ({ page }) => {
    const sqls = [];
    for (const site of ['sona', '']) {
      await page.goto(`${base()}link.html`);
      await page.locator('select[name="instrument"]').selectOption('hitopbr');
      await page.locator('input[name="study"]').fill('link');
      await openSectionOf(page, 'site');
      if (site === '') await page.locator('input[name="participant"]').fill('l29');
      if (shuffle) {
        await openSectionOf(page, 'shuffle');
        await page.locator('input[name="shuffle"]').check();
      }
      await page.locator('select[name="site"]').selectOption(site);
      await page.locator('select[name="storeKind"]').selectOption('supabase');
      await page.locator('input[name="supabaseUrl"]').fill('https://abc.supabase.co');
      await page.locator('input[name="supabaseKey"]').fill('sb_publishable_x');
      await page.locator('input[name="supabaseTable"]').fill('hitopbr_responses');
      await page.getByRole('button', { name: 'Make the link' }).click();
      await expect(page.locator('#sqlBlock')).toBeVisible();
      expect(await page.locator('#err').textContent()).toBe('');
      sqls.push(await page.locator('#sql').inputValue());
    }
    expect(sqls[0]).toContain('"study" text');
    expect(sqls[0].includes('"item_order" text')).toBe(shuffle);
    expect(sqls[0]).toBe(sqls[1]);
  });
}

// L30: the builder's completion fields refuse a token the page would
// refuse, each under its field's name.
const COMPLETE_FINE = 'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code={participant}';
const FIELD_NAMES = { complete: 'The completion URL', completeSaved: 'The completion URL after a saved file' };
for (const field of ['complete', 'completeSaved']) {
  for (const c of [
    { address: 'https://example.org/{participant}/done', why: (a) => `the {participant} token must stand after the ? or the #, not in the host or the path, and it is ${JSON.stringify(a)}.` },
    { address: 'https://{participant}.example.org/done', why: (a) => `the {participant} token must stand after the ? or the #, not in the host or the path, and it is ${JSON.stringify(a)}.` },
    { address: 'https://example.org/done?code={Participant}', why: (a) => `the {participant} token must be written exactly so, in lower case with one typed brace on each side and no space, and "{Participant}" is another spelling of it. The address is ${JSON.stringify(a)}.` },
    { address: 'https://example.org/done?code=%7Bparticipant%7D', why: (a) => `the {participant} token must be written exactly so, in lower case with one typed brace on each side and no space, and "%7Bparticipant%7D" is another spelling of it. The address is ${JSON.stringify(a)}.` },
    { address: 'https://example.org/done?code={{participant}}', why: (a) => `the {participant} token must be written exactly so, in lower case with one typed brace on each side and no space, and "{{participant}}" is another spelling of it. The address is ${JSON.stringify(a)}.` },
  ]) {
    test(`the builder's ${field} field refuses ${c.address}`, async ({ page }) => {
      await page.goto(`${base()}link.html`);
      await page.locator('select[name="instrument"]').selectOption('hitopbr');
      await page.locator('input[name="study"]').fill('link');
      await openSectionOf(page, 'site');
      await page.locator('select[name="site"]').selectOption('sona');
      await openSectionOf(page, 'complete');
      if (field === 'completeSaved') await page.locator('input[name="complete"]').fill(COMPLETE_FINE);
      await page.locator(`input[name="${field}"]`).fill(c.address);
      await page.getByRole('button', { name: 'Make the link' }).click();
      expect(await page.locator('#err').textContent()).toBe(`${FIELD_NAMES[field]} could not be used: ${c.why(c.address)}`);
      expect(await page.locator('#out').textContent(), 'no link is built').toBe('');
    });
  }
}

// L31: the chosen site's hint describes the menu for a screen reader.
test('the recruiting-site menu is described by the chosen site\'s hint', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await openSectionOf(page, 'site');
  const menu = page.locator('select[name="site"]');
  for (const [site, hint] of [['', null], ['prolific', 'prolificHint'], ['sona', 'sonaHint'], ['connect', 'connectHint'], ['other', null], ['', null]]) {
    await menu.selectOption(site);
    if (hint === null) await expect(menu, `under ${site || 'none'}`).not.toHaveAttribute('aria-describedby');
    else await expect(menu, `under ${site}`).toHaveAttribute('aria-describedby', hint);
  }
  await menu.selectOption('sona');
  await expect(menu).toHaveAccessibleDescription(/Paste the link, ending in id=%SURVEY_CODE%, as SONA's Study URL/);
});

// L34: "Make the link" does nothing until the prefill ends. Before the
// script's submit handler is added, a press would submit the form as HTML
// does, a GET to this page that loses what was typed.
test('"Make the link" carries disabled and autocomplete="off" in the markup', async ({ page }) => {
  const html = await (await page.request.get(`${base()}link.html`)).text();
  const tag = html.match(/<button type="submit"[^>]*>Make the link<\/button>/);
  expect(tag, 'the button is in the markup').not.toBeNull();
  expect(tag[0]).toMatch(/\sdisabled[\s>]/);
  expect(tag[0]).toMatch(/\sautocomplete="off"[\s>]/);
});

// Presses the button with a forced click, since a disabled button is not
// clickable, and Enter in the study name box, then checks that the address
// is still `at` and that no navigation request started. The wait gives a
// submit time to reach the network.
async function pressEarly(page, at, navigations) {
  await page.getByRole('button', { name: 'Make the link' }).click({ force: true });
  await page.locator('input[name="study"]').press('Enter');
  await page.waitForTimeout(500);
  expect(page.url()).toBe(at);
  expect(navigations).toEqual([]);
}

function recordNavigations(page) {
  const navigations = [];
  page.on('request', (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navigations.push(r.url());
  });
  return navigations;
}

test('a press while a z link unpacks does nothing, and a press after it builds', async ({ page }) => {
  // The unpacked bytes are held until releaseUnpack() runs.
  await page.addInitScript(() => {
    const Real = DecompressionStream;
    let release;
    const released = new Promise((r) => { release = r; });
    window.releaseUnpack = release;
    window.DecompressionStream = class {
      constructor(format) {
        const real = new Real(format);
        this.writable = real.writable;
        this.readable = real.readable.pipeThrough(new TransformStream({
          async transform(chunk, c) {
            await released;
            c.enqueue(chunk);
          },
        }));
        window.unpackHeld = true;
      }
    };
  });
  const z = encodeCompressed({ instrument: 'hitopbr', study: 'early press' });
  const at = `${base()}link.html?z=${z}`;
  await page.goto(at, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.unpackHeld === true);
  const navigations = recordNavigations(page);
  await pressEarly(page, at, navigations);

  await page.evaluate(() => window.releaseUnpack());
  await expect(page.locator('input[name="study"]')).toHaveValue('early press');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.getByRole('heading', { name: 'Your study link' })).toBeVisible();
});

test('a press while form.js loads does nothing, and a press after it builds', async ({ page }) => {
  let release;
  const released = new Promise((r) => { release = r; });
  let requested;
  const seen = new Promise((r) => { requested = r; });
  await page.route('**/form.js', async (route) => {
    requested();
    await released;
    await route.continue();
  });
  const at = `${base()}link.html`;
  await page.goto(at, { waitUntil: 'commit' });
  await seen;
  await page.locator('input[name="study"]').fill('early press');
  const navigations = recordNavigations(page);
  await pressEarly(page, at, navigations);

  release();
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.getByRole('heading', { name: 'Your study link' })).toBeVisible();
});

for (const [name, search] of [
  ['no link', ''],
  ['a refused link', '?c=not-a-link'],
  ['a filled link', `?c=${encodeConfig({ instrument: 'hitopbr', study: 'filled' })}`],
]) {
  test(`"Make the link" is enabled after a load with ${name}`, async ({ page }) => {
    await page.goto(`${base()}link.html${search}`);
    await expect(page.getByRole('button', { name: 'Make the link' })).toBeEnabled();
  });
}

// L35: each message is fired on the builder, and its whole text asserted.
test('the form.js messages the builder shows name the online form', async ({ page }) => {
  const err = page.locator('#err');
  const make = page.getByRole('button', { name: 'Make the link' });

  // An opened link that names an unknown instrument.
  await openBuilder(page, { config: { instruments: ['hitopbr', 'pid5x'], study: 'l35' } });
  await expect(err).toHaveText('The study link you opened holds an instruments field that could not be used: entry 2 is "pid5x", an instrument the online form does not know. Fill in the form above to make a new link.');

  // A store kind the menu does not offer, added to it.
  await openBuilder(page);
  await page.locator('input[name="study"]').fill('l35');
  await page.locator('select[name="storeKind"]').evaluate((s) => s.add(new Option('FTP', 'ftp')));
  await page.locator('select[name="storeKind"]').selectOption('ftp');
  await make.click();
  await expect(err).toHaveText('Where responses go could not be used: its kind is "ftp", and the online form knows only "webhook", "supabase".');

  // A module file of another format.
  await openBuilder(page);
  await page.locator('select[name="instrument"]').selectOption('hitopsr-module');
  await page.locator('input[name="study"]').fill('l35');
  const module = { ...(await readDescriptor('module-plain.json')), format: '2.0' };
  await page.locator('textarea[name="module"]').fill(JSON.stringify(module));
  await make.click();
  await expect(err).toHaveText('The module file could not be used: the online form reads format "1.0" and found format "2.0".');

  // An instrument export of another format, read for a Supabase table's SQL.
  const exp = await fetchExport('hitopbr');
  await page.route(exportUrl('hitopbr'), (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ ...exp, format: '2.0' }),
  }));
  const { err: exportErr } = await buildSupabase(page, { url: 'https://abc.supabase.co', key: 'sb_publishable_x', table: 'responses' });
  expect(exportErr).toBe('The online form reads format "1.0" of the instrument export and found format "2.0".');
});

// L37: RFC 9110, section 4.1, recommends support for URIs of at least 8,000
// octets, and a study link is ASCII. The link is ?c=, the base64url of the
// setup's JSON with no padding, so `n` bytes take the length below; a
// length of 4k + 1 has no `n`. The address the page sits at sets the rest,
// and both lengths are reachable when that part leaves 1 or 2 over 4.
const LONG_AT = 8_000;
const b64Length = (n) => Math.floor(n / 3) * 4 + [0, 2, 3][n % 3];

async function buildPadded(page, study, param) {
  if (param !== undefined) await page.locator('input[name="participantParam"]').fill(param);
  await page.locator('input[name="study"]').fill(study);
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toHaveText('');
  return page.locator('#out').textContent();
}

for (const length of [LONG_AT, LONG_AT + 1]) {
  test(`L37: a link of ${length.toLocaleString('en-US')} characters ${length > LONG_AT ? 'shows' : 'shows no'} long-link warning`, async ({ page }) => {
    await openBuilder(page);
    await openSectionOf(page, 'site');
    await page.locator('select[name="site"]').selectOption('other');
    const first = await buildPadded(page, 's', 'p');
    const bytes = Buffer.byteLength(JSON.stringify(decodeLinkParam(first)));
    const rest = first.length - b64Length(bytes);
    const n = Array.from({ length: 12_000 }, (_, k) => k).find((k) => rest + b64Length(k) === length);
    expect(n, `a setup of some size makes a link of ${length} characters`).not.toBeUndefined();
    // The padding the setup needs, up to 63 characters of it in the
    // parameter name, which holds at most 64, and the rest in the study name.
    const pad = n - bytes;
    const param = `p${'x'.repeat(Math.min(63, pad))}`;
    const href = await buildPadded(page, `s${'x'.repeat(pad - Math.min(63, pad))}`, param);
    expect(href.length).toBe(length);
    expect(decodeLinkParam(href).participantParam).toBe(param);
    expect(param).toHaveLength(64);
    await expect(page.locator('#open')).toHaveText(`Open the link (${length.toLocaleString('en-US')} characters)`);
    if (length > LONG_AT) {
      await expect(page.getByRole('status').filter({ hasText: 'This link is' })).toHaveText('This link is 8,001 characters long. Some sites and mail programs cut long links. You can keep the setup in a file you host instead.');
    } else {
      await expect(page.locator('#long')).toBeHidden();
      await expect(page.locator('#long')).toHaveText('');
    }
  });
}

test('L37: the warning goes when a shorter link is made', async ({ page }) => {
  await openBuilder(page);
  // A ?c= of some 8,050 characters: past the warning, within the host's
  // 8,192 (L38).
  await buildPadded(page, 'x'.repeat(6_000));
  await expect(page.locator('#long')).toBeVisible();
  await buildPadded(page, 's');
  await expect(page.locator('#long')).toBeHidden();
  await expect(page.locator('#long')).toHaveText('');
});

// L38: Fastly, which serves GitHub Pages, answers 414 for a URL over 8 KB,
// and on 2026-10-01 GitHub Pages answered 8,192 characters of path and query
// and refused 8,193. The count here is made apart from the builder: the link
// after its origin, with each Prolific placeholder as 24 characters, the
// length Prolific's help gives for the participant ID. Which lengths a ?c= link can reach depends on
// the page's address and the site's ending (L37), so each length is tried
// with no ending, SONA's and Prolific's, and each must be reached by one.
const HOST_AT = 8_192;
const hostCount = (href) => href.slice(new URL(href).origin.length).replace(/\{\{%[A-Z_]+%\}\}/g, 'x'.repeat(24)).length;
const HOST_REFUSED = (n) => `This link is ${n.toLocaleString('en-US')} characters long, longer than the online form's host accepts. Choose "In a file I host" under "Where the setup is kept".`;

// Presses "Make the link" with the study name given, and waits for a link
// or a refusal.
async function press(page, study) {
  await page.locator('input[name="study"]').fill(study);
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out').or(page.locator('#err')).filter({ hasText: /./ })).toHaveCount(1);
}

test('L38: a link counting 8,192 characters after its origin is made, and one counting 8,193 is refused', async ({ page }) => {
  const reached = { [HOST_AT]: [], [HOST_AT + 1]: [] };
  for (const site of ['', 'sona', 'prolific']) {
    await openBuilder(page);
    await openSectionOf(page, 'site');
    await page.locator('select[name="site"]').selectOption(site);
    await press(page, 's');
    const first = await page.locator('#out').textContent();
    const bytes = Buffer.byteLength(JSON.stringify(decodeLinkParam(first)));
    const restCount = hostCount(first) - b64Length(bytes);
    const restLength = first.length - b64Length(bytes);
    for (const target of [HOST_AT, HOST_AT + 1]) {
      const n = Array.from({ length: 12_000 }, (_, k) => k).find((k) => restCount + b64Length(k) === target);
      if (n === undefined) continue;
      reached[target].push(site);
      await press(page, `s${'x'.repeat(n - bytes)}`);
      if (target <= HOST_AT) {
        await expect(page.locator('#err')).toHaveText('');
        const href = await page.locator('#out').textContent();
        expect(hostCount(href), `${site || 'no site'} at ${target}`).toBe(target);
      } else {
        await expect(page.locator('#err')).toHaveText(HOST_REFUSED(restLength + b64Length(n)));
        await expect(page.locator('#result')).toBeHidden();
        await expect(page.locator('#out')).toHaveText('');
      }
    }
  }
  expect(reached[HOST_AT].length, 'some site reaches 8,192').toBeGreaterThan(0);
  expect(reached[HOST_AT + 1].length, 'some site reaches 8,193').toBeGreaterThan(0);
  expect([...reached[HOST_AT], ...reached[HOST_AT + 1]], 'Prolific reaches one length').toContain('prolific');
  expect([...reached[HOST_AT], ...reached[HOST_AT + 1]], 'SONA reaches one length').toContain('sona');
});

// L39: when form.js does not load or does not parse, the builder says so.
// With JavaScript off, a <noscript> message says to turn it on. Each
// message is asserted visible by its whole text, and a normal load shows
// neither.
const LOAD_FAILED = 'The Study Link Builder did not start. Reload the page. If it still does not start, open it in a current version of Chrome, Edge, Firefox or Safari.';
const NO_SCRIPT = 'The Study Link Builder needs JavaScript. Turn on JavaScript in this browser, then reload the page.';
for (const [name, answer] of [
  ['answered with HTTP 404', { status: 404, contentType: 'text/plain', body: 'Not found' }],
  ['served with a syntax error', { status: 200, contentType: 'text/javascript', body: 'export const = ;\n' }],
]) {
  test(`L39: form.js ${name} shows the load-failure message`, async ({ page }) => {
    const served = [];
    await page.route('**/form.js', (route) => {
      served.push(route.request().url());
      return route.fulfill(answer);
    });
    await page.goto(`${base()}link.html`);
    await expect(page.getByText(LOAD_FAILED, { exact: true })).toBeVisible();
    // Shown at load, so focus moves to it rather than resting on its live
    // region's own announcement.
    await expect(page.locator('#loadFail')).toBeFocused();
    expect(served).toHaveLength(1);
    await expect(page.getByRole('button', { name: 'Make the link' })).toBeDisabled();
  });
}

test('L39: with JavaScript off, the noscript message shows', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${base()}link.html`);
  await expect(page.getByText(NO_SCRIPT, { exact: true })).toBeVisible();
  await expect(page.getByText(LOAD_FAILED, { exact: true })).toBeHidden();
  await context.close();
});

test('L39: a normal load shows neither message', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await expect(page.getByRole('button', { name: 'Make the link' })).toBeEnabled();
  // The load event has fired, so the check that shows the message has run.
  await page.waitForFunction(() => document.readyState === 'complete');
  // The message is in the page, hidden, so the check below is not of an
  // absent element.
  await expect(page.getByText(LOAD_FAILED, { exact: true })).toHaveCount(1);
  await expect(page.getByText(LOAD_FAILED, { exact: true })).toBeHidden();
  // With JavaScript on, the browser keeps a <noscript>'s content as text and
  // shows none of it. The element and its message are asserted present
  // first, so the noscript's hidden check is not of an absent element.
  const noscript = page.locator('noscript');
  await expect(noscript).toHaveCount(1);
  expect(await noscript.evaluate((el) => el.textContent)).toContain(NO_SCRIPT);
  await expect(noscript).toBeHidden();
});

// L40: the form takes no input while a z link unpacks. The unpacked bytes
// are held, as in L34, until releaseUnpack() runs.
test('L40: while a z link unpacks, typing and "Add an instrument" change nothing', async ({ page }) => {
  await page.addInitScript(() => {
    const Real = DecompressionStream;
    let release;
    const released = new Promise((r) => { release = r; });
    window.releaseUnpack = release;
    window.DecompressionStream = class {
      constructor(format) {
        const real = new Real(format);
        this.writable = real.writable;
        this.readable = real.readable.pipeThrough(new TransformStream({
          async transform(chunk, c) {
            await released;
            c.enqueue(chunk);
          },
        }));
        window.unpackHeld = true;
      }
    };
  });
  await page.goto(`${base()}link.html?z=${encodeCompressed({ instrument: 'hitopbr', study: 'held link' })}`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.unpackHeld === true);
  await expectHeldInput(page);
  await page.evaluate(() => window.releaseUnpack());
  await expectReleasedInput(page, 'held link');
});

// L41: a z link whose module is nested too deeply for the module box is
// refused by name, with nothing filled and no uncaught error.
test('L41: a z link whose module is nested too deeply to show is refused by name', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base()}link.html?z=${encodeCompressedText(deepModuleText())}`);
  await expectIndentThrows(page);
  await expect(page.locator('#err')).toHaveText(DEEP_MODULE_REFUSAL);
  await expect(page.locator('input[name="study"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Make the link' })).toBeEnabled();
  expect(errors).toEqual([]);
});

// L42: MDN gives Firefox's error for too much recursion as an
// InternalError, not a RangeError, so the indented write can throw one
// there if Firefox's stack runs out. Its depth limit is not tested, and no
// test runs Firefox, so a plant makes the module box's indented write throw
// an error of each name. An InternalError is refused as nested too deeply.
// An error named TypeError is not, and the link "could not be read".
for (const [name, message] of [
  ['InternalError', DEEP_MODULE_REFUSAL],
  ['TypeError', 'The study link you opened could not be read. Fill in the form above to make a new link.'],
]) {
  test(`L42: a module box write that throws ${name} gets its own message`, async ({ page }) => {
    await page.addInitScript((errorName) => {
      const real = JSON.stringify;
      JSON.stringify = function (value, replacer, space) {
        if (space === 2 && value !== null && typeof value === 'object' && 'plant' in value) {
          window.plantThrew = true;
          const e = new Error('too much recursion');
          e.name = errorName;
          throw e;
        }
        return real.apply(this, arguments);
      };
    }, name);
    await page.goto(`${base()}link.html?z=${encodeCompressed({ instrument: 'hitopsr', study: 'plant', module: { plant: true } })}`);
    await expect(page.locator('#err')).toHaveText(message);
    expect(await page.evaluate(() => window.plantThrew)).toBe(true);
    await expect(page.locator('input[name="study"]')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Make the link' })).toBeEnabled();
  });
}
