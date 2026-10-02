// A link's `questions` field: the researcher's own questions, asked on a
// screen before the start screen (`before`) or after the last item page
// (`after`).
//
// The link check. Each probe travels as z, since a 1,001-character text
// makes a long c link:
//
//   Q1: each fault in questions is refused naming the field, the question's
//       position and the fault, and no screen of the form shows: the field
//       not an object, a key other than before and after, neither list, a
//       list not a list or empty; a question not an
//       object, with a key outside the seven, without a name, text or type,
//       a name outside the pattern or repeated across the two lists, a text
//       not a string, blank, over 1,000 characters, holding a line break or
//       a lone surrogate, an unknown type, a required that is not a
//       boolean; options missing for choice and multi and given for text and
//       number, not a list, 1 or 21 of them, an option not a string, blank,
//       over 200 characters, holding a line break, a "|" or a lone
//       surrogate, two options the same after trimming; min or max on a
//       choice or a text question, a min or max that is not a whole number
//       or outside -2,147,483,647 to 2,147,483,647, and min above max
//   Q2: the limits are accepted, and the count of questions has none: 51
//       questions, 200 short questions, a 30-character name, a
//       1,000-character text, a 200-character option, 20 options, min and
//       max at the ends of the range and equal to each other, a text
//       holding a paired character, and a text and an option holding a tab
//       and a no-break space, which are not line breaks

import { test, expect, useTarget, openForm, refusalText } from './helpers.mjs';

const base = useTarget();

const LINK = { instrument: 'hitopbr', study: 'questions', participant: 'q1' };
const TEXT_Q = { name: 'note', text: 'Anything to add?', type: 'text' };
const CHOICE_Q = { name: 'colour', text: 'Pick one', type: 'choice', options: ['Red', 'Blue'] };
const NUMBER_Q = { name: 'age', text: 'Your age', type: 'number' };

async function expectRefused(page, message) {
  await expect(refusalText(page)).toHaveText(message);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next' })).toHaveCount(0);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
}

const fault = (why) => `The study link's questions field could not be used: ${why}`;
const first = (why) => fault(`question 1 of the before list: ${why}`);
const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));

