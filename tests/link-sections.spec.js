// The Study Link Builder's layout: the required parts first, then the five
// optional sections, each a closed <details>.
//
//   S1: with no address parameters, the form's top-level parts come in this
//       order: instruments, study name, where responses go, the five
//       optional sections by name, and "Make the link". Each section is a
//       closed <details> whose summary reads "Not used"
//   S2: a section's summary lists the labels of its fields that hold a
//       value, joined by ", ", and reads "Not used" again once they are
//       emptied
//   S3: one refusal in each section, made with the section closed, opens
//       the section and moves focus to the refused field
//   S4: at 375px and 1280px wide, with every section open, no element is
//       wider than the page or reaches past its right edge
//   S5: a study link that sets one optional field opens the section that
//       holds it, whose summary lists the field's label; the other sections
//       stay closed. A link that sets no optional field leaves every
//       section closed
//   S6: on the instrument rows and the question groups, Move up is disabled
//       on the first and Move down on the last; a single instrument row has
//       all three buttons disabled; each button's accessible name begins
//       with its visible text. Checked for 1, 2 and 3 rows and groups as
//       added, and again after a move, a removal, a prefill from a study
//       link and a questions file load
//   S7: after a build, a region headed "Your study link" (the heading
//       focused) shows the link in a box that scrolls, "Copy the link"
//       beside the box, and below it one next-step sentence for the site
//       and the destination chosen: for each recruiting-site choice and
//       each where-responses-go choice. A z link over 5,000 characters
//       keeps the box under 16rem high
//   S8: with every section open and one question of each type, under each
//       recruiting-site choice, each where-responses-go choice and after a
//       Supabase build: every .hint and .site-hint, shown or not, holds at
//       most 40 words; the intro (all text between the h1 and the first
//       form part) holds at most 60; the page's text, placeholders and
//       aria-labels hold none of the retired terms, the built link exempt
//   S9: the short hints keep the facts a researcher acts on: the intro says
//       an opened study link reaches the host's logs; the Prolific hint says
//       a doubled parameter reads its filled value; the SONA hint gives the
//       XXXX rule and says the credit token is readable in the study link;
//       the declined-text hint gives both fixed sentences; the decline
//       address takes {participant}; the saved-file address leaves the
//       completion URL in force when responses arrive
//  S10: with "Another site" chosen and one question of each type, 50
//       characters typed into each text input and box in the sections
//       make no cloneNode() call, and each summary lists its filled
//       fields; the body of labelText() holds no copying method
//  S11: when a setup step after the prefill throws, the message says the
//       link was not read, every summary reads "Not used", every section
//       is closed, no site hint or destination block shows, and a build
//       with the study name filled shows "Your study link"

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { useTarget, encodeConfig, encodeCompressed, readDescriptor, ROOT, EXPORT_BASE } from './helpers.mjs';

const base = useTarget();

// Stated here rather than read from link.html, so a renamed section or
// label shows up as a failure.
const SECTIONS = [
  { id: 'secParticipants', name: 'Participants and recruiting site' },
  { id: 'secOrder', name: 'Item order and HiTOP-SR module' },
  { id: 'secConsent', name: 'Consent' },
  { id: 'secFinish', name: 'When the participant finishes' },
  { id: 'secQuestions', name: 'Your own questions' },
];
const COMPLETE = 'https://app.prolific.com/submissions/complete?cc=AAAA';

const section = (page, id) => page.locator(`#${id}`);
const state = (page, id) => page.locator(`#${id} > summary .sec-state`);
const make = (page) => page.getByRole('button', { name: 'Make the link' });

async function isOpen(page, id) {
  return section(page, id).evaluate((d) => d.open);
}

// Opens a section by its summary, as a researcher does.
async function openSection(page, id) {
  if (!(await isOpen(page, id))) await section(page, id).locator('> summary').click();
  expect(await isOpen(page, id)).toBe(true);
}

async function closeSection(page, id) {
  if (await isOpen(page, id)) await section(page, id).locator('> summary').click();
  expect(await isOpen(page, id)).toBe(false);
}

// S1
test('the required parts come first, then the five closed sections, then the button', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const parts = await page.evaluate(() => {
    const f = document.getElementById('f');
    // The form's top-level children that hold a control or are a section,
    // named by what they hold.
    return [...f.children].map((node) => {
      if (node.id === 'instrumentsBlock') return 'instruments';
      if (node.querySelector?.('[name="study"]')) return 'study';
      if (node.querySelector?.('[name="storeKind"]')) return 'where responses go';
      if (node.matches('details')) return `section: ${node.querySelector('summary .sec-name').textContent}`;
      if (node.querySelector?.('button[type="submit"]')) return 'make';
      return null;
    }).filter((x) => x !== null);
  });
  expect(parts).toEqual([
    'instruments', 'study', 'where responses go',
    ...SECTIONS.map((s) => `section: ${s.name}`),
    'make',
  ]);
  for (const s of SECTIONS) {
    expect(await isOpen(page, s.id), `${s.name} starts closed`).toBe(false);
    await expect(state(page, s.id)).toHaveText('Not used');
  }
  await expect(page.locator('#destBlock legend')).toHaveText('Where responses go');
  await expect(page.locator('label:has(input[name="study"])')).toContainText('Study name');
});

