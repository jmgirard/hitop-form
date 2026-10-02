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
//        PID-5 forms, and all three. A module row holding a module of
//        another instrument is refused by the module check naming hitopsr,
//        and a good module in a module row, alone or beside other
//        instruments, is accepted
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
//   LI6: the menu offers "HiTOP-SR module (scales you choose)" right after
//        "HiTOP-SR (405 items)"; only a row set to it shows its "Module file"
//        box and "Choose the module file" control, and a row not set to it
//        keeps them hidden; the "Item order" section holds only the shuffle
//        box; a row set to the module and then away writes no module, and
//        set back shows its text again; "Add an instrument" skips both
//        HiTOP-SR entries when either is listed
//   LI7: three module setups build the same `c` that hitop-form `main` at
//        commit 2af14f0, before the module became an instrument choice,
//        built for the same setup: a module alone, a module second in a
//        list, and a module under the random order
//   LI8: a HiTOP-SR row beside a module row, in either order, is refused as
//        a repeat with a sentence saying the module is the HiTOP-SR; two
//        module rows are refused as a repeat without it; both focus the
//        later row's menu. A module row with an empty box or one holding
//        only spaces is refused naming its row, and focuses its box
//   LI9: a `c`, a `z` and a setup file each fill a module row with the
//        module as JSON.stringify(module, null, 2), in a single row and as
//        row 2 of a list, and fill a plain HiTOP-SR row when the config has
//        no module; a module with no HiTOP-SR among the instruments is
//        refused by name, leaving the form as a load with no link leaves it.
//        A `c` of the shape the Module Builder writes fills a module row
//  LI10: with two module rows, each row's box, file control, message and
//        status are named "Module file for instrument N", "Choose the
//        module file for instrument N", "Module file message for
//        instrument N" and "Module file status for instrument N", N its
//        number, and the names follow the rows after a move; the box and
//        the file control keep their hints as descriptions
//  LI11: a row set away from the module empties a finished read's status
//        and a failed read's message, which stay empty when it is set back;
//        a read running when the row is set away and back drops its text,
//        so message, status and box are then empty

import { test, expect } from '@playwright/test';
import {
  useTarget, openSectionOf, encodeConfig, encodeCompressed, decodeLinkParam, readDescriptor, readFixture,
  serveSetup, setupFingerprint, setupQuery,
} from './helpers.mjs';

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

// Row `k` (1 is the first) and the box in it that holds a module file.
const rowOf = (page, k) => rows(page).nth(k - 1);
const boxOf = (page, k) => rowOf(page, k).locator('textarea[name="module"]');

