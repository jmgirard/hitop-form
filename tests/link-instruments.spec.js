// The link builder's instrument list: one row per instrument, in the order
// the page gives them.
//
//   LI1: the list opens with one row, "Instrument 1", set to the HiTOP-SR,
//        its Remove disabled. "Add an instrument" adds a row set to the
//        first instrument not yet in the list, and is disabled at three
//        rows. Move up, Move down and Remove reorder and drop rows, and the
//        labels and button names follow the order
//   LI2: one row makes a link with `instrument` and no `instruments`; two or
//        three rows make a link with `instruments` in row order and no
//        `instrument`
//   LI3: the builder refuses the faults its rows can hold, naming the rows
//        and the instruments: a repeated instrument, each pair of the three
//        PID-5 forms, and all three. A module beside a list without the
//        HiTOP-SR is refused; beside a list with it, a module of another
//        instrument is refused by the module check naming hitopsr, and a
//        good module is accepted
//   LI4: a link built with two and with three instruments opens the form
//        at the first instrument's start screen, "Part 1 of N" (after the
//        "Before you begin" screen when the link has a question); opened on
//        the builder through its `c` (and, with a question, its `z`), it
//        fills the same rows in the same order, and a rebuild writes the
//        same config
//   LI5: an opened link is refused by name, with the instrument list back at
//        its one HiTOP-SR row (and, for a c link, the study field empty),
//        when it carries both fields, or a list the form page refuses (a
//        value that is not a list, a list of 0, 1 or 4 names, an unknown
//        name, a list as an entry, a repeated name, two and three PID-5
//        forms)

import { test, expect } from '@playwright/test';
import { useTarget, openSectionOf, encodeConfig, encodeCompressed, decodeLinkParam, readDescriptor } from './helpers.mjs';

const base = useTarget();

const rows = (page) => page.locator('#instrumentList .instrument-row');
const menus = (page) => page.locator('#instrumentList select[name="instrument"]');
const add = (page) => page.getByRole('button', { name: 'Add an instrument' });

async function menuValues(page) {
  return menus(page).evaluateAll((ns) => ns.map((n) => n.value));
}

// Sets the list to `stems`, one row each, through the page's own controls.
async function chooseInstruments(page, stems) {
  while ((await rows(page).count()) < stems.length) await add(page).click();
  for (let k = 0; k < stems.length; k++) await menus(page).nth(k).selectOption(stems[k]);
}

async function build(page, stems, { module, questions = false } = {}) {
  await chooseInstruments(page, stems);
  await page.locator('input[name="study"]').fill('list');
  await openSectionOf(page, 'participant');
  await page.locator('input[name="participant"]').fill('b1');
  if (module) {
    await openSectionOf(page, 'module');
    await page.locator('textarea[name="module"]').fill(JSON.stringify(module));
  }
  if (questions) {
    await openSectionOf(page, '#addQuestion');
    await page.getByRole('button', { name: 'Add a question' }).click();
    await page.locator('input[name="qName"]').fill('age');
    await page.locator('input[name="qText"]').fill('How old are you?');
  }
  await page.getByRole('button', { name: 'Make the link' }).click();
  // A z link is compressed after the click returns, so the build is done
  // once either the link or a refusal is written.
  await expect(page.locator('#out:not(:empty), #err:not(:empty)')).toHaveCount(1);
  return { err: await page.locator('#err').textContent(), href: await page.locator('#out').textContent() };
}

// LI1
test('the list opens with one row and grows to three', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator('.label')).toHaveText('Instrument 1');
  expect(await menuValues(page)).toEqual(['hitopsr']);
  await expect(page.getByRole('button', { name: 'Remove instrument 1' })).toBeDisabled();
  await add(page).click();
  expect(await menuValues(page)).toEqual(['hitopsr', 'hitopbr']);
  await expect(menus(page).nth(1)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Remove instrument 1' })).toBeEnabled();
  await add(page).click();
  expect(await menuValues(page)).toEqual(['hitopsr', 'hitopbr', 'pid5']);
  await expect(add(page)).toBeDisabled();
  await expect(rows(page).locator('.label')).toHaveText(['Instrument 1', 'Instrument 2', 'Instrument 3']);
});

