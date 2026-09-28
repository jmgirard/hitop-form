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

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  useTarget, useStore, allowLocalStore, openForm, webhook, begin, walkAll, awaitDownload, parseCsv, leadColumns,
  prolificQuery,
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
    await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
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
