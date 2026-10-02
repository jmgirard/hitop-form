// The row and the file of a list link: one group of item columns per
// instrument, in the link's order.
//
//   IR1: a walk of the HiTOP-BR then the PID-5-BF, each answered by its own
//        pattern (chosenIndexFor() of its place), saves a file and posts a
//        row to a webhook, each with: the lead columns; an `instrument`
//        cell of the two stems joined by a space; a `form_build` cell of the
//        two exports' build dates joined by a space; the 45 HiTOP-BR item
//        columns, then the 25 PID-5-BF ones, each in its export's order and
//        holding the value its instrument's pattern chose; and the q_
//        columns after all the items. Walked with shuffle off, with shuffle
//        on, with prolific: true, and with questions. In every mode each
//        instrument's pages show only its own items (their `data-stem`).
//        Under shuffle the `item_order` cell is one group per instrument, in
//        link order, joined by " | ", each group the numbers in the order
//        shown.
//   IR2: the same for three instruments (the PID-5-BF, a HiTOP-SR module,
//        the HiTOP-BR) under shuffle, the HiTOP-SR group holding the
//        module's items.
//
//   IR3: a walk of the HiTOP-BR, the PID-5-BF and the whole HiTOP-SR, for
//        study fixture and participant p001, under shuffle and with one
//        question before the form (age, typed 30), saves a file with the
//        IR1 shape. responses-multi-page-shuffled.csv holds one such file:
//        its header equals the walk's, and its values follow from its own
//        item_order cell by the same rule. Run with WRITE_FIXTURES=1 to
//        rewrite it. The hitop package's reader test reads a copy.
//
// The expected cells are worked out here from the exports, the descriptor
// and the pattern, not read from form.js.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  test, expect, useTarget, useStore, allowLocalStore, formUrl, webhook, begin, answerPage, currentPage, nextButton, awaitDownload,
  parseCsv, leadColumns, fetchExport, readDescriptor, chosenIndexFor, prolificQuery, PROLIFIC, PAGE_SIZE, FIXTURES,
  readFixture,
} from './helpers.mjs';

const base = useTarget();
const store = useStore();

test.beforeEach(async ({ context }) => allowLocalStore(context));

const QUESTIONS = {
  before: [{ name: 'age', text: 'How old are you?', type: 'number' }],
  after: [{ name: 'note', text: 'Anything to add?', type: 'text' }],
};

