// The link builder: link.html makes a study link for each instrument.
//
//   L1: the instrument selector offers the five instruments, each with its
//       item count, in this order
//   L2: a link built for each instrument opens that instrument's form, whose
//       heading names the instrument and whose start screen counts its items
//   L3: the module hint limits modules to the HiTOP-SR
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
//       hint says each participant sees a new order, that the file and the
//       table list the items in the instrument's order under their item
//       names, that item_order records the order seen, and that a module's
//       printed order is not followed; checked, the link carries
//       shuffle: true and opens a page that renders a rearrangement;
//       unchecked, the link carries no shuffle field
//  L10: the "Recruiting site" menu starts at None; Prolific chosen shows a
//       hint that says the Prolific ID in the address is the identifier,
//       that the participant field stays empty, that the link is pasted as
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
//       takes the study's completion code for a saved file and that a study
//       holds one code per outcome, puts completeSaved in the link beside
//       complete; an http:// address is refused naming the field, and the
//       field filled beside an empty completion field is refused, and no
//       link is built either way; the Prolific hint says Prolific's
//       URL-parameters option appends the parameters and the page reads the
//       filled value
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
//       control at its no-c value, over eight values of c, two that throw
//       past the three checks among them (one after a completion URL is
//       filled), and the submit handler still runs; a load with no c leaves
//       #err empty
//  L19: above the form, an ordered list of three steps names, in order,
//       choosing the instrument, where the responses go, and making the
//       link; the module hint links the Module Builder and the page links
//       the online-collection tutorial
//  L20: a c filling any of the four address fields (Address, Project URL,
//       Completion URL, Completion URL after a saved file) with a string
//       that leaves the field non-empty lists each filled one, after its
//       label name, in a notice between the steps and the form, as the
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
//       id=%SURVEY_CODE% ending, {participant} in place of XXXX and the
//       readable credit token; the Connect hint names participantId; the
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

import { test, expect } from '@playwright/test';
import {
  useTarget, useStore, allowLocalStore, begin, walkAll, fetchExport, readDescriptor, readFixture, COMPLETE_URL, COMPLETE_SAVED_URL,
  NOT_ASCENDING, NOT_ASCENDING_MESSAGE, notAscendingDescriptor, encodeConfig,
} from './helpers.mjs';

const base = useTarget();
const store = useStore();

// Stated here rather than read from form.js or the exports, so a change to
// either shows up as a failure.
const OFFERED = [
  { value: 'hitopsr', label: 'HiTOP-SR (405 items)', title: 'HiTOP-SR', items: 405 },
  { value: 'hitopbr', label: 'HiTOP-BR (45 items)', title: 'HiTOP-BR', items: 45 },
  { value: 'pid5', label: 'PID-5 (220 items)', title: 'PID-5', items: 220 },
  { value: 'pid5sf', label: 'PID-5-SF (100 items)', title: 'PID-5-SF', items: 100 },
  { value: 'pid5bf', label: 'PID-5-BF (25 items)', title: 'PID-5-BF', items: 25 },
];

test('the selector offers the five instruments with their item counts', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const options = await page.$$eval('select[name="instrument"] option', (nodes) =>
    nodes.map((n) => ({ value: n.value, label: n.textContent })),
  );
  // L1
  expect(options).toEqual(OFFERED.map(({ value, label }) => ({ value, label })));
});

