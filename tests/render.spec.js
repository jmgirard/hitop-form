// Rendering fidelity: what the page shows is what the export holds.
//
//   R1: a link naming an instrument renders the export's instructions.start
//   R2: every rendered item's text equals the export's, in export order, and
//       the count of rendered items equals the export's items array length
//   R3: every item's option labels equal the export's instructions.options
//       labels, in order, with the matching values
//   R4: a link carrying a descriptor with itemOrder renders the descriptor's
//       items in that order and nothing else
//   R5: a link carrying a descriptor without itemOrder renders its items in
//       items order

import { test, expect } from '@playwright/test';
import {
  useTarget, openForm, begin, walkAll, fetchExport, readDescriptor,
} from './helpers.mjs';

const base = useTarget();

for (const instrument of ['hitopsr', 'hitopbr']) {
  test(`${instrument}: instructions, items and options match the export`, async ({ page }) => {
    const exp = await fetchExport(instrument);
    await openForm(page, base(), { instrument, study: 'render', participant: 'r1' });

    // R1
    await expect(page.locator('.instructions .start')).toHaveText(exp.instructions.start);

    await begin(page);
    const seen = await walkAll(page);

    // R2
    expect(seen.length, 'count of rendered items').toBe(exp.items.length);
    expect(seen.map((s) => s.text)).toEqual(exp.items.map((it) => it.text));
    expect(seen.map((s) => s.number)).toEqual(exp.items.map((it) => it.number));
    expect(seen.map((s) => s.position)).toEqual(exp.items.map((_, i) => i + 1));

    // R3
    const labels = exp.instructions.options.map((o) => o.label);
    const values = exp.instructions.options.map((o) => o.value);
    for (const s of seen) {
      expect(s.labels, `labels of item ${s.number}`).toEqual(labels);
      expect(s.values, `values of item ${s.number}`).toEqual(values);
    }
  });
}

test('a descriptor with itemOrder renders its items in that order', async ({ page }) => {
  const module = await readDescriptor('module-shuffled.json');
  expect(module.itemOrder, 'the fixture carries an itemOrder').toBeDefined();
  await openForm(page, base(), { instrument: module.instrument, study: 'render', module });
  await begin(page, 'r2');
  const seen = await walkAll(page);
  // R4
  expect(seen.map((s) => s.number)).toEqual(module.itemOrder);
});

test('a descriptor without itemOrder renders its items in items order', async ({ page }) => {
  const module = await readDescriptor('module-plain.json');
  expect(module.itemOrder, 'the fixture carries no itemOrder').toBeUndefined();
  await openForm(page, base(), { instrument: module.instrument, study: 'render', module });
  await begin(page, 'r3');
  const seen = await walkAll(page);
  // R5
  expect(seen.map((s) => s.number)).toEqual(module.items);
});