// S2: each section filled field by field, with the labels its summary lists
// after each step, then emptied.
test('a summary lists the labels of the fields that hold a value', async ({ page }) => {
  await page.goto(`${base()}link.html`);

  await openSection(page, 'secParticipants');
  await page.locator('input[name="participant"]').fill('p1');
  await expect(state(page, 'secParticipants')).toHaveText('Participant');
  await page.locator('input[name="participant"]').fill('');
  await page.locator('select[name="site"]').selectOption('other');
  await expect(state(page, 'secParticipants')).toHaveText('Recruiting site');
  await page.locator('input[name="participantParam"]').fill('workerId');
  await expect(state(page, 'secParticipants')).toHaveText('Recruiting site, Address parameter');
  // A hidden field is not listed, even while it holds text.
  await page.locator('select[name="site"]').selectOption('sona');
  await expect(state(page, 'secParticipants')).toHaveText('Recruiting site');
  await page.locator('select[name="site"]').selectOption('');
  await expect(state(page, 'secParticipants')).toHaveText('Not used');

  await openSection(page, 'secOrder');
  await page.locator('textarea[name="module"]').fill('{}');
  await page.locator('input[name="shuffle"]').check();
  await expect(state(page, 'secOrder')).toHaveText('Module file, Show the items in a random order');
  await page.locator('textarea[name="module"]').fill('   ');
  await expect(state(page, 'secOrder')).toHaveText('Show the items in a random order');
  await page.locator('input[name="shuffle"]').uncheck();
  await expect(state(page, 'secOrder')).toHaveText('Not used');

  await openSection(page, 'secConsent');
  await page.locator('textarea[name="consentText"]').fill('I agree.');
  await page.locator('textarea[name="declinedText"]').fill('Bye.');
  await page.locator('input[name="completeDeclined"]').fill(COMPLETE);
  await expect(state(page, 'secConsent')).toHaveText('Consent text, Declined text, Completion URL after a decline');
  for (const name of ['consentText', 'declinedText']) await page.locator(`textarea[name="${name}"]`).fill('');
  await page.locator('input[name="completeDeclined"]').fill('');
  await expect(state(page, 'secConsent')).toHaveText('Not used');
  // A box of white space alone is listed, as "Make the link" refuses it
  // rather than leaving it out.
  await page.locator('textarea[name="declinedText"]').fill('\n');
  await expect(state(page, 'secConsent')).toHaveText('Declined text');
  await page.locator('textarea[name="declinedText"]').fill('');

  await openSection(page, 'secFinish');
  await page.locator('input[name="complete"]').fill(COMPLETE);
  await page.locator('input[name="completeSaved"]').fill(COMPLETE);
  await expect(state(page, 'secFinish')).toHaveText('Completion URL, Completion URL after a saved file');
  await page.locator('input[name="complete"]').fill('');
  await expect(state(page, 'secFinish')).toHaveText('Completion URL after a saved file');
  await page.locator('input[name="completeSaved"]').fill('');
  await expect(state(page, 'secFinish')).toHaveText('Not used');

  await openSection(page, 'secQuestions');
  await page.getByRole('button', { name: 'Add a question' }).click();
  await page.getByRole('button', { name: 'Add a question' }).click();
  await expect(state(page, 'secQuestions')).toHaveText('Question 1, Question 2');
  await page.getByRole('button', { name: 'Remove question 1' }).click();
  await expect(state(page, 'secQuestions')).toHaveText('Question 1');
  await page.getByRole('button', { name: 'Remove question 1' }).click();
  await expect(state(page, 'secQuestions')).toHaveText('Not used');
  // A closed section's summary still shows what it holds.
  await page.getByRole('button', { name: 'Add a question' }).click();
  await closeSection(page, 'secQuestions');
  await expect(state(page, 'secQuestions')).toHaveText('Question 1');
});

// S3: one refusal per section. Each fills the section open, closes it, and
// presses "Make the link". The message is the one the field's own check
// gives, so the test also shows the refusal is the one it is about.
const REFUSALS = [
  {
    id: 'secParticipants',
    fill: async (page) => {
      await page.locator('input[name="participant"]').fill('p1');
      await page.locator('select[name="site"]').selectOption('prolific');
    },
    field: 'input[name="participant"]',
    message: /^The participant field must be empty when recruiting through Prolific/,
  },
  {
    id: 'secOrder',
    fill: (page) => page.locator('textarea[name="module"]').fill('not json'),
    field: 'textarea[name="module"]',
    message: /is not JSON\.$/,
  },
  {
    id: 'secConsent',
    fill: (page) => page.locator('textarea[name="declinedText"]').fill('Bye.'),
    field: 'textarea[name="declinedText"]',
    message: /^The declined text needs consent text beside it/,
  },
  {
    id: 'secFinish',
    fill: (page) => page.locator('input[name="complete"]').fill('http://example.org/done'),
    field: 'input[name="complete"]',
    message: /^The completion URL could not be used: it must start with https:\/\//,
  },
  {
    id: 'secQuestions',
    fill: async (page) => {
      await page.getByRole('button', { name: 'Add a question' }).click();
      await page.getByRole('button', { name: 'Add a question' }).click();
      await page.locator('input[name="qName"]').nth(0).fill('age');
      await page.locator('input[name="qText"]').nth(0).fill('How old are you?');
      await page.locator('input[name="qName"]').nth(1).fill('mood');
    },
    // The second question has a name and no text.
    field: '#questionList fieldset:nth-child(2) input[name="qText"]',
    message: /^The questions could not be used: question 2: it has no text\.$/,
  },
];