for (const o of OFFERED) {
  test(`${o.value}: a built link opens the ${o.title} form`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    await page.locator('select[name="instrument"]').selectOption(o.value);
    await page.locator('input[name="study"]').fill('link');
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
  await page.locator('select[name="instrument"]').selectOption(instrument);
  await page.locator('input[name="study"]').fill('link');
  // Prolific as the recruiting site needs the participant field empty.
  if (!prolific) await page.locator('input[name="participant"]').fill('l6');
  if (module) await page.locator('textarea[name="module"]').fill(JSON.stringify(module));
  if (shuffle) await page.locator('input[name="shuffle"]').check();
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
    expect(err).toContain("The study link's store could not be used: ");
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
    expect(err).toContain("The study link's store could not be used: ");
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
  const box = page.getByRole('checkbox', { name: /Show the items in a random order/ });
  await expect(box).toBeVisible();
  await expect(box).not.toBeChecked();
  const hint = page.locator('label.check', { hasText: 'Show the items in a random order' }).locator('.hint');
  await expect(hint).toContainText('Each participant sees a new order');
  await expect(hint).toContainText("list the items in the instrument's order under their item names");
  await expect(hint).toContainText('item_order column records the order that participant saw');
  await expect(hint).toContainText("A module's printed order is not followed");

  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
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
  const box = page.getByRole('combobox', { name: /Recruiting site/ });
  await expect(box).toBeVisible();
  await expect(box).toHaveValue('');
  const hint = page.locator('#prolificHint');
  await expect(hint).toBeHidden();
  await box.selectOption('prolific');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText("takes each participant's Prolific ID from the address as their identifier");
  await expect(hint).toContainText('leave the participant field empty');
  await expect(hint).toContainText('Paste the link below, with its three placeholders, as the study URL on Prolific');
  await expect(hint).toContainText('prolific_study');
  await expect(hint).toContainText('prolific_session');

  await box.selectOption('');
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
  await page.locator('input[name="participant"]').fill('l11');
  await page.locator('select[name="site"]').selectOption('prolific');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err')).toHaveText(
    "The participant field must be empty when recruiting through Prolific: the page takes each participant's identifier from the Prolific ID in the address.",
  );
  expect(await page.locator('#out').textContent(), 'no link is built').toBe('');
});

// L12: the completion field.
test('the Completion URL field puts complete in the link, and an http:// address is refused', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await page.locator('input[name="participant"]').fill('l12');
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
  const hint = page.locator('label', { hasText: 'Completion URL after a saved file' }).locator('.hint');
  await expect(hint).toContainText("the study's completion code for a saved file");
  await expect(hint).toContainText('one code per outcome, each with its own ?cc= address');
  const prolificHint = page.locator('#prolificHint');
  await expect(prolificHint).toContainText('"I\'ll use URL parameters" option appends the three parameters to the study URL itself');
  await expect(prolificHint).toContainText('the page then reads the filled value');

  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await page.locator('input[name="participant"]').fill('l14');
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
  await expect(page.locator('p.muted')).toContainText(`sent to the study team at ${new URL(address).host}.`);
  await begin(page);
  const seen = await walkAll(page);
  await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
  const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
  expect(sent.map((r) => r.path)).toEqual(['/record']);
  const row = JSON.parse(sent[0].body);
  expect([row.study, row.participant, row.instrument]).toEqual(['link', 'l4', exp.stem]);
  expect(Object.keys(row).slice(5)).toEqual(seen.map((s) => exp.items.find((it) => it.number === s.number).name));
});

test('the module hint limits modules to the HiTOP-SR', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  // L3
  const hint = page.locator('label', { hasText: 'Module descriptor' }).locator('.hint');
  await expect(hint).toContainText('Optional, HiTOP-SR only.');
});

