// The question columns: one `q_<name>` column per question after the item
// columns, the before list first, each list in the link's order.
//
//   QC1: the saved file and the row posted to a webhook each carry the nine
//        question columns right after the 25 PID-5-BF item columns. The
//        before list is answered and the after list left empty, one of each
//        type in each. A text is written as typed, spaces, a comma and quotes
//        kept. The numbers 007 and -0 are written 7 and 0. A choice is its
//        option's position. A multi clicked as option 3 then option 1 is
//        "1 3". Each unanswered question is the empty string. Every q_ value
//        in the row is a JSON string. Walked with shuffle off, with shuffle
//        on, and with prolific: true.
//   QC2: see its comment below.
//   QC3: a HiTOP-BR walk for study fixture and participant p001, with one
//        question of each type answered and a fifth left empty, saves the
//        file responses-hitopbr-questions.csv holds, in every column but
//        submitted and form_build. Run with WRITE_FIXTURES=1 to rewrite it.
//        The hitop package's reader test reads a copy.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  test, expect, useTarget, useStore, allowLocalStore, openForm, webhook, supabase, begin, walkAll, awaitDownload, parseCsv, leadColumns,
  prolificQuery, FIXTURES, readFixture,
} from './helpers.mjs';

const base = useTarget();
const store = useStore();

test.beforeEach(async ({ context }) => allowLocalStore(context));

const ITEMS = 25;
const TYPED = '  Hello, "world"  ';

const QUESTIONS = {
  before: [
    { name: 't1', text: 'Say something', type: 'text' },
    { name: 'n1', text: 'A number', type: 'number' },
    { name: 'n0', text: 'Another number', type: 'number', min: -5 },
    { name: 'c1', text: 'Pick one', type: 'choice', options: ['Red', 'Blue', 'Green'] },
    { name: 'm1', text: 'Pick any', type: 'multi', options: ['Mon', 'Tue', 'Wed'] },
  ],
  after: [
    { name: 't2', text: 'More to say?', type: 'text' },
    { name: 'n2', text: 'One more number', type: 'number' },
    { name: 'c2', text: 'Pick one more', type: 'choice', options: ['Yes', 'No'] },
    { name: 'm2', text: 'Pick any more', type: 'multi', options: ['Sat', 'Sun'] },
  ],
};

// Stated here rather than computed with the code under test.
const COLUMNS = ['q_t1', 'q_n1', 'q_n0', 'q_c1', 'q_m1', 'q_t2', 'q_n2', 'q_c2', 'q_m2'];
const VALUES = [TYPED, '7', '0', '2', '1 3', '', '', '', ''];

async function answerBefore(page) {
  await expect(page.locator('h1')).toHaveText('Before you begin');
  await page.locator('.question[data-name=t1] input').fill(TYPED);
  await page.locator('.question[data-name=n1] input').fill('007');
  await page.locator('.question[data-name=n0] input').fill('-0');
  await page.getByLabel('Blue').check();
  await page.getByLabel('Wed').check();
  await page.getByLabel('Mon').check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
}

// Walks the whole form: the before screen answered, the items, and the
// after screen left empty and finished.
async function walk(page) {
  await answerBefore(page);
  await begin(page);
  await walkAll(page);
  await expect(page.locator('h1')).toHaveText('Before you finish');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
}

const MODES = [
  { name: 'shuffle off', config: { participant: 'p1' }, lead: leadColumns() },
  { name: 'shuffle on', config: { participant: 'p1', shuffle: true }, lead: leadColumns({ shuffle: true }) },
  { name: 'prolific: true', config: { prolific: true }, lead: leadColumns({ prolific: true }), extra: prolificQuery() },
];

// QC2: a HiTOP-BR walk under the questions of
// supabase-hitopbr-questions.sql, all left unanswered, posts one row to a
// webhook and one to a supabase store. Every q_ key is present and "", and
// the keys equal the fixture's column lines, so the row fits the table the
// builder makes.
const FIXTURE_QUESTIONS = {
  before: [
    { name: 'age', text: 'Your age', type: 'number', min: 18, max: 99 },
    { name: 'sex', text: 'Your sex', type: 'choice', options: ['Female', 'Male', 'Another'] },
  ],
  after: [
    { name: 'note', text: 'Anything to add?', type: 'text' },
    { name: 'days', text: 'Days you work', type: 'multi', options: ['Mon', 'Tue', 'Wed'] },
  ],
};