for (const r of REFUSALS) {
  test(`a refusal in ${r.id} opens the section and focuses the field`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    await page.locator('input[name="study"]').fill('sections');
    await openSection(page, r.id);
    await r.fill(page);
    await closeSection(page, r.id);
    await make(page).click();
    await expect(page.locator('#err')).toHaveText(r.message);
    expect(await isOpen(page, r.id)).toBe(true);
    await expect(page.locator(r.field)).toBeFocused();
    for (const other of SECTIONS.filter((s) => s.id !== r.id)) {
      expect(await isOpen(page, other.id), `${other.id} stays closed`).toBe(false);
    }
  });
}

// S3: a Supabase refusal focuses the field it names, even when the project
// URL it quotes holds the word "table" or "key".
for (const probe of [
  { name: 'a project URL holding "table"', url: 'https://supabase.com/dashboard/project/x/editor/table', key: 'sb_publishable_x', table: 'responses', field: 'supabaseUrl', message: /^Where responses go could not be used: its url/ },
  { name: 'a project URL holding "key"', url: 'http://example.org/key', key: 'sb_publishable_x', table: 'responses', field: 'supabaseUrl', message: /^Where responses go could not be used: its url/ },
  { name: 'an empty key', url: 'https://abcdefghijkl.supabase.co', key: ' ', table: 'responses', field: 'supabaseKey', message: /^Where responses go could not be used: (it names no key|its key is empty)\.$/ },
  { name: 'a bad table name', url: 'https://abcdefghijkl.supabase.co', key: 'sb_publishable_x', table: 'Responses', field: 'supabaseTable', message: /^Where responses go could not be used: its table/ },
  { name: 'a project URL quoting ": its table"', url: 'abc: its table', key: 'sb_publishable_x', table: 'responses', field: 'supabaseUrl', message: /^Where responses go could not be used: its url/ },
  { name: 'a project URL quoting ": it names no key"', url: 'abc: it names no key', key: 'sb_publishable_x', table: 'responses', field: 'supabaseUrl', message: /^Where responses go could not be used: its url/ },
]) {
  test(`a Supabase refusal for ${probe.name} focuses ${probe.field}`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    await page.locator('input[name="study"]').fill('sections');
    await page.locator('select[name="storeKind"]').selectOption('supabase');
    await page.locator('input[name="supabaseUrl"]').fill(probe.url);
    await page.locator('input[name="supabaseKey"]').fill(probe.key);
    await page.locator('input[name="supabaseTable"]').fill(probe.table);
    await make(page).click();
    await expect(page.locator('#err')).toHaveText(probe.message);
    await expect(page.locator(`input[name="${probe.field}"]`)).toBeFocused();
  });
}