// L15: a pasted descriptor whose items are not in ascending order is refused
// here, at the researcher, with the form page's own message.
for (const entry of NOT_ASCENDING) {
  test(`the builder refuses a descriptor whose items are ${entry.name}`, async ({ page }) => {
    const module = await notAscendingDescriptor(entry);
    await page.goto(`${base()}link.html`);
    await page.locator('select[name="instrument"]').selectOption(module.instrument);
    await page.locator('input[name="study"]').fill('link');
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
    await expect(page.locator('select[name="instrument"]')).toHaveValue(config.instrument);
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
  expect(filled.find((c) => c.name === 'instrument').value).toBe(module.instrument);
  expect(filled.filter(untouched)).toEqual(plain.filter(untouched));
});

// L18: eight bad values of c over the three faults, and a load with no c.
// Each bad value writes its fault's message, naming the c parameter, and
// leaves every control as the no-c load leaves it. The seventh and eighth
// pass the three checks and make JSON.stringify throw while the module is
// written, the eighth after a completion URL is filled,
// which the page turns into the first message with the form reset, so the
// script still reaches its submit handler. A module nested some six
// thousand deep throws that way in V8, but its c runs to 16 KB, past what
// the test server and a page host accept in an address, so the throw is
// provoked by an init script that makes JSON.stringify throw on a marked
// module instead.
const COULD_NOT_BE_READ = 'could not be read.';
const NOT_A_FORM = 'does not hold a form.';
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
  { name: 'an instrument the page does not offer', config: { instrument: 'hitophsum' }, message: 'names an instrument this page does not offer: "hitophsum".' },
  {
    name: 'a module that makes JSON.stringify throw after the study is filled',
    config: { instrument: 'hitopbr', study: 'deep', module: { throwOnStringify: true } },
    message: COULD_NOT_BE_READ,
    init: throwOnMarkedModule,
  },
  {
    name: 'a module that makes JSON.stringify throw after a completion URL is filled',
    config: { instrument: 'hitopbr', study: 'deep', complete: COMPLETE_URL, module: { throwOnStringify: true } },
    message: COULD_NOT_BE_READ,
    init: throwOnMarkedModule,
  },
];