const sqlColumns = async (fixture) => (await readFile(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8'))
  .split('\n')
  .filter((l) => /^ {2}"/.test(l))
  .map((l) => /^ {2}"([^"]+)"/.exec(l)[1]);

for (const w of [
  { name: 'a webhook', make: () => webhook(store(), '/record'), path: '/record' },
  { name: 'a supabase store', make: () => supabase(store(), { table: 'hitopbr_responses' }), path: '/rest/v1/hitopbr_responses' },
]) {
  test(`an unanswered walk posts every q_ key as "" to ${w.name}, keyed as the SQL fixture`, async ({ page }) => {
    const from = store().requests.length;
    await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture', participant: 'p001', questions: FIXTURE_QUESTIONS, store: w.make() });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await begin(page);
    await walkAll(page);
    await page.getByRole('button', { name: 'Finish', exact: true }).click();
    await expect(page.locator('.done')).toHaveText('Your answers were sent to the study team.');
    const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
    expect(sent.map((r) => r.path)).toEqual([w.path]);
    const row = JSON.parse(sent[0].body);
    const columns = await sqlColumns('supabase-hitopbr-questions.sql');
    expect(columns.length, 'the fixture has column lines').toBe(5 + 45 + 4);
    expect(Object.keys(row)).toEqual(columns);
    expect(['q_age', 'q_sex', 'q_note', 'q_days'].map((k) => row[k])).toEqual(['', '', '', '']);
  });
}

for (const mode of MODES) {
  test(`the saved file carries the question columns after the items, ${mode.name}`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'pid5bf', study: 'qcols', ...mode.config, questions: QUESTIONS }, { extra: mode.extra });
    const download = awaitDownload(page);
    await walk(page);
    const [header, row] = parseCsv(await readFile(await (await download).path(), 'utf8'));
    expect(header.length).toBe(mode.lead.length + ITEMS + COLUMNS.length);
    expect(header.slice(0, mode.lead.length)).toEqual(mode.lead);
    expect(header.slice(mode.lead.length, mode.lead.length + ITEMS).every((h) => /^pid5bf_\d+$/.test(h))).toBe(true);
    expect(header.slice(-COLUMNS.length)).toEqual(COLUMNS);
    expect(row.slice(-COLUMNS.length)).toEqual(VALUES);
  });

  test(`the posted row carries the question keys after the items as strings, ${mode.name}`, async ({ page }) => {
    const from = store().requests.length;
    await openForm(
      page, base(),
      { instrument: 'pid5bf', study: 'qcols', ...mode.config, questions: QUESTIONS, store: webhook(store()) },
      { extra: mode.extra },
    );
    await walk(page);
    await expect(page.locator('.done')).toHaveText('Your answers were sent to the study team.');
    const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
    expect(sent).toHaveLength(1);
    const row = JSON.parse(sent[0].body);
    const keys = Object.keys(row);
    expect(keys.length).toBe(mode.lead.length + ITEMS + COLUMNS.length);
    expect(keys.slice(0, mode.lead.length)).toEqual(mode.lead);
    expect(keys.slice(-COLUMNS.length)).toEqual(COLUMNS);
    expect(COLUMNS.map((k) => row[k])).toEqual(VALUES);
    for (const k of COLUMNS) expect(typeof row[k], k).toBe('string');
  });
}

// QC3
const READER_QUESTIONS = {
  before: [
    { name: 'age', text: 'Your age', type: 'number', min: 0, max: 120, required: true },
    { name: 'sex', text: 'Your sex', type: 'choice', options: ['Female', 'Male', 'Another'] },
  ],
  after: [
    { name: 'days', text: 'Days you work', type: 'multi', options: ['Mon', 'Tue', 'Wed'] },
    { name: 'note', text: 'Anything to add?', type: 'text' },
    { name: 'more', text: 'Anything else?', type: 'text' },
  ],
};

test('a HiTOP-BR walk with one question of each type saves responses-hitopbr-questions.csv', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture', participant: 'p001', questions: READER_QUESTIONS });
  const download = awaitDownload(page);
  await page.locator('.question[data-name=age] input').fill('007');
  await page.getByLabel('Male', { exact: true }).check();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await begin(page);
  await walkAll(page);
  await expect(page.locator('h1')).toHaveText('Before you finish');
  await page.getByLabel('Wed').check();
  await page.getByLabel('Mon').check();
  await page.locator('.question[data-name=note] input').fill('Hello, "world"');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  const [header, row] = parseCsv(text);
  expect(header.slice(-5)).toEqual(['q_age', 'q_sex', 'q_days', 'q_note', 'q_more']);
  expect(row.slice(-5)).toEqual(['7', '2', '1 3', 'Hello, "world"', '']);
  if (process.env.WRITE_FIXTURES) await writeFile(path.join(FIXTURES, 'responses-hitopbr-questions.csv'), text);
  const [fHeader, fRow] = parseCsv(await readFixture('responses-hitopbr-questions.csv'));
  expect(header).toEqual(fHeader);
  const skip = new Set(['submitted', 'form_build'].map((c) => header.indexOf(c)));
  expect(row.filter((_, i) => !skip.has(i))).toEqual(fRow.filter((_, i) => !skip.has(i)));
});