// S4
for (const width of [375, 1280]) {
  test(`at ${width}px wide with every section open, nothing is wider than the page`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base()}link.html`);
    for (const s of SECTIONS) await openSection(page, s.id);
    await page.getByRole('button', { name: 'Add a question' }).click();
    await page.locator('select[name="qType"]').selectOption('number');
    const over = await page.evaluate(() => {
      const edge = document.documentElement.clientWidth;
      return [...document.querySelectorAll('body *')]
        .filter((n) => n.getClientRects().length > 0)
        .filter((n) => {
          const r = n.getBoundingClientRect();
          return r.width > edge + 0.5 || r.right > edge + 0.5;
        })
        .map((n) => `${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ''}${n.className ? `.${n.className}` : ''}`);
    });
    expect(over).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

// S5: one optional field per link, each with the section it opens and the
// labels that section's summary then lists. The consent fields and the
// questions travel in a z link, the rest in a c link.
const ONE_FIELD = [
  { name: 'participant', patch: { participant: 'p1' }, id: 'secParticipants', labels: 'Participant' },
  { name: 'prolific', patch: { prolific: true }, id: 'secParticipants', labels: 'Recruiting site' },
  { name: 'participantParam of SONA', patch: { participantParam: 'id' }, id: 'secParticipants', labels: 'Recruiting site' },
  { name: 'participantParam of another site', patch: { participantParam: 'workerId' }, id: 'secParticipants', labels: 'Recruiting site, Address parameter' },
  { name: 'module', patch: 'module', id: 'secOrder', labels: 'Module file' },
  { name: 'shuffle', patch: { shuffle: true }, id: 'secOrder', labels: 'Show the items in a random order' },
  { name: 'consent text', patch: { consent: { text: 'I agree.' } }, z: true, id: 'secConsent', labels: 'Consent text' },
  { name: 'declined text', patch: { consent: { declined: 'Bye.' } }, z: true, id: 'secConsent', labels: 'Declined text' },
  { name: 'completeDeclined', patch: { completeDeclined: COMPLETE }, z: true, id: 'secConsent', labels: 'Completion URL after a decline' },
  { name: 'complete', patch: { complete: COMPLETE }, id: 'secFinish', labels: 'Completion URL' },
  { name: 'completeSaved', patch: { completeSaved: COMPLETE }, id: 'secFinish', labels: 'Completion URL after a saved file' },
  {
    name: 'questions',
    patch: { questions: { before: [{ name: 'age', text: 'How old are you?', type: 'number' }] } },
    z: true,
    id: 'secQuestions',
    labels: 'Question 1',
  },
];

for (const one of ONE_FIELD) {
  test(`a link setting only ${one.name} opens ${one.id} alone`, async ({ page }) => {
    const patch = one.patch === 'module' ? { module: await readDescriptor('module-plain.json') } : one.patch;
    const config = { instrument: 'hitopsr', study: 'sections', ...patch };
    const query = one.z ? `?z=${encodeCompressed(config)}` : `?c=${encodeConfig(config)}`;
    await page.goto(`${base()}link.html${query}`);
    await expect(page.locator('#err')).toHaveText('');
    await expect(state(page, one.id)).toHaveText(one.labels);
    for (const s of SECTIONS) {
      expect(await isOpen(page, s.id), `${s.id} open`).toBe(s.id === one.id);
      if (s.id !== one.id) await expect(state(page, s.id)).toHaveText('Not used');
    }
  });
}

// S6: the expected state of every button in a list of n rows or groups,
// stated from the rule, not read from the page.
const LISTS = {
  instrument: { rows: '#instrumentList .instrument-row', singleRemove: true },
  question: { rows: '#questionList fieldset.question-edit', singleRemove: false },
};

async function expectButtons(page, kind, n) {
  const rows = page.locator(LISTS[kind].rows);
  await expect(rows).toHaveCount(n);
  for (let k = 0; k < n; k++) {
    const row = rows.nth(k);
    const expected = {
      up: k === 0,
      down: k === n - 1,
      remove: n === 1 && LISTS[kind].singleRemove,
    };
    for (const [cls, text] of [['up', 'Move up'], ['down', 'Move down'], ['remove', 'Remove']]) {
      const b = row.locator(`.moves button.${cls}`);
      await expect(b).toHaveText(text);
      if (expected[cls]) await expect(b, `${kind} ${k + 1} ${text} disabled`).toBeDisabled();
      else await expect(b, `${kind} ${k + 1} ${text} enabled`).toBeEnabled();
      await expect(b).toHaveAccessibleName(`${text} ${kind} ${k + 1}`);
    }
  }
}

test('instrument rows: button states as rows are added, moved, removed and prefilled', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await expectButtons(page, 'instrument', 1);
  const add = page.getByRole('button', { name: 'Add an instrument' });
  await add.click();
  await expectButtons(page, 'instrument', 2);
  await add.click();
  await expectButtons(page, 'instrument', 3);
  // A move that makes the pressed button do nothing moves focus to the
  // other move button of the same row.
  await page.getByRole('button', { name: 'Move up instrument 2' }).click();
  await expectButtons(page, 'instrument', 3);
  await expect(page.getByRole('button', { name: 'Move down instrument 1' })).toBeFocused();
  await page.getByRole('button', { name: 'Move down instrument 2' }).click();
  await expectButtons(page, 'instrument', 3);
  await expect(page.getByRole('button', { name: 'Move up instrument 3' })).toBeFocused();
  await page.getByRole('button', { name: 'Remove instrument 3' }).click();
  await expectButtons(page, 'instrument', 2);
  await page.getByRole('button', { name: 'Remove instrument 1' }).click();
  await expectButtons(page, 'instrument', 1);
  for (const instruments of [['hitopbr', 'pid5bf'], ['hitopbr', 'pid5bf', 'hitopsr']]) {
    await page.goto(`${base()}link.html?c=${encodeConfig({ instruments, study: 'x' })}`);
    await expect(page.locator('#err')).toHaveText('');
    await expectButtons(page, 'instrument', instruments.length);
  }
  await page.goto(`${base()}link.html?c=${encodeConfig({ instrument: 'pid5', study: 'x' })}`);
  await expectButtons(page, 'instrument', 1);
});

const question = (k) => ({ name: `q${k}`, text: `Question text ${k}`, type: 'text' });
const csvOf = (n) => ['list,name,text,type', ...Array.from({ length: n }, (_, k) => `before,q${k + 1},Question text ${k + 1},text`)].join('\n');

test('question groups: button states as groups are added, moved, removed, prefilled and loaded', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await openSection(page, 'secQuestions');
  const add = page.getByRole('button', { name: 'Add a question' });
  for (const n of [1, 2, 3]) {
    await add.click();
    await expectButtons(page, 'question', n);
  }
  await page.getByRole('button', { name: 'Move up question 2', exact: true }).click();
  await expectButtons(page, 'question', 3);
  await expect(page.getByRole('button', { name: 'Move down question 1', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Move down question 2', exact: true }).click();
  await expectButtons(page, 'question', 3);
  await expect(page.getByRole('button', { name: 'Move up question 3', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Remove question 2', exact: true }).click();
  await expectButtons(page, 'question', 2);
  await page.getByRole('button', { name: 'Remove question 1', exact: true }).click();
  await expectButtons(page, 'question', 1);
  for (const n of [1, 2, 3]) {
    await page.locator('#questionsFile').setInputFiles({ name: `q${n}.csv`, mimeType: 'text/csv', buffer: Buffer.from(csvOf(n)) });
    await expect(page.locator('#questionsStatus')).toHaveText(`Loaded ${n} ${n === 1 ? 'question' : 'questions'} from q${n}.csv.`);
    await expectButtons(page, 'question', n);
  }
  for (const n of [1, 2, 3]) {
    const before = Array.from({ length: n }, (_, k) => question(k + 1));
    await page.goto(`${base()}link.html?z=${encodeCompressed({ instrument: 'hitopbr', study: 'x', questions: { before } })}`);
    await expect(page.locator('#err')).toHaveText('');
    await expectButtons(page, 'question', n);
  }
});

// S7: the sentence each choice gets, stated here.
const SITE_TEXT = {
  '': null,
  prolific: 'Prolific',
  sona: 'SONA',
  connect: 'CloudResearch Connect',
  other: 'your recruiting site',
};
const TEST_THEN_GIVE = 'open the link once to test it, and then give it to each participant.';
function expectedNext(site, kind) {
  const then = SITE_TEXT[site] === null ? TEST_THEN_GIVE : `paste the link into your study's page on ${SITE_TEXT[site]}.`;
  if (kind === 'supabase' && SITE_TEXT[site] === null) {
    return `Run the SQL below once in your Supabase project's SQL editor, then open the link once to test it and give it to each participant.`;
  }
  if (kind === 'supabase') return `Run the SQL below once in your Supabase project's SQL editor before you ${then}`;
  return then[0].toUpperCase() + then.slice(1);
}

