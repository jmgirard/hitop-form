// The Supabase SQL and the sends of a list link.
//
//   IS1: the builder's SQL for a Supabase table under two instruments equals
//        a committed fixture byte for byte: the HiTOP-BR then the PID-5-BF
//        with nothing else (supabase-hitopbr-pid5bf.sql), and the PID-5-BF
//        then the HiTOP-BR under the random order, Prolific and one question
//        before and one after the form
//        (supabase-pid5bf-hitopbr-prolific-shuffle-questions.sql). Both
//        fixtures were written by rule from older ones (tests/fixtures/
//        README.md)
//   IS2: a walk under each of those two links posts one row to a webhook
//        and one to a supabase store on the recording server, and the keys
//        of each posted row equal the fixture's column lines, in order

import { test, expect } from '@playwright/test';
import {
  useTarget, openSectionOf, useStore, allowLocalStore, formUrl, webhook, supabase, begin, answerPage, currentPage, nextButton,
  readFixture, prolificQuery, chosenIndexFor,
} from './helpers.mjs';

const base = useTarget();
const store = useStore();

test.beforeEach(async ({ context }) => allowLocalStore(context));

const TABLE = 'list_responses';

const CASES = [
  {
    fixture: 'supabase-hitopbr-pid5bf.sql',
    stems: ['hitopbr', 'pid5bf'],
    config: { participant: 'p1' },
  },
  {
    fixture: 'supabase-pid5bf-hitopbr-prolific-shuffle-questions.sql',
    stems: ['pid5bf', 'hitopbr'],
    config: {
      shuffle: true,
      prolific: true,
      questions: {
        before: [{ name: 'age', text: 'How old are you?', type: 'number' }],
        after: [{ name: 'note', text: 'Anything to add?', type: 'text' }],
      },
    },
    extra: prolificQuery(),
  },
];

// The column names of a fixture's create table statement, in order.
async function sqlColumns(fixture) {
  return (await readFixture(fixture)).split('\n').filter((l) => /^ {2}"/.test(l)).map((l) => /^ {2}"([^"]+)"/.exec(l)[1]);
}

// Fills the builder for a case with a Supabase table and returns its SQL.
async function builderSql(page, c) {
  await page.goto(`${base()}link.html`);
  const add = page.getByRole('button', { name: 'Add an instrument' });
  while ((await page.locator('#instrumentList select').count()) < c.stems.length) await add.click();
  for (let k = 0; k < c.stems.length; k++) await page.locator('#instrumentList select').nth(k).selectOption(c.stems[k]);
  await page.locator('input[name="study"]').fill('list');
  if (c.config.participant || c.config.prolific) await openSectionOf(page, 'participant');
  if (c.config.participant) await page.locator('input[name="participant"]').fill(c.config.participant);
  if (c.config.shuffle) {
    await openSectionOf(page, 'shuffle');
    await page.locator('input[name="shuffle"]').check();
  }
  if (c.config.prolific) await page.locator('select[name="site"]').selectOption('prolific');
  if (c.config.questions) await openSectionOf(page, '#addQuestion');
  for (const list of ['before', 'after']) {
    for (const q of c.config.questions?.[list] ?? []) {
      await page.getByRole('button', { name: 'Add a question' }).click();
      const group = page.locator('fieldset.question-edit').last();
      await group.locator('select[name="qList"]').selectOption(list);
      await group.locator('input[name="qName"]').fill(q.name);
      await group.locator('input[name="qText"]').fill(q.text);
      await group.locator('select[name="qType"]').selectOption(q.type);
    }
  }
  await page.locator('select[name="storeKind"]').selectOption('supabase');
  await page.locator('input[name="supabaseUrl"]').fill('https://abcdefghijkl.supabase.co');
  await page.locator('input[name="supabaseKey"]').fill('sb_publishable_test');
  await page.locator('input[name="supabaseTable"]').fill(TABLE);
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toBeEmpty();
  await expect(page.locator('#err')).toHaveText('');
  return page.locator('#sql').inputValue();
}

// Walks a case's link to Finish: the before screen, each instrument by its
// own pattern, and the after screen.
async function walk(page, c) {
  if (c.config.questions) {
    await page.locator('.question[data-name=age] input').fill('30');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  for (let k = 0; k < c.stems.length; k++) {
    await begin(page);
    for (;;) {
      const { page: p, of } = await currentPage(page);
      await answerPage(page, { choose: chosenIndexFor(k) });
      await nextButton(page).click();
      if (p === of) break;
      await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${of}`);
    }
  }
  if (c.config.questions) await page.getByRole('button', { name: 'Finish', exact: true }).click();
}

for (const c of CASES) {
  // IS1
  test(`the builder's SQL equals ${c.fixture}`, async ({ page }) => {
    const sql = await builderSql(page, c);
    expect(sql).toBe(await readFixture(c.fixture));
  });

  // IS2
  for (const w of [
    { name: 'a webhook', make: () => webhook(store(), '/record'), path: '/record' },
    { name: 'a supabase store', make: () => supabase(store(), { table: TABLE }), path: `/rest/v1/${TABLE}` },
  ]) {
    test(`a walk posts every column of ${c.fixture} to ${w.name}`, async ({ page }) => {
      const from = store().requests.length;
      await page.goto(formUrl(base(), { instruments: c.stems, study: 'list', ...c.config, store: w.make() }, c.extra));
      await walk(page, c);
      await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
      const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
      expect(sent.map((r) => r.path)).toEqual([w.path]);
      const columns = await sqlColumns(c.fixture);
      expect(columns.length, 'the fixture has its column lines').toBeGreaterThan(70);
      expect(Object.keys(JSON.parse(sent[0].body))).toEqual(columns);
    });
  }
}