// `module` is written into the box of the first row set to the HiTOP-SR
// module, as the object's JSON; `moduleText` is written there as it stands.
async function build(page, stems, { module, moduleText, questions = false } = {}) {
  await chooseInstruments(page, stems);
  await page.locator('input[name="study"]').fill('list');
  await openSectionOf(page, 'participant');
  await page.locator('input[name="participant"]').fill('b1');
  if (module !== undefined || moduleText !== undefined) {
    const at = stems.indexOf('hitopsr-module') + 1;
    await boxOf(page, at).fill(moduleText ?? JSON.stringify(module));
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

test('a module of another instrument in a module row is refused naming hitopsr', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const module = { ...(await readDescriptor('module-plain.json')), instrument: 'hitopbr' };
  const { err } = await build(page, ['hitopbr', 'hitopsr-module'], { module });
  expect(err).toBe('The module file could not be used: its instrument is "hitopbr" and the link\'s is "hitopsr".');
});

test('a module in a module row beside other instruments is accepted', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const module = await readDescriptor('module-plain.json');
  const { err, href } = await build(page, ['hitopbr', 'hitopsr-module'], { module });
  expect(err).toBe('');
  const config = decodeLinkParam(href);
  expect(config.instruments).toEqual(['hitopbr', 'hitopsr']);
  expect(config.module).toEqual(module);
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

// LI6
const MODULE_LABEL = 'HiTOP-SR module (scales you choose)';

test('the menu offers the HiTOP-SR module right after the HiTOP-SR', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const labels = await menus(page).first().locator('option').allTextContents();
  expect(labels.indexOf('HiTOP-SR (405 items)')).toBe(0);
  expect(labels[1]).toBe(MODULE_LABEL);
  expect(await menus(page).first().locator('option').evaluateAll((os) => os[1].value)).toBe('hitopsr-module');
});

test('a row set to the HiTOP-SR module shows its module file box and file control, and no other row does', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await add(page).click();
  await add(page).click();
  // No row is set to the module: every row's fields are hidden.
  for (let k = 1; k <= 3; k++) await expect(rowOf(page, k).locator('.module-fields')).toBeHidden();

  await menus(page).nth(1).selectOption('hitopsr-module');
  const fields = rowOf(page, 2).locator('.module-fields');
  await expect(fields).toBeVisible();
  await expect(fields.locator('label', { hasText: /^Module file/ })).toBeVisible();
  await expect(fields.locator('textarea[name="module"]')).toBeVisible();
  await expect(fields.locator('label', { hasText: /^Choose the module file/ })).toBeVisible();
  await expect(fields.locator('input.module-file[type="file"]')).toBeVisible();
  for (const k of [1, 3]) {
    await expect(rowOf(page, k).locator('.module-fields')).toBeHidden();
    await expect(rowOf(page, k).locator('.module-fields')).toHaveAttribute('hidden', '');
  }
  // The fields sit between the row's label and its buttons.
  const order = await rowOf(page, 2).evaluate((r) => [...r.children].map((n) => (n.classList.contains('module-fields') ? 'module-fields' : n.classList.contains('moves') ? 'moves' : n.tagName.toLowerCase())));
  expect(order).toEqual(['label', 'module-fields', 'moves']);

  await menus(page).nth(1).selectOption('pid5');
  await expect(fields).toBeHidden();
  await expect(fields).toHaveAttribute('hidden', '');
});

test('the Item order section holds only the shuffle box', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await expect(page.locator('#secOrder > summary .sec-name')).toHaveText('Item order');
  await expect(page.locator('#secOrder textarea')).toHaveCount(0);
  await expect(page.locator('#secOrder input[type="file"]')).toHaveCount(0);
  await expect(page.locator('#secOrder select')).toHaveCount(0);
  await expect(page.locator('#secOrder input')).toHaveCount(1);
  await expect(page.locator('#secOrder input[name="shuffle"]')).toHaveCount(1);
  await expect(page.locator('details.optional')).toHaveCount(5);
});

test('only a module row writes its box, and a row set back shows its text again', async ({ page }) => {
  const text = await readFixture('module-plain.json');
  await page.goto(`${base()}link.html`);
  await page.locator('input[name="study"]').fill('only');
  await menus(page).first().selectOption('hitopsr-module');
  await boxOf(page, 1).fill(text);

  // Set away from the module: the text stays out of view and out of the link.
  await menus(page).first().selectOption('hitopbr');
  await expect(rowOf(page, 1).locator('.module-fields')).toBeHidden();
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toHaveText('');
  const away = decodeLinkParam(await page.locator('#out').textContent());
  expect(away.instrument).toBe('hitopbr');
  expect(away).not.toHaveProperty('module');

  // Set back: the same text shows again, and the link carries it.
  await menus(page).first().selectOption('hitopsr-module');
  await expect(rowOf(page, 1).locator('.module-fields')).toBeVisible();
  await expect(boxOf(page, 1)).toHaveValue(text);
  await page.getByRole('button', { name: 'Make the link' }).click();
  const back = decodeLinkParam(await page.locator('#out').textContent());
  expect(back.instrument).toBe('hitopsr');
  expect(back.module).toEqual(JSON.parse(text));
});