// Fills the destination's fields for a kind.
async function chooseDestination(page, kind) {
  await page.locator('select[name="storeKind"]').selectOption(kind);
  if (kind === 'webhook') await page.locator('input[name="store"]').fill('https://script.google.com/macros/s/abc/exec');
  if (kind === 'supabase') {
    await page.locator('input[name="supabaseUrl"]').fill('https://abcdefghijkl.supabase.co');
    await page.locator('input[name="supabaseKey"]').fill('sb_publishable_test');
    await page.locator('input[name="supabaseTable"]').fill('responses');
  }
}

// The region's parts after a build: heading focused, the link in the box,
// the copy button beside the box, the sentence below it.
async function expectRegion(page) {
  const region = page.locator('#result');
  await expect(region).toBeVisible();
  const heading = region.getByRole('heading', { level: 2 });
  await expect(heading).toHaveText('Your study link');
  await expect(heading).toBeFocused();
  const box = page.locator('#out');
  await expect(box).toHaveText(/^https?:\/\/.+\?[cz]=/);
  expect(await box.evaluate((n) => getComputedStyle(n).overflowY)).toMatch(/^(auto|scroll)$/);
  const copy = region.getByRole('button', { name: 'Copy the link' });
  await expect(copy).toBeVisible();
  const b = await box.boundingBox();
  const c = await copy.boundingBox();
  expect(c.x, 'the button starts right of the box').toBeGreaterThanOrEqual(b.x + b.width);
  expect(c.y, 'the button starts within the box\'s height').toBeLessThan(b.y + b.height);
  const n = await page.locator('#next').boundingBox();
  expect(n.y, 'the sentence is below the box').toBeGreaterThanOrEqual(b.y + b.height);
}

for (const site of Object.keys(SITE_TEXT)) {
  for (const kind of ['', 'webhook', 'supabase']) {
    test(`the result region for site ${JSON.stringify(site)} and destination ${JSON.stringify(kind)}`, async ({ page }) => {
      await page.goto(`${base()}link.html`);
      await page.locator('select[name="instrument"]').selectOption('hitopbr');
      await page.locator('input[name="study"]').fill('region');
      await chooseDestination(page, kind);
      if (site !== '') {
        await openSection(page, 'secParticipants');
        await page.locator('select[name="site"]').selectOption(site);
        if (site === 'other') await page.locator('input[name="participantParam"]').fill('workerId');
      }
      await make(page).click();
      await expect(page.locator('#err')).toHaveText('');
      await expectRegion(page);
      await expect(page.locator('#next')).toHaveText(expectedNext(site, kind));
      // One sentence, counted from the page's text and not from the copy
      // above: one sentence end, at the close.
      const next = await page.locator('#next').textContent();
      expect(next.match(/[.!?](\s|$)/g), `one sentence: ${next}`).toEqual(['.']);
      await expect(page.locator('#sqlBlock')).toBeVisible({ visible: kind === 'supabase' });
    });
  }
}

// A string of letters that deflate cannot shrink much, from a fixed seed.
function noise(n) {
  let x = 12345;
  let s = '';
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    s += String.fromCharCode(97 + (x >> 16) % 26);
  }
  return s;
}

test('a z link over 5,000 characters stays in a box under 16rem high', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await page.locator('input[name="study"]').fill('long');
  await openSection(page, 'secConsent');
  await page.locator('textarea[name="consentText"]').fill(noise(8000));
  await make(page).click();
  await expect(page.locator('#err')).toHaveText('');
  await expectRegion(page);
  const href = await page.locator('#out').textContent();
  expect(new URL(href).searchParams.has('z')).toBe(true);
  expect(href.length).toBeGreaterThan(5000);
  const { height, rem, scrolls } = await page.locator('#out').evaluate((n) => ({
    height: n.getBoundingClientRect().height,
    rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
    scrolls: n.scrollHeight > n.clientHeight,
  }));
  expect(height).toBeLessThan(16 * rem);
  expect(scrolls, 'the link overflows the box, which scrolls').toBe(true);
  await expect(page.locator('#next')).toHaveText(expectedNext('', ''));
});

// S8: the retired terms, stated here as the naming decision lists them:
// six case-insensitive patterns, four more, and two fixed strings.
const RETIRED = [
  /\bdescriptor\b/i, /\bscoring file\b/i, /\bbundle\b/i, /\bendpoint\b/i, /\bstores?\b/i, /\bcompressed\b/i,
  /\b(hitop-form )?form page\b/i, /(?<!study )\blink builder\b/i, /\b[cz] parameter\b/i, /\$\{[^}]*\} parameter/i,
  '?c=', '?z=',
];

