// The link builder's question editor.
//
//   LQ1: a link built with one question of each type, two in each list and
//        added out of list order, is written as ?z= whose questions keep
//        each list in the editor's order, the before list first; opened, it
//        asks the before questions ahead of the start screen and the after
//        questions behind the last item page
//   LQ2: link.html?z=<that link> fills one group per question, the before
//        list first, and "Make the link" builds the same config
//   LQ3: with a Supabase table, the shown SQL for the questions of
//        supabase-hitopbr-questions.sql equals that file byte for byte
//   LQ4: each fault the editor can produce in one question is refused
//        naming the question by its number in the editor, and no link is
//        built: no name, a name outside the pattern, a name used twice, no
//        text, a text of white space, a text of 1,001 characters, a text
//        holding a line separator (U+2028), U+0085, a vertical tab or a form
//        feed (each of which a text input keeps) or a lone surrogate, 1 or 21
//        options, an option of 201 characters, an option holding "|", a line
//        separator, U+0085, a vertical tab or a form feed, two options the same after
//        trimming, an option holding a lone surrogate, a minimum that is not
//        a whole number, a maximum outside the range with and without a
//        leading zero, a bound of more digits than a JavaScript number holds,
//        each out-of-range bound quoted as typed, and a minimum above the
//        maximum; 51 and 200 short questions are built, and the links open
//        on their questions
//   LQ5: blank lines in the options box are skipped, a type that takes no
//        options or bounds leaves the hidden ones out of the link, and with
//        no question the builder writes ?c= and no questions field; in a
//        browser without CompressionStream a link with questions, consent
//        text, or both is refused naming what it holds; a setup whose JSON
//        is over 100,000 bytes is refused with its size, and one of exactly
//        100,000 bytes is built and opens, for a z setup and for a c setup
//        with no consent text and no questions; the min and max boxes ask for no
//        numeric keypad, so a minus sign can be typed
//   LQ6: Move up, Move down and Remove change the editor's order and its
//        numbers, and the link follows the order
//   LQ7: with a Supabase table, a setup whose table has 1,600 columns is
//        built and its SQL holds 1,600 columns; one of 1,601 is refused
//        naming the count, and no link or SQL shows

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { useTarget, openSectionOf, encodeCompressed, decodeLinkParam, begin, walkAll } from './helpers.mjs';

const base = useTarget();

async function openBuilder(page, query = '') {
  await page.goto(`${base()}link.html${query}`);
}

const group = (page, n) => page.locator('fieldset.question-edit').nth(n - 1);

// Adds a group with "Add a question" and fills it. `text` and `options`
// are set from the page, as a paste sets them, so a lone surrogate stays.
async function addQ(page, { list = 'before', name, text, type = 'text', options, min, max, required } = {}) {
  await page.getByRole('button', { name: 'Add a question' }).click();
  const g = page.locator('fieldset.question-edit').last();
  await g.locator('[name=qList]').selectOption(list);
  if (name !== undefined) await g.locator('[name=qName]').fill(name);
  if (text !== undefined) await g.locator('[name=qText]').evaluate((node, v) => { node.value = v; }, text);
  await g.locator('[name=qType]').selectOption(type);
  if (options !== undefined) await g.locator('[name=qOptions]').evaluate((node, v) => { node.value = v; }, options);
  if (min !== undefined) await g.locator('[name=qMin]').fill(min);
  if (max !== undefined) await g.locator('[name=qMax]').fill(max);
  if (required) await g.locator('[name=qRequired]').check();
  return g;
}

async function make(page, study = 'questions') {
  await page.locator('input[name="study"]').fill(study);
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err, #out').filter({ hasText: /./ }).first()).toBeVisible();
}

// One question of each type, added out of list order.
const EDITOR = [
  { list: 'after', name: 'note', text: 'Anything to add?', type: 'text' },
  { list: 'before', name: 'age', text: 'Your age', type: 'number', min: '18', max: '99', required: true },
  { list: 'before', name: 'sex', text: 'Your sex', type: 'choice', options: 'Female\nMale\nAnother' },
  { list: 'after', name: 'days', text: 'Days you work', type: 'multi', options: 'Mon\nTue\nWed' },
];
// The field the link must carry for EDITOR, stated here.
const QUESTIONS = {
  before: [
    { name: 'age', text: 'Your age', type: 'number', min: 18, max: 99, required: true },
    { name: 'sex', text: 'Your sex', type: 'choice', options: ['Female', 'Male', 'Another'] },
  ],
  after: [
    { name: 'note', text: 'Anything to add?', type: 'text' },
    { name: 'days', text: 'Days you work', type: 'multi', options: ['Mon', 'Tue', 'Wed'] },
  ],
};