for (const [listed, expected] of [['hitopsr', 'hitopbr'], ['hitopsr-module', 'hitopbr'], ['hitopbr', 'hitopsr']]) {
  test(`"Add an instrument" from a ${listed} row starts the new row at ${expected}`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    await menus(page).first().selectOption(listed);
    await add(page).click();
    expect(await menuValues(page)).toEqual([listed, expected]);
  });
}

// LI7: the strings are the queries hitop-form main built at commit 2af14f0,
// the builder before the module became an instrument choice, for the same
// setup: the study named, the rows set (the module in the one module box,
// then), and the text of tests/fixtures/module-plain.json pasted in the
// module box. The page here must build them byte for byte.
const MODULE_C = {
  alone: '?c=eyJpbnN0cnVtZW50IjoiaGl0b3BzciIsInN0dWR5IjoibW9kdWxlIGFsb25lIiwibW9kdWxlIjp7ImZvcm1hdCI6IjEuMCIsInBhY2thZ2UiOiJoaXRvcCIsInBhY2thZ2VWZXJzaW9uIjoiMC4yLjAiLCJidWlsZERhdGUiOiIyMDI2LTA5LTIwIiwiaW5zdHJ1bWVudCI6ImhpdG9wc3IiLCJzY2FsZXMiOlsiQWdvcmFwaG9iaWEiLCJEaXN0cmVzcy1EeXNwaG9yaWEiXSwiaXRlbXMiOlsxMSwyMCw2NCw2NiwxMDAsMTA5LDExOCwxNzAsMTk0LDIyNCwyMzMsMjYwLDI5MSwzMDAsMzA0LDM0MywzNjUsMzY3LDM4MCwzODYsMzk0XSwibkl0ZW1zIjoyMX19',
  second: '?c=eyJpbnN0cnVtZW50cyI6WyJoaXRvcGJyIiwiaGl0b3BzciJdLCJzdHVkeSI6Im1vZHVsZSBzZWNvbmQiLCJtb2R1bGUiOnsiZm9ybWF0IjoiMS4wIiwicGFja2FnZSI6ImhpdG9wIiwicGFja2FnZVZlcnNpb24iOiIwLjIuMCIsImJ1aWxkRGF0ZSI6IjIwMjYtMDktMjAiLCJpbnN0cnVtZW50IjoiaGl0b3BzciIsInNjYWxlcyI6WyJBZ29yYXBob2JpYSIsIkRpc3RyZXNzLUR5c3Bob3JpYSJdLCJpdGVtcyI6WzExLDIwLDY0LDY2LDEwMCwxMDksMTE4LDE3MCwxOTQsMjI0LDIzMywyNjAsMjkxLDMwMCwzMDQsMzQzLDM2NSwzNjcsMzgwLDM4NiwzOTRdLCJuSXRlbXMiOjIxfX0',
  shuffled: '?c=eyJpbnN0cnVtZW50IjoiaGl0b3BzciIsInN0dWR5IjoibW9kdWxlIHNodWZmbGVkIiwic2h1ZmZsZSI6dHJ1ZSwibW9kdWxlIjp7ImZvcm1hdCI6IjEuMCIsInBhY2thZ2UiOiJoaXRvcCIsInBhY2thZ2VWZXJzaW9uIjoiMC4yLjAiLCJidWlsZERhdGUiOiIyMDI2LTA5LTIwIiwiaW5zdHJ1bWVudCI6ImhpdG9wc3IiLCJzY2FsZXMiOlsiQWdvcmFwaG9iaWEiLCJEaXN0cmVzcy1EeXNwaG9yaWEiXSwiaXRlbXMiOlsxMSwyMCw2NCw2NiwxMDAsMTA5LDExOCwxNzAsMTk0LDIyNCwyMzMsMjYwLDI5MSwzMDAsMzA0LDM0MywzNjUsMzY3LDM4MCwzODYsMzk0XSwibkl0ZW1zIjoyMX19',
};