// Reads the page as it stands: the word count of each hint, of the intro,
// and every retired term found in the page's text (the built link's box
// left out), its placeholders and its aria-labels.
async function readText(page) {
  const found = await page.evaluate(() => {
    const words = (s) => s.split(/\s+/).filter((w) => w !== '').length;
    const hints = [...document.querySelectorAll('.hint, .site-hint')].map((n) => ({
      where: n.id || n.closest('[id]')?.id || n.parentElement.textContent.trim().slice(0, 30),
      words: words(n.textContent),
    }));
    const range = document.createRange();
    range.setStartAfter(document.querySelector('h1'));
    range.setEndBefore(document.getElementById('f').firstElementChild);
    const out = document.getElementById('out');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
      if (out.contains(n) || n.parentElement.closest('script, style') !== null) continue;
      texts.push(n.data);
    }
    return {
      hints,
      hintCount: hints.length,
      intro: words(range.toString()),
      text: texts.join(' '),
      placeholders: [...document.querySelectorAll('[placeholder]')].map((n) => n.getAttribute('placeholder')),
      labels: [...document.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label')),
    };
  });
  const hits = [];
  for (const [kind, strings] of [['text', [found.text]], ['placeholder', found.placeholders], ['aria-label', found.labels]]) {
    for (const s of strings) {
      for (const term of RETIRED) {
        const hit = typeof term === 'string' ? s.includes(term) : term.test(s);
        if (hit) hits.push(`${kind}: ${term} in ${JSON.stringify(s.slice(0, 80))}`);
      }
    }
  }
  return { ...found, hits };
}

async function expectText(page, state) {
  const r = await readText(page);
  expect(r.hintCount, `${state}: hints found`).toBeGreaterThan(20);
  expect(r.hints.filter((h) => h.words > 40), `${state}: hints over 40 words`).toEqual([]);
  expect(r.intro, `${state}: intro words`).toBeLessThanOrEqual(60);
  expect(r.hits, `${state}: retired terms`).toEqual([]);
}

test('hints stay under 40 words, the intro under 60, and no retired term shows', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  for (const s of SECTIONS) await openSection(page, s.id);
  for (const type of ['text', 'number', 'choice', 'multi']) {
    await page.getByRole('button', { name: 'Add a question' }).click();
    await page.locator('select[name="qType"]').last().selectOption(type);
  }
  await expectText(page, 'sections open');
  for (const site of Object.keys(SITE_TEXT)) {
    await page.locator('select[name="site"]').selectOption(site);
    await expectText(page, `site ${JSON.stringify(site)}`);
  }
  await page.locator('select[name="site"]').selectOption('');
  for (const kind of ['', 'webhook', 'supabase']) {
    await chooseDestination(page, kind);
    await expectText(page, `destination ${JSON.stringify(kind)}`);
  }
  // A Supabase build: the four questions need names and texts, and the
  // choice questions options.
  for (let k = 0; k < 4; k++) {
    await page.locator('input[name="qName"]').nth(k).fill(`q${k + 1}`);
    await page.locator('input[name="qText"]').nth(k).fill(`Question ${k + 1}`);
  }
  for (const k of [2, 3]) await page.locator('textarea[name="qOptions"]').nth(k).fill('Yes\nNo');
  await page.locator('input[name="study"]').fill('text');
  await make(page).click();
  await expect(page.locator('#err')).toHaveText('');
  await expect(page.locator('#sqlBlock')).toBeVisible();
  const href = await page.locator('#out').textContent();
  expect(href, 'the built link, exempt, holds a fixed retired string').toContain('?z=');
  await expectText(page, 'after a Supabase build');
});

