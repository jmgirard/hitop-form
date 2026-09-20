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
//
// Run with WRITE_FIXTURES=1 to rewrite the three fixtures from a capture.
// Walked for the full HiTOP-BR, the full HiTOP-SR and the shuffled module.

import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  useTarget, openForm, begin, walkAll, fetchExport, readDescriptor, chosenIndex, FIXTURES,
} from './helpers.mjs';

const base = useTarget();
const LEAD = ['study', 'participant', 'instrument', 'form_build', 'submitted'];

// RFC 4180: fields separated by commas, quoted when they hold a comma, a
// quote or a line break, a quote inside doubled; rows end in CRLF.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const CASES = [
  { name: 'hitopbr', fixture: 'responses-hitopbr.csv', config: { instrument: 'hitopbr' } },
  { name: 'hitopsr', fixture: 'responses-hitopsr.csv', config: { instrument: 'hitopsr' } },
  { name: 'shuffled module', fixture: 'responses-module-shuffled.csv', module: 'module-shuffled.json' },
];

for (const c of CASES) {
  test(`${c.name}: the saved CSV`, async ({ page }) => {
    const module = c.module ? await readDescriptor(c.module) : undefined;
    const instrument = module ? module.instrument : c.config.instrument;
    const exp = await fetchExport(instrument);
    const config = { instrument, study: 'fixture', participant: 'p001', ...(module ? { module } : {}) };

    const byNumber = new Map(exp.items.map((it) => [it.number, it]));
    const order = module ? module.itemOrder ?? module.items : exp.items.map((it) => it.number);
    const names = order.map((n) => byNumber.get(n).name);
    const optionCount = exp.instructions.options.length;
    const expectedValues = order.map((_, i) => exp.instructions.options[chosenIndex(i + 1, optionCount)].value);

    await openForm(page, base(), config);
    await begin(page);
    const before = Date.now();
    const downloading = page.waitForEvent('download');
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
    const [study, participant, instr, formBuild, submitted, ...values] = rows[1];
    expect({ study, participant, instr, formBuild }).toEqual({
      study: 'fixture', participant: 'p001', instr: exp.stem, formBuild: exp.buildDate,
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
      new RegExp(`^${exp.stem}_fixture_p001_\\d{8}T\\d{6}Z\\.csv$`),
    );

    // S4
    const fixturePath = path.join(FIXTURES, c.fixture);
    if (process.env.WRITE_FIXTURES) await writeFile(fixturePath, text);
    const fixture = parseCsv(await readFile(fixturePath, 'utf8'));
    const mask = (r) => r.map((v, i) => (i === 3 || i === 4 ? '<varies>' : v));
    expect(rows.map(mask)).toEqual(fixture.map(mask));
  });
}