// LQ1
test('a link built with one question of each type keeps each list in the editor order and asks them', async ({ page }) => {
  await openBuilder(page);
  await page.locator('select[name="instrument"]').selectOption('pid5bf');
  await openSectionOf(page, '#addQuestion');
  for (const q of EDITOR) await addQ(page, q);
  await make(page);
  await expect(page.locator('#err')).toHaveText('');
  const href = await page.locator('#out').textContent();
  expect([...new URL(href).searchParams.keys()]).toEqual(['z']);
  expect(decodeLinkParam(href)).toEqual({ instrument: 'pid5bf', study: 'questions', questions: QUESTIONS });
  await page.goto(href);
  await expect(page.locator('h1')).toHaveText('Before you begin');
  expect(await page.$$eval('.question', (ns) => ns.map((n) => n.dataset.name))).toEqual(['age', 'sex']);
  await page.locator('.question[data-name=age] input').fill('30');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await begin(page, 'p1');
  await walkAll(page);
  await expect(page.locator('h1')).toHaveText('Before you finish');
  expect(await page.$$eval('.question', (ns) => ns.map((n) => n.dataset.name))).toEqual(['note', 'days']);
});

// LQ2
test('a z link with questions fills the editor and builds the same config', async ({ page }) => {
  const config = { instrument: 'hitopbr', study: 'prefill', questions: QUESTIONS };
  await openBuilder(page, `?z=${encodeCompressed(config)}`);
  await expect(page.locator('#err')).toHaveText('');
  await expect(page.locator('fieldset.question-edit')).toHaveCount(4);
  const read = await page.$$eval('fieldset.question-edit', (gs) => gs.map((g) => {
    const v = (n) => g.querySelector(`[name=${n}]`);
    return [g.querySelector('legend').textContent, v('qList').value, v('qName').value, v('qText').value, v('qType').value,
      v('qOptions').value, v('qMin').value, v('qMax').value, v('qRequired').checked];
  }));
  expect(read).toEqual([
    ['Question 1', 'before', 'age', 'Your age', 'number', '', '18', '99', true],
    ['Question 2', 'before', 'sex', 'Your sex', 'choice', 'Female\nMale\nAnother', '', '', false],
    ['Question 3', 'after', 'note', 'Anything to add?', 'text', '', '', '', false],
    ['Question 4', 'after', 'days', 'Days you work', 'multi', 'Mon\nTue\nWed', '', '', false],
  ]);
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toHaveText('');
  expect(decodeLinkParam(await page.locator('#out').textContent())).toEqual(config);
});

// LQ3
test('the shown SQL for the questions equals supabase-hitopbr-questions.sql', async ({ page }) => {
  await openBuilder(page);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await openSectionOf(page, '#addQuestion');
  for (const q of EDITOR) await addQ(page, q);
  await page.locator('select[name="storeKind"]').selectOption('supabase');
  await page.locator('input[name="supabaseUrl"]').fill('https://abc.supabase.co');
  await page.locator('input[name="supabaseKey"]').fill('sb_publishable_x');
  await page.locator('input[name="supabaseTable"]').fill('hitopbr_responses');
  await make(page, 'fixture');
  await expect(page.locator('#err')).toHaveText('');
  await expect(page.locator('#sqlBlock')).toBeVisible();
  const fixture = await readFile(new URL('./fixtures/supabase-hitopbr-questions.sql', import.meta.url), 'utf8');
  expect(await page.locator('#sql').inputValue()).toBe(fixture);
});

// LQ4
const bad = (why) => `The questions could not be used: ${why}`;
const OK = { name: 'ok', text: 'Fine', type: 'text' };
const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));

