// The saved file: one CSV per finished form.
//
//   S1: the header is study,participant,instrument,form_build,submitted
//       followed by the export's item names in rendered order (the
//       descriptor's items in that order when the link carries one)
//   S2: the one data row holds the study fields, form_build equal to the
//       export's buildDate, and submitted as an ISO-8601 UTC timestamp taken
//       during the test
//   S3: each item's value is the integer value of the option chosen
//   S4: the file equals the committed fixture in every column but submitted
//       and form_build (which move with the clock and the export's build)
//   S5: the suggested file name is <instrument>_<study>_<participant>_<stamp>.csv
//   S7: on a form whose options start at 0, the item at position 4, where
//       the answer pattern picks the first option, is written as 0
//   S8: under shuffle: true, the saved file has the five lead columns, then
//       item_order holding the shown order as item numbers joined by single
//       spaces, then the item columns in the export's order (a module's
//       items order, its itemOrder not followed), each holding the answer
//       chosen at the position that item was shown at; walked for the
//       HiTOP-BR and the shuffled module
//   S9: the committed shuffled HiTOP-BR file (responses-hitopbr-shuffled.csv,
//       one S8 walk captured) has that shape, and its values agree with its
//       own item_order cell under the answer pattern
//   S10: under shuffle: false, the HiTOP-BR saves the file S1 to S4 describe,
//       equal to the same fixture: no item_order column
//
// Run with WRITE_FIXTURES=1 to rewrite the fixtures from a capture.
// Walked for the full HiTOP-BR, the full HiTOP-SR, the shuffled module and
// the three PID-5 forms, then the HiTOP-BR and the module under shuffle.

import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  useTarget, openForm, begin, walkAll, fetchExport, readDescriptor, chosenIndex, FIXTURES, awaitDownload, parseCsv,
  expectShuffled, readFixture,
} from './helpers.mjs';

const base = useTarget();
const LEAD = ['study', 'participant', 'instrument', 'form_build', 'submitted'];

// The fourth case has no fixture: it carries a comma, a double quote and a
// non-ASCII character through the link and into the file, so the quoting
// the reader depends on (S6) and the link's UTF-8 round trip are exercised.
const CASES = [
  { name: 'hitopbr', fixture: 'responses-hitopbr.csv', config: { instrument: 'hitopbr' } },
  // S10: shuffle: false saves the same file as no shuffle field: five lead
  // columns, no item_order, the export's order. Compared to the same fixture.
  { name: 'hitopbr with shuffle: false', fixture: 'responses-hitopbr.csv', config: { instrument: 'hitopbr' }, shuffle: false },
  { name: 'hitopsr', fixture: 'responses-hitopsr.csv', config: { instrument: 'hitopsr' } },
  { name: 'shuffled module', fixture: 'responses-module-shuffled.csv', module: 'module-shuffled.json' },
  { name: 'pid5', fixture: 'responses-pid5.csv', config: { instrument: 'pid5' }, zeroAt: 4 },
  { name: 'pid5sf', fixture: 'responses-pid5sf.csv', config: { instrument: 'pid5sf' }, zeroAt: 4 },
  { name: 'pid5bf', fixture: 'responses-pid5bf.csv', config: { instrument: 'pid5bf' }, zeroAt: 4 },
  {
    name: 'quoted fields',
    config: { instrument: 'hitopbr' },
    study: 'Pilot, wave "2"',
    participant: 'p-ü',
    quoted: '"Pilot, wave ""2""",p-ü,hitopbr,',
    fileStem: 'hitopbr_Pilot-wave-2_p',
  },
];