for (const probe of [
  { name: 'module alone', stems: ['hitopsr-module'], query: MODULE_C.alone },
  { name: 'module second', stems: ['hitopbr', 'hitopsr-module'], query: MODULE_C.second },
  { name: 'module shuffled', stems: ['hitopsr-module'], shuffle: true, query: MODULE_C.shuffled },
]) {
  test(`the study "${probe.name}" builds the link the builder built before the module became an instrument choice`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    await chooseInstruments(page, probe.stems);
    await boxOf(page, probe.stems.indexOf('hitopsr-module') + 1).fill(await readFixture('module-plain.json'));
    await page.locator('input[name="study"]').fill(probe.name);
    if (probe.shuffle) {
      await openSectionOf(page, 'shuffle');
      await page.locator('input[name="shuffle"]').check();
    }
    await page.getByRole('button', { name: 'Make the link' }).click();
    await expect(page.locator('#out')).not.toHaveText('');
    await expect(page.locator('#err')).toHaveText('');
    expect(new URL(await page.locator('#out').textContent()).search).toBe(probe.query);
  });
}

// LI8
const CLASH = 'A HiTOP-SR module is the HiTOP-SR, so a list holds one or the other.';
const TWICE = 'The instruments could not be used: it names HiTOP-SR twice, as instrument 1 and instrument 2.';

for (const probe of [
  { stems: ['hitopsr', 'hitopsr-module'], why: `${TWICE} ${CLASH}` },
  { stems: ['hitopsr-module', 'hitopsr'], why: `${TWICE} ${CLASH}` },
  { stems: ['hitopsr-module', 'hitopsr-module'], why: TWICE },
]) {
  test(`the rows ${probe.stems.join(', ')} are refused as a repeat, focusing row 2's menu`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    const text = await readFixture('module-plain.json');
    const { err, href } = await build(page, probe.stems, { moduleText: text });
    expect(err).toBe(probe.why);
    expect(href).toBe('');
    await expect(menus(page).nth(1)).toBeFocused();
  });
}

for (const [name, text] of [['empty', undefined], ['holding only spaces', '   \n  ']]) {
  for (const stems of [['hitopsr-module'], ['hitopbr', 'hitopsr-module']]) {
    const at = stems.length;
    test(`a module row ${at} with a box ${name}, in a list of ${stems.length}, is refused naming its row`, async ({ page }) => {
      await page.goto(`${base()}link.html`);
      const { err, href } = await build(page, stems, { moduleText: text });
      expect(err).toBe(`Instrument ${at} is a HiTOP-SR module and has no module file. Choose or paste the module file, or choose the full HiTOP-SR.`);
      expect(href).toBe('');
      await expect(boxOf(page, at)).toBeFocused();
    });
  }
}

// LI9
const REFUSED_MODULE = 'The link holds a module file but no HiTOP-SR. Fill in the form above to make a new link.';
const pretty = (config) => `${JSON.stringify(config, null, 2)}\n`;

// Opens link.html with `config` as a `c` link, a `z` link, or a link to a
// setup file served through a route, whose fingerprint is computed here.
async function openLink(page, kind, config) {
  let query;
  if (kind === 'c') {
    query = `?c=${encodeConfig(config)}`;
  } else if (kind === 'z') {
    query = `?z=${encodeCompressed(config)}`;
  } else {
    await serveSetup(page, pretty(config));
    query = `?${setupQuery({ sha256: setupFingerprint(config) })}`;
  }
  await page.goto(`${base()}link.html${query}`);
}

