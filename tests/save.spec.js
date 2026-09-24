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
//   S11: under prolific: true, with PROLIFIC_PID, STUDY_ID and SESSION_ID in
//       the page's address, the start screen shows no identifier field, the
//       file's participant is the PROLIFIC_PID, and prolific_study and
//       prolific_session follow submitted (and item_order under shuffle)
//       holding STUDY_ID and SESSION_ID; without shuffle the file equals
//       responses-hitopbr-prolific.csv, written by rule, in every column but
//       submitted and form_build; under shuffle it has the S8 shape with the
//       two columns, and the capture is written as
//       responses-hitopbr-prolific-shuffled.csv under WRITE_FIXTURES
//   S12: under prolific: true with a real PROLIFIC_PID, a STUDY_ID still
//       holding its placeholder and no SESSION_ID, both cells are the empty
//       string
//   S13: under prolific: true with the PROLIFIC_PID absent, blank or still a
//       placeholder, the start screen asks for the identifier; the
//       placeholder walk writes the typed identifier and the two columns
//   S14: without a prolific field, the three parameters in the address change
//       nothing: the file equals responses-hitopbr.csv without shuffle, and
//       has the S8 shape under it
//   S15: the committed prolific capture (responses-hitopbr-prolific-shuffled.csv)
//       has the S11 shape and agrees with its own item_order cell
//   S16: with a complete address in the link and no store, the saved screen
//       shows a link to the address after the file name, labelled by its
//       host, and no request reaches the address within five seconds
//   S17: without a prolific field, a real PROLIFIC_PID in the address of a
//       link with no participant leaves the identifier field shown and empty
//   S18: under prolific: true, an address carrying PROLIFIC_PID twice, once
//       filled and once a placeholder in either order, shows no identifier
//       field and saves the filled ID as the participant; STUDY_ID doubled
//       the same two ways writes the filled value to prolific_study
//   S19: readProlific() itself, for each of the three names: blank-then-filled
//       and filled-then-blank give the filled value, two filled values give
//       the first
//   S20: with complete and completeSaved in the link and no store, the saved
//       screen's link after the file name is completeSaved, labelled by its
//       host, and no request reaches either address within five seconds
//   S21: on the HiTOP-BR walk's saved screen, the trail paragraph ends with
//       "If the file did not appear, press Save the file.", one "Save the
//       file" button follows it, and a first and a second click on it each
//       save the file again under the Finish download's name with its
//       bytes; the screen's order is the heading, the lead, the file name,
//       the trail, the button, the version line, and with a complete address
//       (the S16 walk) the completion link sits between the button and the
//       version line
//
// Run with WRITE_FIXTURES=1 to rewrite the fixtures from a capture.
// Walked for the full HiTOP-BR, the full HiTOP-SR, the shuffled module and
// the three PID-5 forms, then the HiTOP-BR and the module under shuffle, and
// the HiTOP-BR under prolific with and without shuffle.

import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  useTarget, openForm, begin, walkAll, fetchExport, readDescriptor, chosenIndex, FIXTURES, awaitDownload, parseCsv,
  expectShuffled, readFixture, leadColumns, PROLIFIC, prolificQuery, COMPLETE_URL, COMPLETE_SAVED_URL, serveComplete,
  SAVE_AGAIN, expectSaveAgain, savedScreenOrder, screenOrder,
} from './helpers.mjs';
import { readProlific } from '../form.js';

const base = useTarget();
const LEAD = leadColumns();

