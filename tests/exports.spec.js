// The copies of the instrument exports in tests/fixtures/exports/, which
// answer the page's export requests when FORM_TARGET is empty, against the
// files the package's site serves. Runs only with FORM_TARGET set, as on the
// weekly run, so a pull request's run never waits on the site.
//
//   E1: the text of each of the five copies equals the site's file

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect, fetchExport, exportUrl, FIXTURES } from './helpers.mjs';

// Stated here rather than read from the directory, so a copy that goes
// missing fails rather than drops out.
const COPIES = ['hitopbr', 'hitopsr', 'pid5', 'pid5sf', 'pid5bf'];

for (const instrument of COPIES) {
  test(`E1: the copy of ${instrument}.json equals the site's file`, async () => {
    test.skip(!process.env.FORM_TARGET?.trim(), 'the copies are checked against the site only when FORM_TARGET is set');
    const live = await fetchExport(instrument, { text: true });
    const copy = await readFile(path.join(FIXTURES, 'exports', `${instrument}.json`), 'utf8');
    expect(copy === live, `tests/fixtures/exports/${instrument}.json equals ${exportUrl(instrument)}. If it does not, refresh the copy as tests/fixtures/README.md says.`).toBe(true);
  });
}