// Q1: each probe is the questions field and the fault it names.
const REFUSED = [
  ...['ask', null, [TEXT_Q]].map((questions) => ({ name: `the field ${JSON.stringify(questions)}`, questions, why: fault('it is not an object.') })),
  { name: 'a key "middle"', questions: { before: [TEXT_Q], middle: [] }, why: fault('it has a field "middle", and it takes only before and after.') },
  { name: 'neither list', questions: {}, why: fault('it has neither a before nor an after list.') },
  { name: 'a before list that is a string', questions: { before: 'x' }, why: fault('its before list is not a list.') },
  { name: 'an empty after list', questions: { before: [TEXT_Q], after: [] }, why: fault('its after list is empty, and a list holds 1 or more questions.') },
  { name: 'a question that is a string', questions: { before: ['x'] }, why: first('it is not an object.') },
  { name: 'a key "hint"', questions: { before: [{ ...TEXT_Q, hint: 'h' }] }, why: first('it has a field "hint", and a question takes only name, text, type, required, options, min and max.') },
  { name: 'no name', questions: { before: [{ text: 'a', type: 'text' }] }, why: first('it has no name.') },
  ...['Age', '1age', 'my-age', '', 'a'.repeat(31), 7].map((name) => ({
    name: `the name ${JSON.stringify(name)}`,
    questions: { before: [{ ...TEXT_Q, name }] },
    why: first(`its name is ${JSON.stringify(name)}, and a name starts with a lower-case letter and holds only lower-case letters, digits and "_", up to 30 characters.`),
  })),
  {
    name: 'a name repeated across the lists',
    questions: { before: [NUMBER_Q], after: [TEXT_Q, { ...CHOICE_Q, name: 'age' }] },
    why: fault('question 2 of the after list: its name "age" is also the name of question 1 of the before list.'),
  },
  { name: 'no text', questions: { before: [{ name: 'a', type: 'text' }] }, why: first('it has no text.') },
  { name: 'a text of 7', questions: { before: [{ ...TEXT_Q, text: 7 }] }, why: first('its text is not a string.') },
  { name: 'a text of white space', questions: { before: [{ ...TEXT_Q, text: ' \t ' }] }, why: first('its text is empty or holds only white space.') },
  { name: 'a text of 1,001 characters', questions: { before: [{ ...TEXT_Q, text: 'x'.repeat(1_001) }] }, why: first('its text has 1,001 characters, more than the 1,000 it may hold.') },
  ...['\n', '\r', '\v', '\f', String.fromCharCode(0x85), String.fromCharCode(0x2028)].map((br) => ({
    name: `a text holding U+${br.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
    questions: { before: [{ ...TEXT_Q, text: `one${br}two` }] },
    why: first('its text holds a line break, and a question text is one line.'),
  })),
  { name: 'a text holding a lone surrogate', questions: { before: [{ ...TEXT_Q, text: 'age \ud800' }] }, why: first('its text holds half of a character (a lone surrogate), which cannot be written.') },
  { name: 'no type', questions: { before: [{ name: 'a', text: 'a' }] }, why: first('it has no type.') },
  { name: 'the type "date"', questions: { before: [{ ...TEXT_Q, type: 'date' }] }, why: first('its type is "date", and a type is "text", "number", "choice" or "multi".') },
  { name: 'required "yes"', questions: { before: [{ ...TEXT_Q, required: 'yes' }] }, why: first('its required field must be true or false, and it is "yes".') },
  ...['choice', 'multi'].map((type) => ({
    name: `a ${type} question without options`,
    questions: { before: [{ name: 'a', text: 'a', type }] },
    why: first(`it is a ${type} question and has no options.`),
  })),
  ...['text', 'number'].map((type) => ({
    name: `a ${type} question with options`,
    questions: { before: [{ name: 'a', text: 'a', type, options: ['x', 'y'] }] },
    why: first(`it is a ${type} question and cannot have options.`),
  })),
  { name: 'options that are a string', questions: { before: [{ ...CHOICE_Q, options: 'Red, Blue' }] }, why: first('its options are not a list.') },
  { name: 'one option', questions: { before: [{ ...CHOICE_Q, options: ['Red'] }] }, why: first('it has 1 option, and a question holds 2 to 20.') },
  { name: '21 options', questions: { before: [{ ...CHOICE_Q, options: many(21, (i) => `o${i}`) }] }, why: first('it has 21 options, and a question holds 2 to 20.') },
  { name: 'an option of 7', questions: { before: [{ ...CHOICE_Q, options: ['Red', 7] }] }, why: first('its option 2 is not a string.') },
  { name: 'an option of white space', questions: { before: [{ ...CHOICE_Q, options: ['Red', '  '] }] }, why: first('its option 2 is empty or holds only white space.') },
  { name: 'an option of 201 characters', questions: { before: [{ ...CHOICE_Q, options: ['Red', 'y'.repeat(201)] }] }, why: first('its option 2 has 201 characters, more than the 200 it may hold.') },
  ...['\n', '\v', '\f', String.fromCharCode(0x85)].map((br) => ({
    name: `an option holding U+${br.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
    questions: { before: [{ ...CHOICE_Q, options: ['Red', `Bl${br}ue`] }] },
    why: first('its option 2 holds a line break, and an option label is one line.'),
  })),
  { name: 'an option holding "|"', questions: { before: [{ ...CHOICE_Q, options: ['Red', 'Blue | Green'] }] }, why: first('its option 2 holds "|", which an option label may not hold.') },
  { name: 'an option holding a lone surrogate', questions: { before: [{ ...CHOICE_Q, options: ['Red', 'Blue \udc00'] }] }, why: first('its option 2 holds half of a character (a lone surrogate), which cannot be written.') },
  { name: 'two options the same after trimming', questions: { before: [{ ...CHOICE_Q, options: ['Red', 'Blue', ' Red '] }] }, why: first('its options 1 and 3 are the same after trimming: "Red".') },
  { name: 'a choice question with a min', questions: { before: [{ ...CHOICE_Q, min: 1 }] }, why: first('it is a choice question and cannot have a min.') },
  { name: 'a multi question with a max', questions: { before: [{ ...CHOICE_Q, type: 'multi', max: 1 }] }, why: first('it is a multi question and cannot have a max.') },
  { name: 'a text question with a max', questions: { before: [{ ...TEXT_Q, max: 10 }] }, why: first('it is a text question and cannot have a max.') },
  ...[['min', 2.5], ['min', '5'], ['max', 2_147_483_648], ['min', -2_147_483_648], ['max', null]].map(([bound, v]) => ({
    name: `a ${bound} of ${JSON.stringify(v)}`,
    questions: { before: [{ ...NUMBER_Q, [bound]: v }] },
    why: first(`its ${bound} is not a whole number from -2,147,483,647 to 2,147,483,647, and it is ${JSON.stringify(v)}.`),
  })),
  { name: 'a min above the max', questions: { before: [{ ...NUMBER_Q, min: 10, max: 5 }] }, why: first('its min 10 is above its max 5.') },
];

for (const probe of REFUSED) {
  test(`a questions field with ${probe.name} is refused, naming the fault`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, questions: probe.questions }, { param: 'z' });
    await expectRefused(page, probe.why);
  });
}

// Q2
const ACCEPTED = [
  { name: '51 questions', questions: { before: many(26, (i) => ({ ...TEXT_Q, name: `b${i}` })), after: many(25, (i) => ({ ...TEXT_Q, name: `a${i}` })) } },
  { name: '200 short questions', questions: { before: many(120, (i) => ({ ...TEXT_Q, name: `b${i}` })), after: many(80, (i) => ({ ...TEXT_Q, name: `a${i}` })) } },
  { name: 'a 30-character name', questions: { before: [{ ...TEXT_Q, name: `a${'b_9'.repeat(9)}zz` }] } },
  { name: 'a 1,000-character text', questions: { before: [{ ...TEXT_Q, text: 'x'.repeat(1_000) }] } },
  { name: 'a 200-character option and 20 options', questions: { before: [{ ...CHOICE_Q, options: ['y'.repeat(200), ...many(19, (i) => `o${i}`)] }] } },
  { name: 'min and max at the ends of the range', questions: { before: [{ ...NUMBER_Q, min: -2_147_483_647, max: 2_147_483_647 }] } },
  { name: 'min equal to max', questions: { before: [{ ...NUMBER_Q, min: 3, max: 3, required: true }] } },
  { name: 'a text holding a paired character', questions: { before: [{ ...TEXT_Q, text: 'How do you feel? 😀' }] } },
  { name: 'a text and an option holding a tab and a no-break space', questions: { before: [{ ...CHOICE_Q, text: `Your\tcolour${String.fromCharCode(0xa0)}now`, options: ['Red', `Bl\tue${String.fromCharCode(0xa0)}green`] }] } },
];

for (const probe of ACCEPTED) {
  test(`a questions field with ${probe.name} is accepted`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, questions: probe.questions }, { param: 'z' });
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}
