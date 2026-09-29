// A link's `instruments` field: a list of 2 or 3 instruments that the page
// gives one after another in one session.
//
// The link check:
//
//   I1: each fault in instruments is refused naming the field and the
//       fault, and no screen of the form shows: the field beside an
//       instrument field, a value that is not a list (a string, null, an
//       object), a list of 0, 1 or 4 names, an unknown name, a name that is
//       not text, a repeated name, and two PID-5 forms (each pair of the
//       three)
//   I2: a module beside a list without "hitopsr" is refused naming the
//       rule; beside a list with "hitopsr", a descriptor of another
//       instrument is refused naming "hitopsr", and ones of another format
//       or with items not ascending are refused by checkModule()'s messages
//
// Each probe fails at the link check, before any export is fetched.

import { test, expect } from '@playwright/test';
import { useTarget, openForm, readDescriptor, NOT_ASCENDING, NOT_ASCENDING_MESSAGE, notAscendingDescriptor } from './helpers.mjs';

const base = useTarget();

const LINK = { study: 'instruments', participant: 'i1' };

async function expectRefused(page, message) {
  await expect(page.locator('[role=alert]')).toHaveText(message);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
}

const fault = (why) => `The study link's instruments field could not be used: ${why}`;

// I1: each probe is the link's instrument fields and the message it gets.
const REFUSED = [
  {
    name: 'a list beside an instrument field',
    fields: { instrument: 'hitopbr', instruments: ['hitopbr', 'pid5bf'] },
    why: 'The study link carries both an instrument field and an instruments field, and a link carries one: instrument for one instrument, or instruments for a list of 2 or 3.',
  },
  ...['hitopbr pid5bf', null, { 0: 'hitopbr', 1: 'pid5bf' }].map((instruments) => ({
    name: `the value ${JSON.stringify(instruments)}`,
    fields: { instruments },
    why: fault(`it is not a list, and it is ${JSON.stringify(instruments)}.`),
  })),
  {
    name: 'an empty list',
    fields: { instruments: [] },
    why: fault('it names 0 instruments, and a list names 2 or 3. For one instrument, use the instrument field.'),
  },
  {
    name: 'a list of one',
    fields: { instruments: ['hitopbr'] },
    why: fault('it names 1 instrument, and a list names 2 or 3. For one instrument, use the instrument field.'),
  },
  {
    name: 'a list of four',
    fields: { instruments: ['hitopbr', 'hitopsr', 'pid5bf', 'pid5sf'] },
    why: fault('it names 4 instruments, and a list names 2 or 3.'),
  },
  {
    name: 'an unknown name',
    fields: { instruments: ['hitopbr', 'pid5x'] },
    why: fault('entry 2 is "pid5x", an instrument this page does not know.'),
  },
  {
    name: 'a name in upper case',
    fields: { instruments: ['HITOPBR', 'pid5bf'] },
    why: fault('entry 1 is "HITOPBR", an instrument this page does not know.'),
  },
  {
    name: 'a name that is not text',
    fields: { instruments: ['hitopbr', 5] },
    why: fault('entry 2 is 5, an instrument this page does not know.'),
  },
  {
    name: 'a repeated name',
    fields: { instruments: ['hitopbr', 'pid5bf', 'hitopbr'] },
    why: fault('it names "hitopbr" twice, as entry 1 and entry 3.'),
  },
  ...[['pid5', 'pid5sf'], ['pid5sf', 'pid5bf'], ['pid5bf', 'pid5']].map(([a, b]) => ({
    name: `${a} beside ${b}`,
    fields: { instruments: [a, 'hitopbr', b] },
    why: fault(`it names "${a}" and "${b}", two forms of the PID-5, and a list holds one.`),
  })),
];

for (const probe of REFUSED) {
  test(`an instruments link with ${probe.name} is refused, naming the fault`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, ...probe.fields });
    await expectRefused(page, probe.why);
  });
}

// I2: the module rule.
test('a module beside a list without hitopsr is refused', async ({ page }) => {
  const module = await readDescriptor('module-plain.json');
  await openForm(page, base(), { ...LINK, instruments: ['hitopbr', 'pid5bf'], module });
  await expectRefused(page, 'The study link carries a module, and its instruments list holds no "hitopsr". A module applies to the HiTOP-SR entry of the list.');
});

test('a module of another format beside a list with hitopsr is refused by the module check', async ({ page }) => {
  const module = { ...(await readDescriptor('module-plain.json')), format: '2.0' };
  await openForm(page, base(), { ...LINK, instruments: ['hitopbr', 'hitopsr'], module });
  await expectRefused(page, 'The module descriptor could not be used: this page reads format "1.0" and found format "2.0".');
});

test('a module of another instrument beside a list with hitopsr is refused naming hitopsr', async ({ page }) => {
  const module = { ...(await readDescriptor('module-plain.json')), instrument: 'hitopbr' };
  await openForm(page, base(), { ...LINK, instruments: ['hitopbr', 'hitopsr'], module });
  await expectRefused(page, 'The module descriptor could not be used: its instrument is "hitopbr" and the link\'s is "hitopsr".');
});

for (const entry of NOT_ASCENDING) {
  test(`a module whose items are ${entry.name} beside a list with hitopsr is refused`, async ({ page }) => {
    const module = await notAscendingDescriptor(entry);
    await openForm(page, base(), { ...LINK, instruments: ['pid5bf', 'hitopsr'], module });
    await expectRefused(page, NOT_ASCENDING_MESSAGE);
  });
}
