// A link's `participantParam` field: the participant identifier taken from
// an address parameter the recruiting site fills (SONA's `id=%SURVEY_CODE%`,
// CloudResearch Connect's `participantId`).
//
//   P1: under participantParam: "id", an address carrying id=30039 shows no
//       identifier field, and the saved file's participant is 30039
//   P2: under participantParam: "id", the start screen asks for the
//       identifier when id is a lone %SURVEY_CODE%, blank, a {{…}} value, or
//       absent; the %SURVEY_CODE% walk saves the typed identifier
//   P3: an address carrying id twice, first as %SURVEY_CODE% and then
//       filled, shows no identifier field and saves the filled value
//   P4: a parameter name holding "." and "-" (survey.code-1) is read as P1
//       reads id
//   P5: a link with neither participantParam nor prolific: true and no
//       participant asks for the identifier with id=30039 in the address
//   P6: readParticipantParam() itself: the first filled value of a doubled
//       parameter in either order, the placeholder forms and blanks skipped
//   P7: with shuffle off and with shuffle on, the saved file's header and
//       the posted row's keys under participantParam equal those of the
//       same link without it, the identifier given as participant instead

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  useTarget, useStore, allowLocalStore, webhook, openForm, begin, walkAll, awaitDownload, parseCsv, leadColumns,
} from './helpers.mjs';
import { readParticipantParam } from '../form.js';

const base = useTarget();
const store = useStore();

test.beforeEach(async ({ context }) => allowLocalStore(context));

const SONA_CODE = '30039';

// Walks the HiTOP-BR to Finish with no store and returns the saved file's
// rows. `typed` is entered on the start screen when it asks.
async function walkToFile(page, config, { extra = '', typed } = {}) {
  await openForm(page, base(), config, { extra });
  await begin(page, typed);
  const downloading = awaitDownload(page);
  await walkAll(page);
  return parseCsv(await readFile(await (await downloading).path(), 'utf8'));
}

// P1
test('under participantParam, a filled id in the address is the participant', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'id' }, { extra: `&id=${SONA_CODE}` });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
  expect(rows[0].slice(0, 5)).toEqual(leadColumns());
  expect(rows[1].slice(0, 3)).toEqual(['recruit', SONA_CODE, 'hitopbr']);
});

// P2
for (const c of [
  { name: 'a lone %SURVEY_CODE%', extra: '&id=%SURVEY_CODE%', walk: true },
  { name: 'blank', extra: '&id=' },
  { name: 'a {{…}} value', extra: '&id={{participantId}}' },
  { name: 'absent', extra: '' },
]) {
  test(`under participantParam, an id that is ${c.name} shows the identifier field`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'id' }, { extra: c.extra });
    await expect(page.locator('input[name="participant"]')).toBeVisible();
    await expect(page.locator('input[name="participant"]')).toHaveValue('');
    if (!c.walk) return;
    await begin(page, 'typed');
    const downloading = awaitDownload(page);
    await walkAll(page);
    const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
    expect(rows[1].slice(0, 3)).toEqual(['recruit', 'typed', 'hitopbr']);
  });
}

// P3
test('under participantParam, an id carried as %SURVEY_CODE% and then filled saves the filled value', async ({ page }) => {
  const rows = await walkToFile(page, { instrument: 'hitopbr', study: 'recruit', participantParam: 'id' }, {
    extra: `&id=%SURVEY_CODE%&id=${SONA_CODE}`,
  });
  expect(rows[1].slice(0, 3)).toEqual(['recruit', SONA_CODE, 'hitopbr']);
});

// P4
test('a participantParam holding "." and "-" is read from the address', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit', participantParam: 'survey.code-1' }, {
    extra: '&survey.code-1=777',
  });
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  const rows = parseCsv(await readFile(await (await downloading).path(), 'utf8'));
  expect(rows[1].slice(0, 3)).toEqual(['recruit', '777', 'hitopbr']);
});

// P5
test('without participantParam or prolific, an id in the address does not fill the identifier', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'recruit' }, { extra: `&id=${SONA_CODE}&participantId=abc` });
  await expect(page.locator('input[name="participant"]')).toBeVisible();
  await expect(page.locator('input[name="participant"]')).toHaveValue('');
});

// P6: read in Node from form.js, which the page imports unchanged.
test('readParticipantParam() reads the first filled value and skips blanks and placeholders', () => {
  expect(readParticipantParam(`?id=${SONA_CODE}`, 'id')).toBe(SONA_CODE);
  expect(readParticipantParam(`?id=%SURVEY_CODE%&id=${SONA_CODE}`, 'id'), 'placeholder then filled').toBe(SONA_CODE);
  expect(readParticipantParam(`?id=${SONA_CODE}&id=%SURVEY_CODE%`, 'id'), 'filled then placeholder').toBe(SONA_CODE);
  expect(readParticipantParam(`?id=${SONA_CODE}&id=second`, 'id'), 'two filled').toBe(SONA_CODE);
  expect(readParticipantParam('?id=&id=%20', 'id'), 'blanks').toBe('');
  expect(readParticipantParam('?id={{%PROLIFIC_PID%}}', 'id'), 'a Prolific placeholder').toBe('');
  expect(readParticipantParam(`?ID=${SONA_CODE}`, 'id'), 'another case is another name').toBe('');
  expect(readParticipantParam('?participantId=abc123', 'participantId')).toBe('abc123');
});

// P7: the file's header and the row's keys, each walked with and without
// participantParam, the identifier given as participant in the second.
for (const shuffle of [false, true]) {
  const extraFields = shuffle ? { shuffle } : {};
  test(`the saved file's header is the same with and without participantParam${shuffle ? ' under shuffle' : ''}`, async ({ page }) => {
    const withParam = await walkToFile(page, { instrument: 'hitopbr', study: 'recruit', participantParam: 'id', ...extraFields }, {
      extra: `&id=${SONA_CODE}`,
    });
    const without = await walkToFile(page, { instrument: 'hitopbr', study: 'recruit', participant: SONA_CODE, ...extraFields });
    expect(withParam[0].slice(0, shuffle ? 6 : 5)).toEqual(leadColumns({ shuffle }));
    expect(withParam[0]).toEqual(without[0]);
    expect(withParam[1][1]).toBe(SONA_CODE);
  });

  test(`the posted row's keys are the same with and without participantParam${shuffle ? ' under shuffle' : ''}`, async ({ page }) => {
    const rows = [];
    for (const [config, extra] of [
      [{ participantParam: 'id' }, `&id=${SONA_CODE}`],
      [{ participant: SONA_CODE }, ''],
    ]) {
      const from = store().requests.length;
      await openForm(page, base(), {
        instrument: 'hitopbr', study: 'recruit', ...config, ...extraFields, store: webhook(store(), '/record'),
      }, { extra });
      await begin(page);
      await walkAll(page);
      await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
      const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
      expect(sent.length).toBe(1);
      rows.push(JSON.parse(sent[0].body));
    }
    expect(Object.keys(rows[0]).slice(0, shuffle ? 6 : 5)).toEqual(leadColumns({ shuffle }));
    expect(Object.keys(rows[0])).toEqual(Object.keys(rows[1]));
    expect(rows[0].participant).toBe(SONA_CODE);
  });
}
