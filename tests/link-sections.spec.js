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

import { test, expect } from '@playwright/test';
import { useTarget, encodeConfig, encodeCompressed, readDescriptor } from './helpers.mjs';

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