for (const bad of BAD_C) {
  test(`a c parameter that is ${bad.name} is refused by name and fills nothing`, async ({ page }) => {
    await openBuilder(page);
    const plain = await controls(page);
    if (bad.init) await page.addInitScript(bad.init);
    await openBuilder(page, bad.raw !== undefined ? { raw: bad.raw } : { config: bad.config });
    await expect(page.locator('#err')).toHaveText(`The link's c parameter ${bad.message} Fill in the form above to make a new link.`);
    expect(await controls(page)).toEqual(plain);
    // L20: a refused c lists no address, even one filled before a throw.
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

// L19: the three steps above the form and the two links.
test('the three steps above the form, the builder link in the module hint, and the tutorial link', async ({ page }) => {
  await openBuilder(page);
  const items = page.locator('main ol li');
  await expect(items).toHaveCount(3);
  const texts = await items.allTextContents();
  expect(texts[0]).toContain('Choose the instrument');
  expect(texts[1]).toContain('where the responses go');
  expect(texts[2]).toContain('Make the link');
  const list = page.locator('main ol');
  const form = page.locator('#f');
  const listBox = await list.boundingBox();
  const formBox = await form.boundingBox();
  expect(listBox.y + listBox.height, 'the list sits above the form').toBeLessThanOrEqual(formBox.y);
  const hint = page.locator('label', { hasText: 'Module descriptor' }).locator('.hint');
  await expect(hint.locator('a[href="https://jmgirard.github.io/hitop-builder/"]')).toHaveCount(1);
  await expect(page.locator('a[href="https://jmgirard.github.io/hitop/articles/online-collection.html"]')).toHaveCount(1);
});

// ---- The notice of the addresses a c filled --------------------------------

// Stated here rather than read from link.html, so a change to the notice's
// wording or to a field's label name shows up as a failure.
const NOTICE_TEXT = 'The link you opened filled in these addresses. Check each one before you make a link.';
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
  { name: 'a web address alone', fields: { store: { kind: 'webhook', url: WEB_URL } }, lines: [`Address: ${WEB_URL}`] },
  { name: 'a Supabase project URL alone', fields: { store: { kind: 'supabase', url: SUPABASE_URL } }, lines: [`Project URL: ${SUPABASE_URL}`] },
  {
    name: 'both completion URLs and a web address',
    fields: { complete: COMPLETE_URL, completeSaved: COMPLETE_SAVED_URL, store: { kind: 'webhook', url: WEB_URL } },
    lines: [`Completion URL: ${COMPLETE_URL}`, `Completion URL after a saved file: ${COMPLETE_SAVED_URL}`, `Address: ${WEB_URL}`],
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
  test(`a c filling ${w.name} lists it in a notice between the steps and the form`, async ({ page }) => {
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
    const list = await page.locator('main ol.steps').boundingBox();
    const notice = await page.locator('#prefilled').boundingBox();
    const form = await page.locator('#f').boundingBox();
    expect(list.y + list.height, 'the steps sit above the notice').toBeLessThanOrEqual(notice.y);
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
    const label = kind === 'webhook' ? 'Address' : 'Project URL';
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
  const options = await page.$$eval('select[name="site"] option', (nodes) => nodes.map((n) => ({ value: n.value, label: n.textContent })));
  expect(options).toEqual(SITE_CHOICES.map(({ value, label }) => ({ value, label })));
  for (const c of SITE_CHOICES) {
    await page.locator('select[name="site"]').selectOption(c.value);
    for (const sel of SITE_ELEMENTS) await expect(page.locator(sel), `${sel} under ${c.value || 'none'}`).toBeVisible({ visible: sel === c.shows });
  }
  const sona = page.locator('#sonaHint');
  await expect(sona).toContainText("takes each participant's SONA survey code from the id parameter of the address as their identifier");
  await expect(sona).toContainText('The link below ends in id=%SURVEY_CODE%');
  await expect(sona).toContainText('with {participant} in place of its XXXX');
  await expect(sona).toContainText('a participant can read it in the study link');
  await expect(page.locator('#connectHint')).toContainText('from the participantId parameter of the address');
  await expect(page.locator('label', { hasText: 'Completion URL' }).first().locator('.hint')).toContainText('write {participant} after its ? or #');
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
  { site: 'other', param: 'PROLIFIC_PID', names: 'The address parameter could not be used: it is "PROLIFIC_PID", one of Prolific\'s parameters. For a Prolific study use prolific: true, which also keeps STUDY_ID and SESSION_ID.' },
  { site: 'sona', participant: 'l26', names: 'The participant field must be empty when a recruiting site fills the identifier: the page takes each participant\'s identifier from the address parameter "id".' },
  { site: 'other', param: 'workerId', participant: 'l26', names: 'The participant field must be empty when a recruiting site fills the identifier: the page takes each participant\'s identifier from the address parameter "workerId".' },
]) {
  test(`the builder refuses ${c.participant ? `the site ${c.site} beside a participant` : `the address parameter ${JSON.stringify(c.param).slice(0, 30)}`}`, async ({ page }) => {
    const { err, href } = await buildSite(page, c);
    expect(err).toBe(c.names);
    expect(href, 'no link is built').toBe('');
  });
}

// L27: a c parameter selects the site its fields name and round-trips; a
// participantParam that is not text is skipped and selects none.
for (const c of [
  { name: 'no site', config: {}, site: '', field: '' },
  { name: 'Prolific', config: { prolific: true }, site: 'prolific', field: '' },
  { name: 'SONA', config: { participantParam: 'id' }, site: 'sona', field: '' },
  { name: 'Connect', config: { participantParam: 'participantId' }, site: 'connect', field: '' },
  { name: 'another site', config: { participantParam: 'workerId' }, site: 'other', field: 'workerId' },
  { name: 'a participantParam that is not text, left out of the rebuilt link', config: { participantParam: 7 }, site: '', field: '', built: {} },
]) {
  test(`a c parameter selects the recruiting site and rebuilds the link: ${c.name}`, async ({ page }) => {
    const config = { instrument: 'hitopbr', study: 'prefill', ...c.config };
    await openBuilder(page, { config });
    await expect(page.locator('#err')).toHaveText('');
    await expect(page.locator('select[name="site"]')).toHaveValue(c.site);
    await expect(page.locator('input[name="participantParam"]')).toHaveValue(c.field);
    await expect(page.locator('#otherFields')).toBeVisible({ visible: c.site === 'other' });
    await page.getByRole('button', { name: 'Make the link' }).click();
    expect(await page.locator('#err').textContent()).toBe('');
    const expected = c.built === undefined ? config : { instrument: 'hitopbr', study: 'prefill', ...c.built };
    expect(decodeLink(await page.locator('#out').textContent())).toEqual(expected);
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
      if (site === '') await page.locator('input[name="participant"]').fill('l29');
      if (shuffle) await page.locator('input[name="shuffle"]').check();
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
