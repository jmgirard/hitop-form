// The export's version display and the format guard.
//
//   G1: the start screen and the done screen show the export's buildDate and
//       packageVersion (form_build in the saved file is S2 in save.spec.js)
//   G2: an export whose format is a string other than "1.0" is refused with
//       a message naming the format found, and no form starts
//   G3: an export with no format field is refused with a message saying so
//   G4: an export whose format is not a string is refused with a message
//       naming the value found
//
// The altered exports are copies of the live export served in its place, so
// nothing but the one field differs.

import { test, expect } from '@playwright/test';
import { useTarget, openForm, begin, walkAll, fetchExport } from './helpers.mjs';

const base = useTarget();

test('the start and done screens show the export build and package version', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g1' });
  // G1
  const version = page.locator('.version');
  await expect(version).toContainText(exp.buildDate);
  await expect(version).toContainText(exp.packageVersion);
  await begin(page);
  await walkAll(page);
  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(version).toContainText(exp.buildDate);
  await expect(version).toContainText(exp.packageVersion);
});

const PROBES = [
  { name: 'altered', alter: (e) => ({ ...e, format: '2.0' }), names: 'format "2.0"' },
  {
    name: 'absent',
    alter: (e) => { const c = { ...e }; delete c.format; return c; },
    names: 'no format field',
  },
  { name: 'non-string', alter: (e) => ({ ...e, format: 1 }), names: 'a format that is not text (1)' },
];

for (const probe of PROBES) {
  test(`an export with format ${probe.name} is refused, naming what was found`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const served = probe.alter(exp);
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g2' }, {
      exportJson: served,
    });
    // G2, G3, G4
    const alert = page.locator('[role=alert]');
    await expect(alert).toContainText('This page reads format "1.0"');
    await expect(alert).toContainText(probe.names);
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
  });
}

test('the live export is accepted (the probes fail for their field, not for the copy)', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g3' }, {
    exportJson: exp,
  });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  // The start screen holds an empty alert slot for the participant box; a
  // refusal would have filled it.
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
});