for (const kind of ['c', 'z', 'setup']) {
  test(`a ${kind} link holding a module fills one module row with the module as pretty JSON`, async ({ page }) => {
    const module = await readDescriptor('module-plain.json');
    await openLink(page, kind, { instrument: 'hitopsr', study: 'opened', module });
    await expect(page.locator('input[name="study"]')).toHaveValue('opened');
    await expect(rows(page)).toHaveCount(1);
    expect(await menuValues(page)).toEqual(['hitopsr-module']);
    await expect(boxOf(page, 1)).toHaveValue(JSON.stringify(module, null, 2));
    await expect(rowOf(page, 1).locator('.module-fields')).toBeVisible();
    await expect(page.locator('#err')).toHaveText('');
  });

  test(`a ${kind} link of a list holding a module fills row 2 as the module row`, async ({ page }) => {
    const module = await readDescriptor('module-plain.json');
    await openLink(page, kind, { instruments: ['hitopbr', 'hitopsr'], study: 'opened', module });
    await expect(page.locator('input[name="study"]')).toHaveValue('opened');
    await expect(rows(page)).toHaveCount(2);
    expect(await menuValues(page)).toEqual(['hitopbr', 'hitopsr-module']);
    await expect(boxOf(page, 2)).toHaveValue(JSON.stringify(module, null, 2));
    await expect(rowOf(page, 1).locator('.module-fields')).toBeHidden();
    await expect(rowOf(page, 2).locator('.module-fields')).toBeVisible();
    await expect(page.locator('#err')).toHaveText('');
  });

  test(`a ${kind} link with no module fills a plain HiTOP-SR row`, async ({ page }) => {
    await openLink(page, kind, { instrument: 'hitopsr', study: 'opened' });
    await expect(page.locator('input[name="study"]')).toHaveValue('opened');
    expect(await menuValues(page)).toEqual(['hitopsr']);
    await expect(rowOf(page, 1).locator('.module-fields')).toBeHidden();
    await expect(boxOf(page, 1)).toHaveValue('');
  });

  for (const probe of [
    { name: 'the HiTOP-BR alone', config: { instrument: 'hitopbr' } },
    { name: 'a list of the HiTOP-BR and the PID-5-BF', config: { instruments: ['hitopbr', 'pid5bf'] } },
  ]) {
    test(`a ${kind} link holding a module and ${probe.name} is refused, the form left as with no link`, async ({ page }) => {
      const module = await readDescriptor('module-plain.json');
      await openLink(page, kind, { ...probe.config, study: 'filled', module });
      await expect(page.locator('#err')).toHaveText(REFUSED_MODULE);
      expect(await menuValues(page)).toEqual(['hitopsr']);
      await expect(page.locator('input[name="study"]')).toHaveValue('');
      await expect(rowOf(page, 1).locator('.module-fields')).toBeHidden();
    });
  }
}

// The Module Builder (hitop-builder, index.html, showNextStep() and the
// constant STUDY_LINK_BUILDER) links the Study Link Builder with a `c` of
// JSON.stringify({ instrument: INSTRUMENT, module }), INSTRUMENT being
// 'hitopsr', in base64url: UTF-8 bytes through btoa(), "-" and "_" for "+"
// and "/", and no "=" padding. It names no study.
test('a c link of the shape the Module Builder writes fills a module row', async ({ page }) => {
  const module = await readDescriptor('module-shuffled.json');
  const c = await page.evaluate((text) => {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }, JSON.stringify({ instrument: 'hitopsr', module }));
  expect(c).toBe(encodeConfig({ instrument: 'hitopsr', module }));
  await page.goto(`${base()}link.html?c=${c}`);
  await expect(page.locator('#err')).toHaveText('');
  expect(await menuValues(page)).toEqual(['hitopsr-module']);
  await expect(boxOf(page, 1)).toHaveValue(JSON.stringify(module, null, 2));
  await expect(page.locator('input[name="study"]')).toHaveValue('');
});

// LI10: each module row's four controls are named for the row's number, as
// its Move buttons are. Each box is marked with its own text first, so the
// check after the move follows each row, not each position. An empty
// message or status is not shown, and a control not shown has no name, so
// each is given text first.
async function expectModuleNames(page, k, n) {
  const row = rowOf(page, k);
  await expect(row.locator('textarea[name="module"]')).toHaveAccessibleName(`Module file for instrument ${n}`);
  await expect(row.locator('input.module-file')).toHaveAccessibleName(`Choose the module file for instrument ${n}`);
  await expect(row.locator('.module-err')).toHaveAccessibleName(`Module file message for instrument ${n}`);
  await expect(row.locator('.module-status')).toHaveAccessibleName(`Module file status for instrument ${n}`);
}