const REFUSED = [
  { name: 'no name', qs: [{ text: 'a' }], why: bad('question 1: it has no name.') },
  { name: 'the name "Age"', qs: [{ name: 'Age', text: 'a' }], why: bad('question 1: its name is "Age", and a name starts with a lower-case letter and holds only lower-case letters, digits and "_", up to 30 characters.') },
  { name: 'a name used twice, the second in the other list', qs: [{ name: 'age', text: 'a' }, OK, { list: 'after', name: 'age', text: 'b' }], why: bad('question 3: its name "age" is also the name of question 1.') },
  { name: 'no text', qs: [{ name: 'a' }], why: bad('question 1: it has no text.') },
  { name: 'a text of white space', qs: [OK, { name: 'a', text: '   ' }], why: bad('question 2: its text is empty or holds only white space.') },
  { name: 'a text of 1,001 characters', qs: [{ name: 'a', text: 'x'.repeat(1_001) }], why: bad('question 1: its text has 1,001 characters, more than the 1,000 it may hold.') },
  { name: 'a text holding a line separator', qs: [{ name: 'a', text: `one${String.fromCharCode(0x2028)}two` }], why: bad('question 1: its text holds a line break, and a question text is one line.') },
  { name: 'an option holding a line separator', qs: [{ name: 'a', text: 'a', type: 'choice', options: `Red\nBl${String.fromCharCode(0x2028)}ue` }], why: bad('question 1: its option 2 holds a line break, and an option label is one line.') },
  ...['\v', '\f', String.fromCharCode(0x85)].flatMap((br) => {
    const code = `U+${br.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
    return [
      { name: `a text holding ${code}`, qs: [{ name: 'a', text: `one${br}two` }], why: bad('question 1: its text holds a line break, and a question text is one line.') },
      { name: `an option holding ${code}`, qs: [{ name: 'a', text: 'a', type: 'choice', options: `Red\nBl${br}ue` }], why: bad('question 1: its option 2 holds a line break, and an option label is one line.') },
    ];
  }),
  { name: 'a text holding a lone surrogate', qs: [{ name: 'a', text: `a ${String.fromCharCode(0xd800)}` }], why: bad('question 1: its text holds half of a character (a lone surrogate), which cannot be written.') },
  { name: 'one option', qs: [{ name: 'a', text: 'a', type: 'choice', options: 'Red\n\n' }], why: bad('question 1: it has 1 option, and a question holds 2 to 20.') },
  { name: '21 options', qs: [{ name: 'a', text: 'a', type: 'multi', options: many(21, (i) => `o${i}`).join('\n') }], why: bad('question 1: it has 21 options, and a question holds 2 to 20.') },
  { name: 'an option of 201 characters', qs: [{ name: 'a', text: 'a', type: 'choice', options: `Red\n${'y'.repeat(201)}` }], why: bad('question 1: its option 2 has 201 characters, more than the 200 it may hold.') },
  { name: 'an option holding "|"', qs: [{ name: 'a', text: 'a', type: 'choice', options: 'Red\nBlue | Green' }], why: bad('question 1: its option 2 holds "|", which an option label may not hold.') },
  { name: 'two options the same after trimming', qs: [{ name: 'a', text: 'a', type: 'choice', options: 'Red\nBlue\n  Red  ' }], why: bad('question 1: its options 1 and 3 are the same after trimming: "Red".') },
  { name: 'an option holding a lone surrogate', qs: [{ name: 'a', text: 'a', type: 'choice', options: `Red\nBlue ${String.fromCharCode(0xdc00)}` }], why: bad('question 1: its option 2 holds half of a character (a lone surrogate), which cannot be written.') },
  { name: 'a minimum of 2.5', qs: [{ name: 'a', text: 'a', type: 'number', min: '2.5' }], why: bad('question 1: its min is not a whole number from -2,147,483,647 to 2,147,483,647, and it is "2.5".') },
  { name: 'a minimum of abc', qs: [{ name: 'a', text: 'a', type: 'number', min: 'abc' }], why: bad('question 1: its min is not a whole number from -2,147,483,647 to 2,147,483,647, and it is "abc".') },
  // A bound out of range is quoted as typed: leading zeros stay, and past
  // the digits a JavaScript number holds exactly, the refusal shows no
  // rounded number (1e+23, or null for Infinity).
  { name: 'a maximum of 2147483648', qs: [{ name: 'a', text: 'a', type: 'number', max: '2147483648' }], why: bad('question 1: its max is not a whole number from -2,147,483,647 to 2,147,483,647, and it is "2147483648".') },
  { name: 'a maximum of 02147483648', qs: [{ name: 'a', text: 'a', type: 'number', max: '02147483648' }], why: bad('question 1: its max is not a whole number from -2,147,483,647 to 2,147,483,647, and it is "02147483648".') },
  { name: 'a minimum of 23 nines', qs: [{ name: 'a', text: 'a', type: 'number', min: '9'.repeat(23) }], why: bad(`question 1: its min is not a whole number from -2,147,483,647 to 2,147,483,647, and it is "${'9'.repeat(23)}".`) },
  { name: 'a maximum of minus 400 nines', qs: [{ name: 'a', text: 'a', type: 'number', max: `-${'9'.repeat(400)}` }], why: bad(`question 1: its max is not a whole number from -2,147,483,647 to 2,147,483,647, and it is "-${'9'.repeat(400)}".`) },
  { name: 'a minimum above the maximum', qs: [{ name: 'a', text: 'a', type: 'number', min: '10', max: '5' }], why: bad('question 1: its min 10 is above its max 5.') },
];

for (const probe of REFUSED) {
  test(`the editor refuses ${probe.name}, naming the question`, async ({ page }) => {
    await openBuilder(page);
    await openSectionOf(page, '#addQuestion');
    for (const q of probe.qs) await addQ(page, q);
    await make(page);
    await expect(page.locator('#err')).toHaveText(probe.why);
    await expect(page.locator('#out')).toHaveText('');
  });
}

for (const n of [51, 200]) {
  test(`the editor builds ${n} short questions, and the link opens`, async ({ page }) => {
    // Filled from a prefilled link, since adding the groups by hand is slow.
    const questions = { before: many(n, (i) => ({ name: `q${i}`, text: 't', type: 'text' })) };
    await openBuilder(page, `?z=${encodeCompressed({ instrument: 'hitopbr', study: 's', questions })}`);
    await expect(page.locator('fieldset.question-edit')).toHaveCount(n);
    await openSectionOf(page, '#addQuestion');
    await make(page);
    await expect(page.locator('#err')).toHaveText('');
    const href = await page.locator('#out').textContent();
    expect(decodeLinkParam(href).questions).toEqual(questions);
    await page.goto(href);
    await expect(page.getByRole('heading', { name: 'Before you begin' })).toBeVisible();
    await expect(page.locator('.question')).toHaveCount(n);
  });
}

// LQ5
test('blank option lines are skipped, hidden fields stay out, and no question writes c', async ({ page }) => {
  await openBuilder(page);
  await make(page);
  const plain = await page.locator('#out').textContent();
  expect([...new URL(plain).searchParams.keys()]).toEqual(['c']);
  expect(decodeLinkParam(plain)).toEqual({ instrument: 'hitopsr', study: 'questions' });

  await openSectionOf(page, '#addQuestion');
  const g = await addQ(page, { name: 'pick', text: 'Pick', type: 'number', min: '1', max: '3' });
  await expect(g.locator('.options-field')).toBeHidden();
  await expect(g.locator('.bounds')).toBeVisible();
  await g.locator('[name=qType]').selectOption('choice');
  await expect(g.locator('.options-field')).toBeVisible();
  await expect(g.locator('.bounds')).toBeHidden();
  await g.locator('[name=qOptions]').evaluate((node) => { node.value = '\nRed\n  \n Blue \n\n'; });
  const h = await addQ(page, { name: 'say', text: 'Say', type: 'choice', options: 'x\ny' });
  await h.locator('[name=qType]').selectOption('text');
  await make(page);
  await expect(page.locator('#err')).toHaveText('');
  expect(decodeLinkParam(await page.locator('#out').textContent()).questions).toEqual({
    before: [
      { name: 'pick', text: 'Pick', type: 'choice', options: ['Red', 'Blue'] },
      { name: 'say', text: 'Say', type: 'text' },
    ],
  });
});

for (const { parts, consent, question } of [
  { parts: 'questions', question: true },
  { parts: 'consent text', consent: true },
  { parts: 'consent text and questions', consent: true, question: true },
]) {
  test(`in a browser without CompressionStream a link with ${parts} is refused naming ${parts}`, async ({ page }) => {
    await page.addInitScript(() => { delete window.CompressionStream; });
    await openBuilder(page);
    if (consent) {
      await openSectionOf(page, 'consentText');
      await page.locator('textarea[name="consentText"]').fill('You agree to take part.');
    }
    if (question) {
      await openSectionOf(page, '#addQuestion');
      await addQ(page, { name: 'a', text: 'A' });
    }
    await make(page);
    await expect(page.locator('#err')).toHaveText(`This browser cannot make a link with ${parts}, because it cannot compress the link. Use a current version of Chrome, Edge, Firefox or Safari.`);
    await expect(page.locator('#out')).toHaveText('');
  });
}

test('a setup over 100,000 bytes is refused with its size, and one of exactly 100,000 bytes is built and opens', async ({ page }) => {
  // Seven full choice questions of three-byte characters, a smaller one,
  // and a text question whose length sets the total byte for byte.
  const opts = (m) => many(20, (i) => `${i}${'€'.repeat(m)}`);
  const setup = (pad) => ({
    instrument: 'hitopbr',
    study: 'questions',
    questions: {
      before: [
        ...many(7, (i) => ({ name: `f${i}`, text: 'x'.repeat(1000), type: 'choice', options: opts(198) })),
        { name: 'g', text: 'x', type: 'choice', options: opts(132) },
        { name: 'pad', text: 'x'.repeat(pad), type: 'text' },
      ],
    },
  });
  await openBuilder(page, `?z=${encodeCompressed(setup(1))}`);
  await make(page);
  await expect(page.locator('#err')).toHaveText('');
  const need = 100_000 - Buffer.byteLength(JSON.stringify(decodeLinkParam(await page.locator('#out').textContent())));
  expect(need).toBeGreaterThan(0);
  expect(need).toBeLessThan(1000);

  await openBuilder(page, `?z=${encodeCompressed(setup(1 + need))}`);
  await make(page);
  await expect(page.locator('#err')).toHaveText('');
  const href = await page.locator('#out').textContent();
  expect(Buffer.byteLength(JSON.stringify(decodeLinkParam(href)))).toBe(100_000);
  await page.goto(href);
  await expect(page.getByRole('heading', { name: 'Before you begin' })).toBeVisible();

  await openBuilder(page, `?z=${encodeCompressed(setup(1 + need))}`);
  // The z prefill unpacks before it fills the groups and opens their
  // section, so the fill is awaited first: a click on the summary before
  // then would close the section the prefill opens.
  await expect(group(page, 9).locator('[name=qText]')).toHaveValue('x'.repeat(1 + need));
  await openSectionOf(page, '#addQuestion');
  await group(page, 9).locator('[name=qText]').fill('x'.repeat(2 + need));
  await make(page);
  await expect(page.locator('#err')).toHaveText("This link's setup is 100,001 bytes, more than the 100,000 bytes the online form reads. Shorten the consent text or the questions.");
  await expect(page.locator('#out')).toHaveText('');
});

test('a c setup over 100,000 bytes is refused with its size, and one of exactly 100,000 bytes is built and opens', async ({ page }) => {
  // No consent text and no questions, so the link is ?c=. The study name
  // sets the total byte for byte.
  await openBuilder(page);
  await make(page, 's');
  await expect(page.locator('#err')).toHaveText('');
  const base1 = Buffer.byteLength(JSON.stringify(decodeLinkParam(await page.locator('#out').textContent())));
  const study = (bytes) => 's'.repeat(1 + bytes - base1);

  await make(page, study(100_000));
  await expect(page.locator('#err')).toHaveText('');
  const href = await page.locator('#out').textContent();
  expect([...new URL(href).searchParams.keys()]).toEqual(['c']);
  expect(Buffer.byteLength(JSON.stringify(decodeLinkParam(href)))).toBe(100_000);
  await page.goto(href);
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();

  await openBuilder(page);
  await make(page, study(100_001));
  await expect(page.locator('#err')).toHaveText("This link's setup is 100,001 bytes, more than the 100,000 bytes the online form reads.");
  await expect(page.locator('#out')).toHaveText('');
});

test('the min and max boxes ask for no numeric keypad, and negative bounds are built', async ({ page }) => {
  await openBuilder(page);
  await openSectionOf(page, '#addQuestion');
  const g = await addQ(page, { name: 'temp', text: 'Temperature', type: 'number', min: '-30', max: '-1' });
  for (const box of ['qMin', 'qMax']) await expect(g.locator(`[name=${box}]`)).not.toHaveAttribute('inputmode');
  await make(page);
  await expect(page.locator('#err')).toHaveText('');
  expect(decodeLinkParam(await page.locator('#out').textContent()).questions.before[0]).toEqual(
    { name: 'temp', text: 'Temperature', type: 'number', min: -30, max: -1 },
  );
});

// LQ6
test('Move up, Move down and Remove reorder and renumber the questions', async ({ page }) => {
  await openBuilder(page);
  await openSectionOf(page, '#addQuestion');
  for (const name of ['a', 'b', 'c']) await addQ(page, { name, text: name.toUpperCase() });
  const names = () => page.$$eval('fieldset.question-edit', (gs) => gs.map((g) => `${g.querySelector('legend').textContent}:${g.querySelector('[name=qName]').value}`));
  // Each button's accessible name carries its question's number.
  await page.getByRole('button', { name: 'Move up question 3', exact: true }).click();
  expect(await names()).toEqual(['Question 1:a', 'Question 2:c', 'Question 3:b']);
  await expect(page.getByRole('button', { name: 'Move up question 2', exact: true })).toBeFocused();
  await expect(group(page, 2).locator('.up')).toHaveText('Move up');
  await page.getByRole('button', { name: 'Move down question 1', exact: true }).click();
  expect(await names()).toEqual(['Question 1:c', 'Question 2:a', 'Question 3:b']);
  await expect(page.getByRole('button', { name: 'Move down question 2', exact: true })).toBeFocused();
  // The first group's Move up does nothing, so it is disabled.
  await expect(page.getByRole('button', { name: 'Move up question 1', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove question 2', exact: true }).click();
  expect(await names()).toEqual(['Question 1:c', 'Question 2:b']);
  await expect(group(page, 2).locator('[name=qList]')).toBeFocused();
  await make(page);
  expect(decodeLinkParam(await page.locator('#out').textContent()).questions.before.map((q) => q.name)).toEqual(['c', 'b']);
});

// LQ7: PostgreSQL allows 1,600 columns in a table. The HiTOP-BR has 45
// items and the row has 5 lead columns, so 1,550 questions make 1,600
// columns.
const PG_MAX = 1_600;
const HITOPBR_ITEMS = 45;
const LEAD = 5;
for (const columns of [PG_MAX, PG_MAX + 1]) {
  test(`a Supabase table of ${columns.toLocaleString('en-US')} columns is ${columns > PG_MAX ? 'refused, naming the count' : 'built'}`, async ({ page }) => {
    const n = columns - LEAD - HITOPBR_ITEMS;
    const questions = { before: many(n, (i) => ({ name: `q${i}`, text: 't', type: 'text' })) };
    await openBuilder(page, `?z=${encodeCompressed({ instrument: 'hitopbr', study: 's', questions })}`);
    await expect(page.locator('fieldset.question-edit')).toHaveCount(n);
    await page.locator('select[name="storeKind"]').selectOption('supabase');
    await page.locator('input[name="supabaseUrl"]').fill('https://abc.supabase.co');
    await page.locator('input[name="supabaseKey"]').fill('sb_publishable_x');
    await page.locator('input[name="supabaseTable"]').fill('hitopbr_responses');
    await make(page, 'columns');
    if (columns > PG_MAX) {
      await expect(page.locator('#err')).toHaveText('The Supabase table would have 1,601 columns, more than the 1,600 a PostgreSQL table can have. Use fewer questions or instruments.');
      await expect(page.locator('#out')).toHaveText('');
      await expect(page.locator('#sqlBlock')).toBeHidden();
      return;
    }
    await expect(page.locator('#err')).toHaveText('');
    // The shown SQL's column lines: the lead columns, one integer column per
    // item and one text column per question.
    const sql = await page.locator('#sql').inputValue();
    const lines = sql.slice(sql.indexOf('(\n') + 2, sql.indexOf('\n);')).split(',\n');
    expect(lines).toHaveLength(PG_MAX);
    expect(lines.filter((l) => l.endsWith(' integer'))).toHaveLength(HITOPBR_ITEMS);
    expect(lines.filter((l) => l.startsWith('  "q_'))).toHaveLength(n);
  });
}