// S8: each hint's link to the README lands on one of its headings, slugged
// as GitHub slugs them: lower case, spaces to "-", other punctuation but
// "-" and "_" dropped.
test('every README link on the page names a README heading', async ({ page }) => {
  const readme = await readFile(path.join(ROOT, 'README.md'), 'utf8');
  const slugs = new Set(readme.split('\n').filter((l) => /^#{1,6} /.test(l)).map((l) =>
    l.replace(/^#+ /, '').trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-')));
  await page.goto(`${base()}link.html`);
  for (const s of SECTIONS) await openSection(page, s.id);
  const anchors = await page.$$eval('a[href^="https://github.com/jmgirard/hitop-form#"]', (as) => as.map((a) => a.hash.slice(1)));
  expect(anchors.length).toBeGreaterThan(8);
  expect(anchors.filter((a) => !slugs.has(a))).toEqual([]);
  // Each opens in a new tab, so what the researcher typed stays put.
  const targets = await page.$$eval('a[href^="https://github.com/jmgirard/hitop-form#"]', (as) => as.map((a) => `${a.target} ${a.rel}`));
  expect(targets.filter((t) => t !== '_blank noopener')).toEqual([]);
  // So does the link back to the package documentation above the heading.
  const up = page.locator('.upnav a');
  await expect(up).toHaveAttribute('target', '_blank');
  await expect(up).toHaveAttribute('rel', 'noopener');
});

// A built link goes once a field changes, a questions file loads, or a row
// or a group is added, moved or removed. The title names the project.
test('the result region hides when a field changes after a build', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await expect(page).toHaveTitle('HiTOP Study Link Builder');
  await page.locator('input[name="study"]').fill('stale');
  await make(page).click();
  await expect(page.locator('#result')).toBeVisible();
  await page.locator('input[name="study"]').fill('stale2');
  await expect(page.locator('#result')).toBeHidden();
  await make(page).click();
  await expect(page.locator('#result')).toBeVisible();
  await openSection(page, 'secParticipants');
  await page.locator('select[name="site"]').selectOption('prolific');
  await expect(page.locator('#result')).toBeHidden();
  await make(page).click();
  await expect(page.locator('#result')).toBeVisible();
  await openSection(page, 'secQuestions');
  await page.locator('#questionsFile').setInputFiles({ name: 'q.csv', mimeType: 'text/csv', buffer: Buffer.from(csvOf(1)) });
  await expect(page.locator('#questionsStatus')).toHaveText('Loaded 1 question from q.csv.');
  await expect(page.locator('#result')).toBeHidden();
  // The buttons that add, move or remove a row or a group change the link
  // without an input or change event, and hide it too.
  await page.locator('select[name="site"]').selectOption('');
  // Each press, then what makes the next build valid: a second instrument
  // row starts as a copy of the first, and a new question has no name.
  const instrument = (k) => page.locator('#instrumentList select').nth(k);
  const qField = (name, k) => page.locator(`input[name="${name}"]`).nth(k);
  for (const [press, after] of [
    [() => page.getByRole('button', { name: 'Add an instrument' }).click(), async () => {
      await instrument(1).selectOption((await instrument(0).inputValue()) === 'hitopbr' ? 'pid5bf' : 'hitopbr');
    }],
    [() => page.getByRole('button', { name: 'Move down instrument 1' }).click()],
    [() => page.getByRole('button', { name: 'Remove instrument 2' }).click()],
    [() => page.getByRole('button', { name: 'Add a question' }).click(), async () => {
      await qField('qName', 1).fill('q2');
      await qField('qText', 1).fill('Question text 2');
    }],
    [() => page.getByRole('button', { name: 'Move up question 2', exact: true }).click()],
    [() => page.getByRole('button', { name: 'Remove question 2', exact: true }).click()],
  ]) {
    await make(page).click();
    await expect(page.locator('#err')).toHaveText('');
    await expect(page.locator('#result')).toBeVisible();
    await press();
    await expect(page.locator('#result')).toBeHidden();
    if (after) await after();
  }
});

// A Supabase build waits on the export fetch. A field changed during that
// wait makes the build end with nothing shown, so no link or SQL for the old
// values appears. The next press builds from the new values.
test('a field changed while a build waits leaves the result hidden', async ({ page }) => {
  let release;
  const held = new Promise((r) => { release = r; });
  let reached;
  const asked = new Promise((r) => { reached = r; });
  await page.route(`${EXPORT_BASE}**`, async (route) => {
    reached();
    await held;
    await route.continue();
  });
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('race');
  await chooseDestination(page, 'supabase');
  await make(page).click();
  await asked;
  await expect(make(page)).toBeDisabled();
  // A menu fires its change event as it is chosen, so no later blur hides
  // the result for it.
  await openSection(page, 'secParticipants');
  await page.locator('select[name="site"]').selectOption('prolific');
  release();
  await expect(make(page)).toBeEnabled();
  await expect(page.locator('#result')).toBeHidden();
  // The stopped build says so, and focus lands on the message.
  await expect(page.locator('#err')).toHaveText('A field changed while the link was being made. Press "Make the link" again.');
  await expect(page.locator('#err')).toBeFocused();
  await make(page).click();
  await expect(page.locator('#err')).toHaveText('');
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#next')).toContainText('Prolific');
  await expect(page.locator('#sql')).toHaveValue(/"prolific_study" text/);
});

// S9: each fact stated here, so a shortened hint that drops one fails.
test('the hints keep the facts a researcher acts on', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const intro = page.locator('#intro');
  await expect(intro).toContainText('Opening a study link, here or on the online form, puts its setup in GitHub Pages\' logs.');
  await expect(intro.locator('a[href="https://github.com/jmgirard/hitop-form#what-the-pages-host-sees"]')).toHaveText('GitHub Pages\' logs');
  await openSection(page, 'secParticipants');
  const site = page.locator('select[name="site"]');
  await site.selectOption('prolific');
  await expect(page.locator('#prolificHint')).toContainText('If Prolific\'s URL-parameters option adds them again, it reads the filled ones.');
  await site.selectOption('sona');
  const sona = page.locator('#sonaHint');
  await expect(sona).toContainText('For completion, give SONA\'s client-side URL with {participant} for XXXX.');
  await expect(sona).toContainText('XXXX. Its credit token is readable in the study link.');
  const hintOf = (name) => page.locator(`label:has([name="${name}"]) .hint`);
  await expect(hintOf('declinedText')).toContainText('Left empty: "You chose not to take part.", plus "You can close this page." with no decline URL.');
  await expect(hintOf('completeDeclined')).toContainText('{participant} is empty unless the link or a recruiting site gives it.');
  await expect(hintOf('completeSaved')).toContainText('in place of the completion URL, which still applies when responses arrive.');
  await expect(hintOf('complete')).toContainText('sends the participant to after showing that their responses arrived');
  await expect(intro).toContainText('This page keeps and sends nothing you type.');
  await expect(sona).toContainText('The link ends in id=%SURVEY_CODE%, which SONA fills with each participant\'s survey code.');
  await site.selectOption('prolific');
  await expect(page.locator('#prolificHint')).toContainText('The responses gain prolific_study and prolific_session columns.');
  await expect(page.locator('#destHint')).toContainText('A web address, such as an Apps Script web app, gets one JSON row per participant, and a Supabase table one row, a column per item.');
  await expect(page.locator('#instrumentsBlock > .hint')).toContainText('The online form gives them one after another, and the responses hold their item columns, in this order.');
  const sqlHint = page.locator('#sqlBlock .hint');
  await expect(sqlHint).toContainText('Its table has a column per item and question.');
  await expect(sqlHint).toContainText('After changing instruments, module, random order, Prolific or questions, make a new table.');
  await expect(hintOf('supabaseTable')).toContainText('To write it, this page downloads each instrument from the hitop site.');
  await openSection(page, 'secOrder');
  await expect(hintOf('shuffle')).toContainText('The responses still list the items in the instrument\'s order');
  await openSection(page, 'secQuestions');
  await page.getByRole('button', { name: 'Add a question' }).click();
  await page.locator('select[name="qType"]').first().selectOption('choice');
  await expect(page.locator('.options-field .hint').first()).toContainText('Blank lines are skipped.');
});

test('a link setting no optional field leaves every section closed', async ({ page }) => {
  const config = {
    instruments: ['hitopbr', 'pid5bf'],
    study: 'sections',
    store: { kind: 'webhook', url: 'https://script.google.com/macros/s/abc/exec' },
  };
  await page.goto(`${base()}link.html?c=${encodeConfig(config)}`);
  await expect(page.locator('#err')).toHaveText('');
  await expect(page.locator('input[name="study"]')).toHaveValue('sections');
  for (const s of SECTIONS) {
    expect(await isOpen(page, s.id), `${s.id} open`).toBe(false);
    await expect(state(page, s.id)).toHaveText('Not used');
  }
});

// S10: the summaries are drawn with no copy of a control. Every
// cloneNode() call on the page is counted from before its script runs.
// The fields typed into: 5 text inputs and 3 boxes in the sections, and
// 4 text inputs and 1 box per question, stated here rather than read from
// the page.
const TYPED_FIELDS = 5 + 3 + 4 * 5;
test('typing in the sections copies no control', async ({ page }) => {
  await page.addInitScript(() => {
    const real = Node.prototype.cloneNode;
    window.clones = 0;
    Node.prototype.cloneNode = function (...args) {
      window.clones += 1;
      return real.apply(this, args);
    };
  });
  await page.goto(`${base()}link.html`);
  for (const s of SECTIONS) await openSection(page, s.id);
  await page.locator('select[name="site"]').selectOption('other');
  for (const [k, type] of ['text', 'number', 'choice', 'multi'].entries()) {
    await page.getByRole('button', { name: 'Add a question' }).click();
    await page.locator('select[name="qType"]').nth(k).selectOption(type);
  }

  const fields = page.locator('details.optional input[type=text], details.optional textarea');
  expect(await fields.count()).toBe(TYPED_FIELDS);
  const typed = 'x'.repeat(50);
  for (let k = 0; k < TYPED_FIELDS; k++) {
    const field = fields.nth(k);
    if (await field.isVisible()) {
      await field.pressSequentially(typed);
    } else {
      // A field its question's type hides takes the characters one input
      // event at a time, as typing would give them.
      await field.evaluate((node, text) => {
        for (const ch of text) {
          node.value += ch;
          node.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, typed);
    }
    await expect(field).toHaveValue(typed);
  }
  expect(await page.evaluate(() => window.clones)).toBe(0);

  await expect(state(page, 'secParticipants')).toHaveText('Participant, Recruiting site, Address parameter');
  await expect(state(page, 'secOrder')).toHaveText('Module file');
  await expect(state(page, 'secConsent')).toHaveText('Consent text, Declined text, Completion URL after a decline');
  await expect(state(page, 'secFinish')).toHaveText('Completion URL, Completion URL after a saved file');
  await expect(state(page, 'secQuestions')).toHaveText('Question 1, Question 2, Question 3, Question 4');
});

test('labelText() uses no copying method', async ({ page }) => {
  const html = await (await page.request.get(`${base()}link.html`)).text();
  const body = html.match(/\n {2}function labelText\([^)]*\) \{\n([\s\S]*?)\n {2}\}\n/);
  expect(body, 'labelText() is in the page').not.toBeNull();
  expect(body[1].trim()).not.toBe('');
  for (const name of ['cloneNode', 'importNode', 'cloneContents', 'innerHTML', 'outerHTML']) {
    expect(body[1], name).not.toContain(name);
  }
});

// S11: a throw in the setup steps after the prefill leaves a clean page.
// The opened link sets SONA, whose hint showSite() ties to the menu with
// setAttribute(), and consent text. That one setAttribute() call throws.
test('a throw after the prefill leaves a clean page that still builds', async ({ page }) => {
  await page.addInitScript(() => {
    const real = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'aria-describedby' && this.name === 'site') throw new Error('planted setup throw');
      return real.call(this, name, value);
    };
  });
  const config = { instrument: 'hitopbr', study: 'throw', participantParam: 'id', consent: { text: 'I agree.' } };
  await page.goto(`${base()}link.html?z=${encodeCompressed(config)}`);
  await expect(page.locator('#err')).toHaveText('The study link you opened could not be read. Fill in the form above to make a new link.');
  for (const s of SECTIONS) {
    await expect(state(page, s.id), s.id).toHaveText('Not used');
    expect(await isOpen(page, s.id), `${s.id} open`).toBe(false);
  }
  for (const id of ['prolificHint', 'sonaHint', 'connectHint', 'otherFields', 'webhookFields', 'supabaseFields']) {
    await expect(page.locator(`#${id}`), id).toBeHidden();
  }
  await page.locator('input[name="study"]').fill('after the throw');
  await make(page).click();
  await expect(page.getByRole('heading', { name: 'Your study link' })).toBeVisible();
});