test('LI10: a module row\'s box, file control, message and status are named for its number, and follow a move', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  await chooseInstruments(page, ['hitopsr-module', 'hitopsr-module']);
  await boxOf(page, 1).fill('first row');
  await boxOf(page, 2).fill('second row');
  await page.locator('.module-err, .module-status').evaluateAll((ns) => ns.forEach((n) => { n.textContent = 'shown'; }));
  await expect(page.locator('.module-err:visible, .module-status:visible')).toHaveCount(4);
  await expectModuleNames(page, 1, 1);
  await expectModuleNames(page, 2, 2);
  // The hints still describe the box and the file control.
  await expect(boxOf(page, 1)).toHaveAccessibleDescription(/^Choose or paste a module file from the Module Builder or write_module\(\)\./);
  await expect(rowOf(page, 1).locator('input.module-file')).toHaveAccessibleDescription('This browser reads the file and sends it nowhere.');

  await page.getByRole('button', { name: 'Move up instrument 2' }).click();
  await expect(boxOf(page, 1)).toHaveValue('second row');
  await expect(boxOf(page, 2)).toHaveValue('first row');
  await expectModuleNames(page, 1, 1);
  await expectModuleNames(page, 2, 2);
});

// LI11: a row set away from the module empties its message and status. A
// finished read's status and a failed read's message are each emptied, and
// stay empty when the row is set back. File.prototype.text() fails for
// bad.json.
test('LI11: setting a module row to another instrument empties its message and its status', async ({ page }) => {
  await page.addInitScript(() => {
    const real = File.prototype.text;
    File.prototype.text = function () {
      if (this.name === 'bad.json') return Promise.reject(new Error('planted read failure'));
      return real.call(this);
    };
  });
  await page.goto(`${base()}link.html`);
  const row = rowOf(page, 1);
  const file = row.locator('input.module-file');
  for (const [name, part, text] of [
    ['good.json', '.module-status', 'Read the module file good.json.'],
    ['bad.json', '.module-err', 'The module file could not be read.'],
  ]) {
    await menus(page).first().selectOption('hitopsr-module');
    await file.setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from('{}') });
    await expect(row.locator(part)).toHaveText(text);
    await menus(page).first().selectOption('hitopbr');
    await expect(row.locator(part)).toHaveText('');
    await menus(page).first().selectOption('hitopsr-module');
    await expect(row.locator(part)).toHaveText('');
  }
});

// LI11: a read still running when the row is set away drops its text, even
// after the row is set back. The read of late.json is held open by
// File.prototype.text() until the test lets it go.
test('LI11: a module file read running when the row is set away and back drops its text', async ({ page }) => {
  await page.addInitScript(() => {
    const real = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== 'late.json') return real.call(this);
      return new Promise((resolve) => { window.releaseRead = () => resolve('{"late": true}'); });
    };
  });
  await page.goto(`${base()}link.html`);
  const row = rowOf(page, 1);
  await menus(page).first().selectOption('hitopsr-module');
  await row.locator('input.module-file').setInputFiles({ name: 'late.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await page.waitForFunction(() => typeof window.releaseRead === 'function');
  await menus(page).first().selectOption('hitopbr');
  await menus(page).first().selectOption('hitopsr-module');
  // The read's own continuation runs once the promise settles, within the
  // next task, so one task later it has dropped its text or written it.
  await page.evaluate(() => { window.releaseRead(); return new Promise((r) => setTimeout(r, 50)); });
  await expect(row.locator('.module-err')).toHaveText('');
  await expect(row.locator('.module-status')).toHaveText('');
  await expect(boxOf(page, 1)).toHaveValue('');
});