test('Move up, Move down and Remove reorder and drop rows', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await chooseInstruments(page, ['hitopbr', 'pid5bf', 'hitopsr']);
  await page.getByRole('button', { name: 'Move up instrument 3' }).click();
  expect(await menuValues(page)).toEqual(['hitopbr', 'hitopsr', 'pid5bf']);
  await expect(page.getByRole('button', { name: 'Move up instrument 2' })).toBeFocused();
  await page.getByRole('button', { name: 'Move down instrument 1' }).click();
  expect(await menuValues(page)).toEqual(['hitopsr', 'hitopbr', 'pid5bf']);
  await page.getByRole('button', { name: 'Remove instrument 2' }).click();
  expect(await menuValues(page)).toEqual(['hitopsr', 'pid5bf']);
  await expect(menus(page).nth(1)).toBeFocused();
  await expect(add(page)).toBeEnabled();
  await page.getByRole('button', { name: 'Remove instrument 2' }).click();
  expect(await menuValues(page)).toEqual(['hitopsr']);
  await expect(page.getByRole('button', { name: 'Remove instrument 1' })).toBeDisabled();
});

// LI2
test('one row writes instrument, and two or three write instruments in row order', async ({ page }) => {
  for (const stems of [['pid5bf'], ['pid5bf', 'hitopbr'], ['hitopbr', 'hitopsr', 'pid5sf']]) {
    await page.goto(`${base()}link.html`);
    const { err, href } = await build(page, stems);
    expect(err).toBe('');
    const config = decodeLinkParam(href);
    if (stems.length === 1) {
      expect(config.instrument).toBe(stems[0]);
      expect(config).not.toHaveProperty('instruments');
    } else {
      expect(config.instruments).toEqual(stems);
      expect(config).not.toHaveProperty('instrument');
    }
  }
});

// LI3
const REFUSED = [
  {
    stems: ['hitopbr', 'pid5bf', 'hitopbr'],
    why: 'The instruments could not be used: it names HiTOP-BR twice, as instrument 1 and instrument 3.',
  },
  ...[['pid5', 'pid5sf'], ['pid5sf', 'pid5bf'], ['pid5bf', 'pid5']].map(([a, b]) => ({
    stems: [a, b],
    why: `The instruments could not be used: it names ${{ pid5: 'PID-5', pid5sf: 'PID-5-SF', pid5bf: 'PID-5-BF' }[a]} and ${{ pid5: 'PID-5', pid5sf: 'PID-5-SF', pid5bf: 'PID-5-BF' }[b]}, two forms of the PID-5, and a list holds one.`,
  })),
  {
    stems: ['pid5sf', 'pid5bf', 'pid5'],
    why: 'The instruments could not be used: it names PID-5-SF, PID-5-BF and PID-5, three forms of the PID-5, and a list holds one.',
  },
];

for (const probe of REFUSED) {
  test(`the rows ${probe.stems.join(', ')} are refused, naming the fault`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    const { err, href } = await build(page, probe.stems);
    expect(err).toBe(probe.why);
    expect(href).toBe('');
  });
}

test('a module beside rows without the HiTOP-SR is refused', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const { err, href } = await build(page, ['hitopbr', 'pid5bf'], { module: await readDescriptor('module-plain.json') });
  expect(err).toBe('The module file needs the HiTOP-SR among the instruments, because a module applies to the HiTOP-SR. Add the HiTOP-SR, or empty the "Module file" field.');
  expect(href).toBe('');
});

test('a module of another instrument beside rows with the HiTOP-SR is refused naming hitopsr', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const module = { ...(await readDescriptor('module-plain.json')), instrument: 'hitopbr' };
  const { err } = await build(page, ['hitopbr', 'hitopsr'], { module });
  expect(err).toBe('The module file could not be used: its instrument is "hitopbr" and the link\'s is "hitopsr".');
});

test('a module beside rows with the HiTOP-SR is accepted', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const module = await readDescriptor('module-plain.json');
  const { err, href } = await build(page, ['hitopbr', 'hitopsr'], { module });
  expect(err).toBe('');
  expect(decodeLinkParam(href).module).toEqual(module);
});

// LI4
for (const stems of [['pid5bf', 'hitopbr'], ['hitopbr', 'pid5bf', 'hitopsr']]) {
  for (const questions of [false, true]) {
    const param = questions ? 'z' : 'c';
    test(`a link of ${stems.length} instruments (${param}) opens, and reloads on the builder with the same rows`, async ({ page }) => {
      await page.goto(`${base()}link.html`);
      const { err, href } = await build(page, stems, { questions });
      expect(err).toBe('');
      expect(new URL(href).searchParams.has(param)).toBe(true);
      const config = decodeLinkParam(href);

      await page.goto(href);
      await expect(page.locator('h1')).toHaveText(questions ? 'Before you begin' : { pid5bf: 'PID-5-BF', hitopbr: 'HiTOP-BR' }[stems[0]]);
      if (questions) await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.locator('.part')).toHaveText(`Part 1 of ${stems.length}`);

      await page.goto(`${base()}link.html${new URL(href).search}`);
      expect(await menuValues(page)).toEqual(stems);
      await expect(page.locator('#err')).toHaveText('');
      await page.getByRole('button', { name: 'Make the link' }).click();
      await expect(page.locator('#out')).not.toBeEmpty();
      expect(decodeLinkParam(await page.locator('#out').textContent())).toEqual(config);
    });
  }
}

