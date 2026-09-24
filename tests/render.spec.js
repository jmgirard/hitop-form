// Rendering fidelity: what the page shows is what the export holds.
//
//   R0: the start screen and the first page of items are headed by the
//       form's name
//   R1: a link naming an instrument renders the export's instructions.start
//   R2: every rendered item's text equals the export's, in export order, and
//       the count of rendered items equals the export's items array length
//       and the form's known item count
//   R3: every item's option labels equal the export's instructions.options
//       labels, in order, with the matching values, which are the form's
//       known values
//   R4: a link carrying a descriptor with itemOrder renders the descriptor's
//       items in that order and nothing else
//   R5: a link carrying a descriptor without itemOrder renders its items in
//       items order
//   R6: the start screen's disclosure: without a store it says the answers
//       are saved to this device and none is sent anywhere; with a store it
//       names the store address's host as where the answers go and says the
//       file is saved instead when the send cannot be confirmed
//   R7: a HiTOP-BR link with shuffle: true renders a rearrangement of the
//       export's items, numbered 1 to 45 in the shown order, and two loads
//       of the link render different orders
//   R8: a link with shuffle: true carrying the descriptor with itemOrder
//       renders a rearrangement of its items, numbered 1 to 21, and two
//       loads render different orders
//   R9: a link with shuffle: false renders as one with no shuffle field:
//       the export's order for the HiTOP-BR, the descriptor's itemOrder for
//       the module

import { test, expect } from '@playwright/test';
import {
  useTarget, openForm, begin, walkAll, fetchExport, readDescriptor,
} from './helpers.mjs';

const base = useTarget();

// Each form's title, item count and option values, stated here rather than
// read from the export, so an export that drifts from them shows up as a
// failure.
const FORMS = [
  { instrument: 'hitopsr', title: 'HiTOP-SR', items: 405, values: [1, 2, 3, 4] },
  { instrument: 'hitopbr', title: 'HiTOP-BR', items: 45, values: [1, 2, 3, 4] },
  { instrument: 'pid5', title: 'PID-5', items: 220, values: [0, 1, 2, 3] },
  { instrument: 'pid5sf', title: 'PID-5-SF', items: 100, values: [0, 1, 2, 3] },
  { instrument: 'pid5bf', title: 'PID-5-BF', items: 25, values: [0, 1, 2, 3] },
];

for (const form of FORMS) {
  const { instrument } = form;
  test(`${instrument}: instructions, items and options match the export`, async ({ page }) => {
    const exp = await fetchExport(instrument);
    await openForm(page, base(), { instrument, study: 'render', participant: 'r1' });

    // R0
    await expect(page.locator('h1')).toHaveText(form.title);

    // R1
    await expect(page.locator('.instructions .start')).toHaveText(exp.instructions.start);

    await begin(page);
    await expect(page.locator('h1')).toHaveText(form.title);
    const seen = await walkAll(page);

    // R2
    expect(seen.length, 'count of rendered items').toBe(form.items);
    expect(seen.length, 'count of rendered items').toBe(exp.items.length);
    expect(seen.map((s) => s.text)).toEqual(exp.items.map((it) => it.text));
    expect(seen.map((s) => s.number)).toEqual(exp.items.map((it) => it.number));
    expect(seen.map((s) => s.position)).toEqual(exp.items.map((_, i) => i + 1));

    // R3
    const labels = exp.instructions.options.map((o) => o.label);
    const values = exp.instructions.options.map((o) => o.value);
    expect(values, 'the export\'s option values').toEqual(form.values);
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

// Opens the link, walks the form and returns the item numbers in the order
// shown, after checking that the positions printed beside them run 1 to n.
async function shownOrder(page, config, participant) {
  await openForm(page, base(), config);
  await begin(page, participant);
  const seen = await walkAll(page);
  expect(seen.map((s) => s.position)).toEqual(seen.map((_, i) => i + 1));
  return seen.map((s) => s.number);
}

const sorted = (a) => [...a].sort((x, y) => x - y);

// R7 and R8: under shuffle, each load is a rearrangement of the planned
// items, and two loads differ. Two draws of 45 or 21 items coincide with
// probability 1 / 45! or 1 / 21!, so an equal pair means the shuffle did not
// run.
test('a HiTOP-BR link with shuffle renders a rearrangement, and two loads differ', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  const numbers = exp.items.map((it) => it.number);
  const config = { instrument: 'hitopbr', study: 'render', participant: 'r7', shuffle: true };
  const first = await shownOrder(page, config);
  const second = await shownOrder(page, config);
  expect(sorted(first)).toEqual(sorted(numbers));
  expect(sorted(second)).toEqual(sorted(numbers));
  expect(first).not.toEqual(numbers);
  expect(second).not.toEqual(first);
});

test('a module link with shuffle renders a rearrangement of its items, and two loads differ', async ({ page }) => {
  const module = await readDescriptor('module-shuffled.json');
  const config = { instrument: module.instrument, study: 'render', shuffle: true, module };
  const first = await shownOrder(page, config, 'r8');
  const second = await shownOrder(page, config, 'r8');
  expect(first).toHaveLength(21);
  expect(sorted(first)).toEqual(sorted(module.items));
  expect(sorted(second)).toEqual(sorted(module.items));
  expect(second).not.toEqual(first);
});

// R9: shuffle: false is the same as no shuffle field.
test('a HiTOP-BR link with shuffle: false renders the export order', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  const shown = await shownOrder(page, { instrument: 'hitopbr', study: 'render', participant: 'r9', shuffle: false });
  expect(shown).toEqual(exp.items.map((it) => it.number));
});

test('a module link with shuffle: false renders the descriptor\'s itemOrder', async ({ page }) => {
  const module = await readDescriptor('module-shuffled.json');
  const shown = await shownOrder(page, { instrument: module.instrument, study: 'render', shuffle: false, module }, 'r9');
  expect(shown).toEqual(module.itemOrder);
});

// R6: the two wordings, stated in full. No request leaves for the store on
// the start screen, so the https: address needs no endpoint.
test('the start screen without a store says the answers are saved here and none is sent', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'render', participant: 'r6' });
  await expect(page.locator('p.muted')).toHaveText(
    '45 items over 3 pages. Your answers are saved to this device as one file when you finish. No answer is sent anywhere.',
  );
});

test('the start screen with a store names its host and the fallback', async ({ page }) => {
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'render', participant: 'r6',
    store: { kind: 'webhook', url: 'https://script.google.com/macros/s/AKfycbxyz/exec' },
  });
  await expect(page.locator('p.muted')).toHaveText(
    '45 items over 3 pages. When you finish, your answers are sent to the study team at script.google.com. If the send cannot be confirmed, they are saved as one file in this browser\'s downloads folder instead.',
  );
});