// The quoted-fields case has no fixture: it carries a comma, a double quote
// and a non-ASCII character through the link and into the file, so the
// quoting the reader depends on (S6) and the link's UTF-8 round trip are
// exercised. A `prolific` case puts prolific: true and no participant in
// the link and the three parameters in the address; an `extra` case puts the
// parameters in the address and nothing in the link.
const CASES = [
  { name: 'hitopbr', fixture: 'responses-hitopbr.csv', config: { instrument: 'hitopbr' } },
  // S10: shuffle: false saves the same file as no shuffle field: five lead
  // columns, no item_order, the export's order. Compared to the same fixture.
  { name: 'hitopbr with shuffle: false', fixture: 'responses-hitopbr.csv', config: { instrument: 'hitopbr' }, shuffle: false },
  // S11 without shuffle, and S14 without shuffle. The prolific fixture is
  // written by rule (see fixtures/README.md), so WRITE_FIXTURES never
  // overwrites it with a capture.
  { name: 'hitopbr under prolific', fixture: 'responses-hitopbr-prolific.csv', byRule: true, config: { instrument: 'hitopbr' }, prolific: true },
  { name: 'hitopbr with the Prolific parameters and no prolific field', fixture: 'responses-hitopbr.csv', config: { instrument: 'hitopbr' }, extra: prolificQuery() },
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
    // Under prolific the identifier is the address's PROLIFIC_PID, and the
    // link carries none.
    const participant = c.prolific ? PROLIFIC.pid : c.participant ?? 'p001';
    const config = {
      instrument, study, ...(c.prolific ? { prolific: true } : { participant }),
      ...(module ? { module } : {}), ...(c.shuffle !== undefined ? { shuffle: c.shuffle } : {}),
    };
    const lead = leadColumns({ prolific: c.prolific === true });

    const byNumber = new Map(exp.items.map((it) => [it.number, it]));
    const order = module ? module.itemOrder ?? module.items : exp.items.map((it) => it.number);
    const names = order.map((n) => byNumber.get(n).name);
    const optionCount = exp.instructions.options.length;
    const expectedValues = order.map((_, i) => exp.instructions.options[chosenIndex(i + 1, optionCount)].value);

    await openForm(page, base(), config, { extra: c.prolific ? prolificQuery() : c.extra });
    // S11: no identifier field under prolific with a PROLIFIC_PID.
    await expect(page.locator('input[name="participant"]')).toHaveCount(0);
    await begin(page);
    const before = Date.now();
    const downloading = awaitDownload(page);
    await walkAll(page);
    const download = await downloading;
    const after = Date.now();
    // Without a complete field the saved screen offers no completion link.
    await expect(page.locator('h1')).toHaveText('Thank you');
    await expect(page.locator('p.complete')).toHaveCount(0);
    const text = await readFile(await download.path(), 'utf8');
    expect(text.endsWith('\r\n'), 'rows end in CRLF').toBe(true);
    const rows = parseCsv(text);

    // S1
    expect(rows.length, 'a header and one data row').toBe(2);
    expect(rows[0]).toEqual([...lead, ...names]);

    // S2
    const [studyRead, participantRead, instr, formBuild, submitted] = rows[1];
    const values = rows[1].slice(lead.length);
    expect({ study: studyRead, participant: participantRead, instr, formBuild }).toEqual({
      study, participant, instr: exp.stem, formBuild: exp.buildDate,
    });
    expect(submitted).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    const t = Date.parse(submitted);
    expect(t).toBeGreaterThanOrEqual(Math.floor(before / 1000) * 1000);
    expect(t).toBeLessThanOrEqual(after);
    // S11: the two cells hold the address's STUDY_ID and SESSION_ID.
    if (c.prolific) expect(rows[1].slice(5, 7)).toEqual([PROLIFIC.study, PROLIFIC.session]);

    // S3
    expect(values.length).toBe(names.length);
    for (const v of values) expect(v, 'an integer').toMatch(/^-?\d+$/);
    expect(values.map(Number)).toEqual(expectedValues);

    // S5
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^${c.fileStem ?? `${exp.stem}_fixture_${participant}`}_\\d{8}T\\d{6}Z\\.csv$`),
    );

    // S6: the raw bytes hold the quoted field as RFC 4180 writes it.
    if (c.quoted) expect(text).toContain(`\r\n${c.quoted}`);

    // S7: a chosen 0 reaches the file as the text 0, not as a blank.
    if (c.zeroAt) {
      expect(chosenIndex(c.zeroAt, optionCount), 'the pattern picks the first option').toBe(0);
      expect(exp.instructions.options[0].value, 'the first option is worth 0').toBe(0);
      expect(values[c.zeroAt - 1], `the answer at position ${c.zeroAt}`).toBe('0');
    }

    // S21: on the HiTOP-BR walk, the trail paragraph names the button, the
    // screen's order, and two clicks each save the file again.
    if (c.name === 'hitopbr') {
      await expect(page.locator('main > p').nth(2)).toHaveText(
        `Please send that file to the study team the way they asked. No answer was sent from this page. ${SAVE_AGAIN}`,
      );
      expect(await screenOrder(page)).toEqual(savedScreenOrder());
      await expectSaveAgain(page, download);
    }

    // S4
    if (!c.fixture) return;
    const fixturePath = path.join(FIXTURES, c.fixture);
    if (process.env.WRITE_FIXTURES && !c.byRule) await writeFile(fixturePath, text);
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
  // S11 under shuffle: the two columns follow item_order. The capture is the
  // hitop package's prolific reader fixture.
  { name: 'hitopbr under prolific', config: { instrument: 'hitopbr' }, prolific: true, fixture: 'responses-hitopbr-prolific-shuffled.csv' },
  // S14 under shuffle: the parameters in the address change nothing.
  { name: 'hitopbr with the Prolific parameters and no prolific field', config: { instrument: 'hitopbr' }, extra: prolificQuery() },
];

for (const c of SHUFFLED) {
  test(`${c.name} under shuffle: the saved CSV keeps the instrument order and records the shown order`, async ({ page }) => {
    const module = c.module ? await readDescriptor(c.module) : undefined;
    const instrument = module ? module.instrument : c.config.instrument;
    const exp = await fetchExport(instrument);
    const participant = c.prolific ? PROLIFIC.pid : 'p001';
    const config = {
      instrument, study: 'fixture', ...(c.prolific ? { prolific: true } : { participant }), shuffle: true, ...(module ? { module } : {}),
    };
    const numbers = module ? module.items : exp.items.map((it) => it.number);

    await openForm(page, base(), config, { extra: c.prolific ? prolificQuery() : c.extra });
    await expect(page.locator('input[name="participant"]')).toHaveCount(0);
    await begin(page);
    const downloading = awaitDownload(page);
    const seen = await walkAll(page);
    const download = await downloading;
    const text = await readFile(await download.path(), 'utf8');
    const rows = parseCsv(text);
    expect(rows.length, 'a header and one data row').toBe(2);
    const shown = seen.map((s) => s.number);
    expect(shown, 'the walk saw a rearrangement').not.toEqual(numbers);
    expectShuffled(rows[0], rows[1], {
      exp, numbers, shown, prolific: c.prolific ? { study: PROLIFIC.study, session: PROLIFIC.session } : undefined,
    });
    expect(rows[1].slice(0, 4)).toEqual(['fixture', participant, exp.stem, exp.buildDate]);
    if (c.fixture && process.env.WRITE_FIXTURES) await writeFile(path.join(FIXTURES, c.fixture), text);
  });
}

// S9 and S15: each committed capture agrees with itself. Its item_order cell
// is the order that walk saw, so the values are checked against it as S8
// checks a live walk against the order it saw.
for (const c of [
  { fixture: 'responses-hitopbr-shuffled.csv', participant: 'p001' },
  { fixture: 'responses-hitopbr-prolific-shuffled.csv', participant: PROLIFIC.pid, prolific: { study: PROLIFIC.study, session: PROLIFIC.session } },
]) {
  test(`the committed ${c.fixture} has the shuffle shape and agrees with its item_order`, async () => {
    const exp = await fetchExport('hitopbr');
    const rows = parseCsv(await readFixture(c.fixture));
    expect(rows.length).toBe(2);
    const numbers = exp.items.map((it) => it.number);
    const shown = rows[1][5].split(' ').map(Number);
    expect(shown, 'the capture saw a rearrangement').not.toEqual(numbers);
    expectShuffled(rows[0], rows[1], { exp, numbers, shown, prolific: c.prolific });
    expect(rows[1].slice(0, 3)).toEqual(['fixture', c.participant, 'hitopbr']);
  });
}

// S16: the completion address with no store: a link, and no navigation.
test('with a complete address and no store, the saved screen links to it after the file name and does not navigate', async ({ page }) => {
  const requests = await serveComplete(page);
  await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture', participant: 'c1', complete: COMPLETE_URL });
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const download = await downloading;

  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(page.locator('code.filename')).toHaveText(download.suggestedFilename());
  const link = page.locator('p.complete a');
  await expect(link).toHaveAttribute('href', COMPLETE_URL);
  await expect(link).toHaveText('app.prolific.com');
  const order = await page.$$eval('code.filename, p.complete a', (nodes) => nodes.map((n) => n.tagName));
  expect(order).toEqual(['CODE', 'A']);
  // S21: the whole screen's order, the button between the trail and the link.
  expect(await screenOrder(page)).toEqual(savedScreenOrder({ complete: true }));
  await page.waitForTimeout(5000);
  expect(requests, 'no request to the completion address').toEqual([]);
  await expect(page).not.toHaveURL(COMPLETE_URL);
});

// S12: a placeholder STUDY_ID and an absent SESSION_ID each write the empty
// string, with a real PROLIFIC_PID as the identifier.
test('under prolific, a placeholder STUDY_ID and no SESSION_ID write empty cells', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture', prolific: true }, {
    extra: prolificQuery({ study: '{{%STUDY_ID%}}', session: null }),
  });
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
  expect(rows[0].slice(0, 7)).toEqual(leadColumns({ prolific: true }));
  expect(rows[1].slice(0, 3)).toEqual(['fixture', PROLIFIC.pid, 'hitopbr']);
  expect(rows[1].slice(5, 7)).toEqual(['', '']);
});

// S13: without a usable PROLIFIC_PID the start screen asks, as it does for a
// link with no participant. The placeholder walk goes on to Finish: the
// typed identifier is the participant, and the two columns are still
// written from the address.
for (const c of [
  { name: 'absent', pid: null },
  { name: 'blank', pid: '%20%20' },
  { name: 'a placeholder', pid: '{{%PROLIFIC_PID%}}', walk: true },
]) {
  test(`under prolific, a PROLIFIC_PID that is ${c.name} shows the identifier field`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture', prolific: true }, {
      extra: prolificQuery({ pid: c.pid }),
    });
    await expect(page.locator('input[name="participant"]')).toBeVisible();
    if (!c.walk) return;
    await begin(page, 'typed');
    const downloading = awaitDownload(page);
    await walkAll(page);
    const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
    expect(rows[0].slice(0, 7)).toEqual(leadColumns({ prolific: true }));
    expect(rows[1].slice(0, 3)).toEqual(['fixture', 'typed', 'hitopbr']);
    expect(rows[1].slice(5, 7)).toEqual([PROLIFIC.study, PROLIFIC.session]);
  });
}

// S17: without a prolific field, a real PROLIFIC_PID in the address is no
// identifier: a link with no participant still asks for one.
test('without a prolific field, a PROLIFIC_PID in the address does not fill the identifier', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture' }, { extra: prolificQuery() });
  await expect(page.locator('input[name="participant"]')).toBeVisible();
  await expect(page.locator('input[name="participant"]')).toHaveValue('');
});

// S18: a parameter twice in the address, once filled and once still a
// placeholder, as when Prolific's own "URL parameters" option appends the
// three to a link that already ends in the builder's placeholders. The
// filled value wins in either order.
const PLACEHOLDER = (name) => `{{%${name}%}}`;
for (const c of [
  { name: 'PROLIFIC_PID as placeholder then filled', extra: `${prolificQuery({ pid: PLACEHOLDER('PROLIFIC_PID') })}&PROLIFIC_PID=${PROLIFIC.pid}` },
  { name: 'PROLIFIC_PID as filled then placeholder', extra: `${prolificQuery()}&PROLIFIC_PID=${PLACEHOLDER('PROLIFIC_PID')}` },
]) {
  test(`under prolific, ${c.name} shows no identifier field and saves the filled ID`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture', prolific: true }, { extra: c.extra });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.locator('input[name="participant"]')).toHaveCount(0);
    await begin(page);
    const downloading = awaitDownload(page);
    await walkAll(page);
    const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
    expect(rows[0].slice(0, 7)).toEqual(leadColumns({ prolific: true }));
    expect(rows[1].slice(0, 3)).toEqual(['fixture', PROLIFIC.pid, 'hitopbr']);
    expect(rows[1].slice(5, 7)).toEqual([PROLIFIC.study, PROLIFIC.session]);
  });
}
for (const c of [
  { name: 'STUDY_ID as placeholder then filled', extra: `${prolificQuery({ study: PLACEHOLDER('STUDY_ID') })}&STUDY_ID=${PROLIFIC.study}` },
  { name: 'STUDY_ID as filled then placeholder', extra: `${prolificQuery()}&STUDY_ID=${PLACEHOLDER('STUDY_ID')}` },
]) {
  test(`under prolific, ${c.name} writes the filled value to prolific_study`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'fixture', prolific: true }, { extra: c.extra });
    await expect(page.locator('input[name="participant"]')).toHaveCount(0);
    await begin(page);
    const downloading = awaitDownload(page);
    await walkAll(page);
    const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
    expect(rows[0].slice(0, 7)).toEqual(leadColumns({ prolific: true }));
    expect(rows[1].slice(0, 3)).toEqual(['fixture', PROLIFIC.pid, 'hitopbr']);
    expect(rows[1].slice(5, 7)).toEqual([PROLIFIC.study, PROLIFIC.session]);
  });
}

// S19: readProlific() on a doubled parameter, for each name: a blank before
// or after the filled value is skipped, and of two filled values the first
// is read. Read in Node from form.js, which the page imports unchanged.
for (const [name, key] of [['PROLIFIC_PID', 'pid'], ['STUDY_ID', 'study'], ['SESSION_ID', 'session']]) {
  test(`readProlific() reads ${name} as its first filled value when the address carries it twice`, () => {
    const filled = PROLIFIC[key];
    const others = { pid: '', study: '', session: '' };
    expect(readProlific(`?${name}=&${name}=${filled}`), 'blank then filled').toEqual({ ...others, [key]: filled });
    expect(readProlific(`?${name}=${filled}&${name}=%20`), 'filled then blank').toEqual({ ...others, [key]: filled });
    expect(readProlific(`?${name}=${filled}&${name}=second`), 'two filled').toEqual({ ...others, [key]: filled });
    expect(readProlific(`?${name}=&${name}=${encodeURIComponent(PLACEHOLDER(name))}`), 'blank then placeholder').toEqual(others);
  });
}

// S20: a completeSaved address beside complete, with no store: the saved
// screen links to completeSaved, and neither address is requested.
test('with complete and completeSaved and no store, the saved screen links to completeSaved and does not navigate', async ({ page }) => {
  const requests = await serveComplete(page);
  const savedRequests = await serveComplete(page, COMPLETE_SAVED_URL);
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'fixture', participant: 'c3', complete: COMPLETE_URL, completeSaved: COMPLETE_SAVED_URL,
  });
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const download = await downloading;

  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(page.locator('code.filename')).toHaveText(download.suggestedFilename());
  const link = page.locator('p.complete a');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', COMPLETE_SAVED_URL);
  await expect(link).toHaveText(new URL(COMPLETE_SAVED_URL).host);
  const order = await page.$$eval('code.filename, p.complete a', (nodes) => nodes.map((n) => n.tagName));
  expect(order).toEqual(['CODE', 'A']);
  await page.waitForTimeout(5000);
  expect(requests, 'no request to the completion address').toEqual([]);
  expect(savedRequests, 'no request to the saved-file completion address').toEqual([]);
  await expect(page).not.toHaveURL(COMPLETE_URL);
  await expect(page).not.toHaveURL(COMPLETE_SAVED_URL);
});