// Walks the pages of the instrument at place `k`, answering by its pattern,
// and presses the last page's button. Returns the items shown, as their
// stem and number, in order.
async function walkPart(page, k) {
  const shown = [];
  for (;;) {
    const { page: p, of } = await currentPage(page);
    shown.push(...(await page.$$eval('fieldset.item', (ns) => ns.map((n) => ({ stem: n.dataset.stem, number: Number(n.dataset.number) })))));
    await answerPage(page, { choose: chosenIndexFor(k) });
    await nextButton(page).click();
    if (p === of) break;
    await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${of}`);
  }
  return shown;
}

// Walks the whole session: the before screen (answered) when the link has
// questions, each instrument, and the after screen (answered) then Finish.
// Returns the item numbers shown, one list per instrument, having checked
// that each instrument's pages showed only its own items.
async function walk(page, stems, { questions = false, participant } = {}) {
  if (questions) {
    await page.locator('.question[data-name=age] input').fill('42');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  const shown = [];
  for (let k = 0; k < stems.length; k++) {
    await expect(page.locator('.part')).toHaveText(`Part ${k + 1} of ${stems.length}`);
    await begin(page, k === 0 ? participant : undefined);
    const items = await walkPart(page, k);
    expect(items.every((it) => it.stem === stems[k]), `the pages of ${stems[k]} show only its items`).toBe(true);
    shown.push(items.map((it) => it.number));
  }
  if (questions) {
    await expect(page.locator('h1')).toHaveText('Before you finish');
    await page.locator('.question[data-name=note] input').fill('ok');
    await page.getByRole('button', { name: 'Finish', exact: true }).click();
  }
  return shown;
}

// Checks one record, as the header and the values of a file row or the keys
// and values of a posted row, both as strings: the lead cells, each
// instrument's group of item columns and values, and the q_ cells.
function expectRecord(header, values, { stems, exps, module, lead, shown, shuffle, prolific, questions }) {
  const columns = exps.map((exp) => {
    const numbers = module && exp.stem === 'hitopsr' ? module.items : exp.items.map((it) => it.number);
    const byNumber = new Map(exp.items.map((it) => [it.number, it]));
    return numbers.map((n) => byNumber.get(n));
  });
  const itemNames = columns.flatMap((items) => items.map((it) => it.name));
  const qNames = questions === 'age' ? ['q_age'] : questions ? ['q_age', 'q_note'] : [];
  expect(header).toEqual([...lead, ...itemNames, ...qNames]);
  const cell = (name) => values[header.indexOf(name)];
  expect(cell('instrument')).toBe(stems.join(' '));
  expect(cell('form_build')).toBe(exps.map((exp) => exp.buildDate).join(' '));
  if (prolific) expect([cell('prolific_study'), cell('prolific_session')]).toEqual([PROLIFIC.study, PROLIFIC.session]);
  if (shuffle) {
    expect(cell('item_order')).toBe(shown.map((g) => g.join(' ')).join(' | '));
    shown.forEach((g, k) => {
      expect([...g].sort((a, b) => a - b), `group ${k + 1} is a rearrangement of its columns`)
        .toEqual(columns[k].map((it) => it.number).sort((a, b) => a - b));
    });
  }
  let at = lead.length;
  exps.forEach((exp, k) => {
    const options = exp.instructions.options;
    for (const it of columns[k]) {
      const position = shown[k].indexOf(it.number) + 1;
      const expected = options[chosenIndexFor(k)(position, options.length)].value;
      expect(values[at], `${it.name}, shown at ${position}`).toBe(String(expected));
      at += 1;
    }
  });
  if (questions === 'age') expect(values.slice(at)).toEqual(['30']);
  else if (questions) expect(values.slice(at)).toEqual(['42', 'ok']);
}

const MODES = [
  { name: 'shuffle off', config: { participant: 'p1' } },
  { name: 'shuffle on', config: { participant: 'p1', shuffle: true }, shuffle: true },
  { name: 'prolific: true', config: { prolific: true }, prolific: true, extra: prolificQuery() },
  { name: 'questions', config: { participant: 'p1', questions: QUESTIONS }, questions: true },
];

const TWO = ['hitopbr', 'pid5bf'];

for (const mode of MODES) {
  const lead = leadColumns({ shuffle: mode.shuffle, prolific: mode.prolific });

  test(`a two-instrument walk saves one group per instrument, ${mode.name}`, async ({ page }) => {
    const exps = await Promise.all(TWO.map((s) => fetchExport(s)));
    await page.goto(formUrl(base(), { instruments: TWO, study: 'rows', ...mode.config }, mode.extra));
    const download = awaitDownload(page);
    const shown = await walk(page, TWO, { questions: mode.questions });
    const d = await download;
    const [header, row] = parseCsv(await readFile(await d.path(), 'utf8'));
    expectRecord(header, row, { stems: TWO, exps, lead, shown, ...mode });
    expect(d.suggestedFilename()).toMatch(/^hitopbr-pid5bf_rows_/);
  });

  test(`a two-instrument walk posts one group per instrument, ${mode.name}`, async ({ page }) => {
    const exps = await Promise.all(TWO.map((s) => fetchExport(s)));
    const from = store().requests.length;
    await page.goto(formUrl(base(), { instruments: TWO, study: 'rows', ...mode.config, store: webhook(store()) }, mode.extra));
    const shown = await walk(page, TWO, { questions: mode.questions });
    await expect(page.locator('.done')).toHaveText('Your answers were sent to the study team.');
    const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
    expect(sent).toHaveLength(1);
    const row = JSON.parse(sent[0].body);
    const keys = Object.keys(row);
    const itemKeys = keys.filter((k) => /^(hitopbr|pid5bf)_\d+$/.test(k));
    expect(itemKeys).toHaveLength(45 + 25);
    for (const k of itemKeys) expect(Number.isInteger(row[k]), `${k} is an integer`).toBe(true);
    expectRecord(keys, keys.map((k) => String(row[k])), { stems: TWO, exps, lead, shown, ...mode });
  });
}

// IR2
const THREE = ['pid5bf', 'hitopsr', 'hitopbr'];

for (const target of ['file', 'row']) {
  test(`a three-instrument walk under shuffle writes one group per instrument, as a ${target}`, async ({ page }) => {
    const exps = await Promise.all(THREE.map((s) => fetchExport(s)));
    const module = await readDescriptor('module-plain.json');
    const from = store().requests.length;
    const config = { instruments: THREE, study: 'rows', participant: 'p3', shuffle: true, module };
    if (target === 'row') config.store = webhook(store());
    await page.goto(formUrl(base(), config));
    const download = target === 'file' ? awaitDownload(page) : null;
    const shown = await walk(page, THREE);
    expect(shown[1]).toHaveLength(module.items.length);
    expect(Math.ceil(shown[1].length / PAGE_SIZE)).toBe(2);
    let header;
    let values;
    if (target === 'file') {
      [header, values] = parseCsv(await readFile(await (await download).path(), 'utf8'));
    } else {
      await expect(page.locator('.done')).toHaveText('Your answers were sent to the study team.');
      const row = JSON.parse(store().requests.slice(from).filter((r) => r.method === 'POST')[0].body);
      header = Object.keys(row);
      values = header.map((k) => String(row[k]));
    }
    expectRecord(header, values, { stems: THREE, exps, module, lead: leadColumns({ shuffle: true }), shown, shuffle: true });
  });
}

// IR3
const PAGE_STEMS = ['hitopbr', 'pid5bf', 'hitopsr'];
const PAGE_QUESTIONS = { before: [{ name: 'age', text: 'How old are you?', type: 'number' }] };

test('a three-instrument walk under shuffle with one question saves responses-multi-page-shuffled.csv', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  const exps = await Promise.all(PAGE_STEMS.map((s) => fetchExport(s)));
  const lead = leadColumns({ shuffle: true });
  await page.goto(formUrl(base(), {
    instruments: PAGE_STEMS, study: 'fixture', participant: 'p001', shuffle: true, questions: PAGE_QUESTIONS,
  }));
  const download = page.waitForEvent('download', { timeout: 3 * 60 * 1000 });
  await page.locator('.question[data-name=age] input').fill('30');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  const shown = await walk(page, PAGE_STEMS);
  const text = await readFile(await (await download).path(), 'utf8');
  const [header, row] = parseCsv(text);
  expectRecord(header, row, { stems: PAGE_STEMS, exps, lead, shown, shuffle: true, questions: 'age' });
  if (process.env.WRITE_FIXTURES) await writeFile(path.join(FIXTURES, 'responses-multi-page-shuffled.csv'), text);
  // The committed file: the same header, and values that follow from its
  // own item_order cell.
  const [fHeader, fRow] = parseCsv(await readFixture('responses-multi-page-shuffled.csv'));
  expect(fHeader).toEqual(header);
  const fShown = fRow[fHeader.indexOf('item_order')].split(' | ').map((g) => g.split(' ').map(Number));
  expectRecord(fHeader, fRow, { stems: PAGE_STEMS, exps, lead, shown: fShown, shuffle: true, questions: 'age' });
  expect(fRow.slice(0, 2)).toEqual(['fixture', 'p001']);
});