for (const c of CASES) {
  test(`${c.name}: the saved CSV`, async ({ page }) => {
    const module = c.module ? await readDescriptor(c.module) : undefined;
    const instrument = module ? module.instrument : c.config.instrument;
    const exp = await fetchExport(instrument);
    const study = c.study ?? 'fixture';
    const participant = c.participant ?? 'p001';
    const config = {
      instrument, study, participant, ...(module ? { module } : {}), ...(c.shuffle !== undefined ? { shuffle: c.shuffle } : {}),
    };

    const byNumber = new Map(exp.items.map((it) => [it.number, it]));
    const order = module ? module.itemOrder ?? module.items : exp.items.map((it) => it.number);
    const names = order.map((n) => byNumber.get(n).name);
    const optionCount = exp.instructions.options.length;
    const expectedValues = order.map((_, i) => exp.instructions.options[chosenIndex(i + 1, optionCount)].value);

    await openForm(page, base(), config);
    await begin(page);
    const before = Date.now();
    const downloading = awaitDownload(page);
    await walkAll(page);
    const download = await downloading;
    const after = Date.now();
    const text = await readFile(await download.path(), 'utf8');
    expect(text.endsWith('\r\n'), 'rows end in CRLF').toBe(true);
    const rows = parseCsv(text);

    // S1
    expect(rows.length, 'a header and one data row').toBe(2);
    expect(rows[0]).toEqual([...LEAD, ...names]);

    // S2
    const [studyRead, participantRead, instr, formBuild, submitted, ...values] = rows[1];
    expect({ study: studyRead, participant: participantRead, instr, formBuild }).toEqual({
      study, participant, instr: exp.stem, formBuild: exp.buildDate,
    });
    expect(submitted).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    const t = Date.parse(submitted);
    expect(t).toBeGreaterThanOrEqual(Math.floor(before / 1000) * 1000);
    expect(t).toBeLessThanOrEqual(after);

    // S3
    expect(values.length).toBe(names.length);
    for (const v of values) expect(v, 'an integer').toMatch(/^-?\d+$/);
    expect(values.map(Number)).toEqual(expectedValues);

    // S5
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^${c.fileStem ?? `${exp.stem}_fixture_p001`}_\\d{8}T\\d{6}Z\\.csv$`),
    );

    // S6: the raw bytes hold the quoted field as RFC 4180 writes it.
    if (c.quoted) expect(text).toContain(`\r\n${c.quoted}`);

    // S7: a chosen 0 reaches the file as the text 0, not as a blank.
    if (c.zeroAt) {
      expect(chosenIndex(c.zeroAt, optionCount), 'the pattern picks the first option').toBe(0);
      expect(exp.instructions.options[0].value, 'the first option is worth 0').toBe(0);
      expect(values[c.zeroAt - 1], `the answer at position ${c.zeroAt}`).toBe('0');
    }

    // S4
    if (!c.fixture) return;
    const fixturePath = path.join(FIXTURES, c.fixture);
    if (process.env.WRITE_FIXTURES) await writeFile(fixturePath, text);
    const fixture = parseCsv(await readFile(fixturePath, 'utf8'));
    const mask = (r) => r.map((v, i) => (i === 3 || i === 4 ? '<varies>' : v));
    expect(rows.map(mask)).toEqual(fixture.map(mask));
  });
}

// S8: the shuffled walks. The order differs on every load, so no fixture
// is compared; each value is checked against the pattern at the position
// its item was shown at. The HiTOP-BR walk's file is captured as
// responses-hitopbr-shuffled.csv under WRITE_FIXTURES, for S9 and for the
// hitop package's reader test.
const SHUFFLED = [
  { name: 'hitopbr', config: { instrument: 'hitopbr' }, fixture: 'responses-hitopbr-shuffled.csv' },
  { name: 'shuffled module', module: 'module-shuffled.json' },
];

for (const c of SHUFFLED) {
  test(`${c.name} under shuffle: the saved CSV keeps the instrument order and records the shown order`, async ({ page }) => {
    const module = c.module ? await readDescriptor(c.module) : undefined;
    const instrument = module ? module.instrument : c.config.instrument;
    const exp = await fetchExport(instrument);
    const config = { instrument, study: 'fixture', participant: 'p001', shuffle: true, ...(module ? { module } : {}) };
    const numbers = module ? module.items : exp.items.map((it) => it.number);

    await openForm(page, base(), config);
    await begin(page);
    const downloading = awaitDownload(page);
    const seen = await walkAll(page);
    const download = await downloading;
    const text = await readFile(await download.path(), 'utf8');
    const rows = parseCsv(text);
    expect(rows.length, 'a header and one data row').toBe(2);
    const shown = seen.map((s) => s.number);
    expect(shown, 'the walk saw a rearrangement').not.toEqual(numbers);
    expectShuffled(rows[0], rows[1], { exp, numbers, shown });
    expect(rows[1].slice(0, 4)).toEqual(['fixture', 'p001', exp.stem, exp.buildDate]);
    if (c.fixture && process.env.WRITE_FIXTURES) await writeFile(path.join(FIXTURES, c.fixture), text);
  });
}

// S9: the committed capture agrees with itself. Its item_order cell is the
// order that walk saw, so the values are checked against it as S8 checks a
// live walk against the order it saw.
test('the committed shuffled HiTOP-BR file has the shuffle shape and agrees with its item_order', async () => {
  const exp = await fetchExport('hitopbr');
  const rows = parseCsv(await readFixture('responses-hitopbr-shuffled.csv'));
  expect(rows.length).toBe(2);
  const numbers = exp.items.map((it) => it.number);
  const shown = rows[1][5].split(' ').map(Number);
  expect(shown, 'the capture saw a rearrangement').not.toEqual(numbers);
  expectShuffled(rows[0], rows[1], { exp, numbers, shown });
  expect(rows[1].slice(0, 3)).toEqual(['fixture', 'p001', 'hitopbr']);
});