test('an opened link with one instrument fills one row', async ({ page }) => {
  await page.goto(`${base()}link.html?c=${encodeConfig({ instrument: 'pid5sf', study: 'x' })}`);
  expect(await menuValues(page)).toEqual(['pid5sf']);
  await expect(add(page)).toBeEnabled();
});

// LI5
const OPENED_REFUSED = [
  {
    name: 'both fields',
    config: { instrument: 'hitopbr', instruments: ['hitopbr', 'pid5bf'] },
    why: "The study link you opened carries both an instrument field and an instruments field. Fill in the form above to make a new link.",
  },
  {
    name: 'four names',
    config: { instruments: ['hitopbr', 'hitopsr', 'pid5bf', 'pid5'] },
    why: "The study link you opened holds an instruments field that could not be used: it names 4 instruments, and a list names 2 or 3. Fill in the form above to make a new link.",
  },
  {
    name: 'two PID-5 forms',
    config: { instruments: ['pid5', 'pid5bf'] },
    why: 'The study link you opened holds an instruments field that could not be used: it names "pid5" and "pid5bf", two forms of the PID-5, and a list holds one. Fill in the form above to make a new link.',
  },
  {
    name: 'a list of one',
    config: { instruments: ['hitopbr'] },
    why: "The study link you opened holds an instruments field that could not be used: it names 1 instrument, and a list names 2 or 3. For one instrument, use the instrument field. Fill in the form above to make a new link.",
  },
  ...['hitopbr pid5bf', 5, null, { 0: 'hitopbr', 1: 'pid5bf' }].map((instruments) => ({
    name: `the value ${JSON.stringify(instruments)}`,
    config: { instruments },
    why: `The study link you opened holds an instruments field that could not be used: it is not a list, and it is ${JSON.stringify(instruments)}. Fill in the form above to make a new link.`,
  })),
  {
    name: 'an empty list',
    config: { instruments: [] },
    why: "The study link you opened holds an instruments field that could not be used: it names 0 instruments, and a list names 2 or 3. For one instrument, use the instrument field. Fill in the form above to make a new link.",
  },
  {
    name: 'an unknown name',
    config: { instruments: ['hitopbr', 'pid5x'] },
    why: 'The study link you opened holds an instruments field that could not be used: entry 2 is "pid5x", an instrument the online form does not know. Fill in the form above to make a new link.',
  },
  // A list as an entry is not a name, even where it holds one.
  ...[['hitopbr', ['hitopbr']], ['pid5', ['pid5bf']]].map((instruments) => ({
    name: `the entry ${JSON.stringify(instruments[1])}`,
    config: { instruments },
    why: `The study link you opened holds an instruments field that could not be used: entry 2 is ${JSON.stringify(instruments[1])}, an instrument the online form does not know. Fill in the form above to make a new link.`,
  })),
  {
    name: 'a repeated name',
    config: { instruments: ['pid5bf', 'hitopbr', 'pid5bf'] },
    why: 'The study link you opened holds an instruments field that could not be used: it names "pid5bf" twice, as entry 1 and entry 3. Fill in the form above to make a new link.',
  },
  {
    name: 'three PID-5 forms',
    config: { instruments: ['pid5', 'pid5sf', 'pid5bf'] },
    why: 'The study link you opened holds an instruments field that could not be used: it names "pid5", "pid5sf" and "pid5bf", three forms of the PID-5, and a list holds one. Fill in the form above to make a new link.',
  },
];

for (const probe of OPENED_REFUSED) {
  test(`an opened link with ${probe.name} is refused, the controls left as with no link`, async ({ page }) => {
    await page.goto(`${base()}link.html?c=${encodeConfig({ ...probe.config, study: 'filled' })}`);
    await expect(page.locator('#err')).toHaveText(probe.why);
    expect(await menuValues(page)).toEqual(['hitopsr']);
    await expect(page.locator('input[name="study"]')).toHaveValue('');
  });
}

test('an opened z link with a list the form page refuses is refused by name', async ({ page }) => {
  await page.goto(`${base()}link.html?z=${encodeCompressed({ instruments: ['pid5sf', 'pid5'], study: 'filled' })}`);
  await expect(page.locator('#err')).toHaveText('The study link you opened holds an instruments field that could not be used: it names "pid5sf" and "pid5", two forms of the PID-5, and a list holds one. Fill in the form above to make a new link.');
  expect(await menuValues(page)).toEqual(['hitopsr']);
});
