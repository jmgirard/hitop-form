// The link builder's questions file: "Load questions from a file".
//
//   LF1: a file with a byte-order mark, CR LF line ends and its columns in
//        another order loads each question: a quoted comma, a doubled quote
//        and a quoted line break, options split at "|" and trimmed, every
//        field trimmed, required as yes, YES, no and blank, blank and
//        negative bounds, blank rows skipped, and each list in the order of
//        the file with the two lists interleaved; the editor shows the
//        before list first, and "Make the link" builds those questions
//   LF2: a file with no byte-order mark, LF line ends, only the four required
//        columns and no line end after its last row loads
//   LF3: a load takes the place of the questions the editor held
//   LF4: each fault is refused with its message, and the editor keeps the
//        questions it held: a file that is not UTF-8, an empty file, a file
//        of only a byte-order mark, a file with a header and no question
//        row, a missing required column, an unknown and a repeated column
//        name, a row with fewer and with more fields than the header, an
//        unclosed quote, a quote inside an unquoted field, text after a
//        closing quote, and field values outside the rules of the file or of
//        a question; rows count records, so a quoted line break above a
//        fault does not change its row number
//   LF5: loading a file makes no network request
//
// "Download these questions" and "Download a template":
//
//   LF6: the editor's questions, one of each type with a required question,
//        a negative minimum, and a text and an option label holding a comma,
//        a double quote and non-ASCII text, are saved as a UTF-8 file with a
//        byte-order mark and CR LF line ends, its columns in the file's
//        order and one row per question; loading that file fills the editor
//        with the same questions, and both build the same link
//   LF7: the template is saved in the same form and loads as four
//        questions, one of each type
//   LF8: "Download these questions" saves nothing and names the fault when
//        the editor holds none or holds a faulty question

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { useTarget, decodeLinkParam, awaitDownload } from './helpers.mjs';

const base = useTarget();

async function openBuilder(page) {
  await page.goto(`${base()}link.html`);
}

const BOM = '﻿';

// Chooses a file for "Load questions from a file", from a string (written as
// UTF-8) or from bytes.
async function load(page, content, name = 'questions.csv') {
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content);
  await page.locator('#questionsFile').setInputFiles({ name, mimeType: 'text/csv', buffer });
}

// What each group of the editor shows: its legend, list, name, text, type,
// options box, minimum, maximum and required box.
function readEditor(page) {
  return page.$$eval('fieldset.question-edit', (gs) => gs.map((g) => {
    const v = (n) => g.querySelector(`[name=${n}]`);
    return [g.querySelector('legend').textContent, v('qList').value, v('qName').value, v('qText').value, v('qType').value,
      v('qOptions').value, v('qMin').value, v('qMax').value, v('qRequired').checked];
  }));
}

// LF1: the columns in another order, with every form of AC1 in one file.
const FULL = BOM + [
  'type,name,list,text,max,options,min,required',
  'number,age,before,How old are you?,120,,18,yes',
  'multi,devices,after,"Which devices, if any?",,"Phone | Tablet|\nComputer ",,YES',
  ',,,,,,,',
  '  ,  , , ,,,,',
  'choice,heard,before,"Where did you hear of the ""study""?",,A friend|A poster,,no',
  ' text , note , after , Anything else? ,,,,',
  'number,temp,after,Lowest temperature today,,,-40,',
  'number,count,before,How many?, 0010 ,, -5 ,',
].join('\r\n') + '\r\n';

test('LF1: a file with a byte-order mark, CR LF and its columns in another order fills the editor', async ({ page }) => {
  await openBuilder(page);
  await load(page, FULL);
  await expect(page.locator('#questionsStatus')).toHaveText('Loaded 6 questions from questions.csv.');
  await expect(page.locator('#questionsErr')).toHaveText('');
  expect(await readEditor(page)).toEqual([
    ['Question 1', 'before', 'age', 'How old are you?', 'number', '', '18', '120', true],
    ['Question 2', 'before', 'heard', 'Where did you hear of the "study"?', 'choice', 'A friend\nA poster', '', '', false],
    ['Question 3', 'before', 'count', 'How many?', 'number', '', '-5', '10', false],
    ['Question 4', 'after', 'devices', 'Which devices, if any?', 'multi', 'Phone\nTablet\nComputer', '', '', true],
    ['Question 5', 'after', 'note', 'Anything else?', 'text', '', '', '', false],
    ['Question 6', 'after', 'temp', 'Lowest temperature today', 'number', '', '-40', '', false],
  ]);
  await page.locator('input[name="study"]').fill('file');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toHaveText('');
  expect(decodeLinkParam(await page.locator('#out').textContent()).questions).toEqual({
    before: [
      { name: 'age', text: 'How old are you?', type: 'number', min: 18, max: 120, required: true },
      { name: 'heard', text: 'Where did you hear of the "study"?', type: 'choice', options: ['A friend', 'A poster'] },
      { name: 'count', text: 'How many?', type: 'number', min: -5, max: 10 },
    ],
    after: [
      { name: 'devices', text: 'Which devices, if any?', type: 'multi', options: ['Phone', 'Tablet', 'Computer'], required: true },
      { name: 'note', text: 'Anything else?', type: 'text' },
      { name: 'temp', text: 'Lowest temperature today', type: 'number', min: -40 },
    ],
  });
});

test('LF2: a file with LF line ends, no byte-order mark and only the required columns loads', async ({ page }) => {
  await openBuilder(page);
  await load(page, 'list,name,text,type\nafter,note,Anything else?,text\nbefore,why,"Why, in a word?",text', 'mine.csv');
  await expect(page.locator('#questionsStatus')).toHaveText('Loaded 2 questions from mine.csv.');
  expect(await readEditor(page)).toEqual([
    ['Question 1', 'before', 'why', 'Why, in a word?', 'text', '', '', '', false],
    ['Question 2', 'after', 'note', 'Anything else?', 'text', '', '', '', false],
  ]);
});

test('LF3: a load takes the place of the questions in the editor', async ({ page }) => {
  await openBuilder(page);
  for (let k = 0; k < 3; k += 1) await page.getByRole('button', { name: 'Add a question' }).click();
  await expect(page.locator('fieldset.question-edit')).toHaveCount(3);
  await load(page, 'list,name,text,type\nbefore,one,Only one,text\n');
  await expect(page.locator('#questionsStatus')).toHaveText('Loaded 1 question from questions.csv.');
  expect(await readEditor(page)).toEqual([['Question 1', 'before', 'one', 'Only one', 'text', '', '', '', false]]);
});

// LF4: each probe is a file and the message it is refused with.
const HEAD = 'list,name,text,type,options,required,min,max';
const row = (...fields) => fields.join(',');
const file = (...rows) => `${[HEAD, ...rows].join('\n')}\n`;
const OK_ROW = row('before', 'ok', 'Fine', 'text', '', '', '', '');
const bad = (why) => `The file could not be used: ${why}`;
const many = (n) => Array.from({ length: n }, (_, k) => row('before', `q${k}`, 'Fine', 'text', '', '', '', ''));

const REFUSED = [
  {
    name: 'a file that is not UTF-8',
    content: Buffer.concat([Buffer.from('list,name,text,type\nbefore,cafe,Caf', 'latin1'), Buffer.from([0xe9]), Buffer.from(',text\n')]),
    message: bad('it is not UTF-8 text. In your spreadsheet, save it as "CSV UTF-8" and load that file.'),
  },
  { name: 'an empty file', content: '', message: bad('it is empty.') },
  { name: 'a file of only a byte-order mark and a line end', content: `${BOM}\r\n`, message: bad('it is empty.') },
  { name: 'a header and no question row', content: `${HEAD}\n`, message: bad('it has a header row and no question row.') },
  { name: 'a header and only blank rows', content: `${HEAD}\n,,,,,,,\n\n`, message: bad('it has a header row and no question row.') },
  {
    name: 'a missing required column',
    content: 'list,name,type\nbefore,ok,text\n',
    message: bad('row 1: it has no column text, and the file needs list, name, text and type.'),
  },
  {
    name: 'an unknown column name',
    content: 'list,Name,text,type\nbefore,ok,Fine,text\n',
    message: bad('row 1, field 2: its name is "Name", and a column is named list, name, text, type, options, required, min or max, in lower case.'),
  },
  {
    name: 'a repeated column name',
    content: 'list,name,text,type,text\nbefore,ok,Fine,text,Again\n',
    message: bad('row 1, field 5: its name "text" is also the name of field 3.'),
  },
  {
    name: 'a row with fewer fields than the header',
    content: file(OK_ROW, 'before,two,Two,text,,'),
    message: bad('row 3: it has 6 fields and row 1 has 8, so column min has no field.'),
  },
  {
    name: 'a row with more fields than the header',
    content: file(`${OK_ROW},`),
    message: bad('row 2: it has 9 fields and row 1 has 8, so field 9 has no column.'),
  },
  {
    name: 'an unclosed quote',
    content: file(OK_ROW, 'after,two,"Two,text,,,,\nafter,three,Three,text,,,,'),
    message: bad('row 3, column text: its opening quote is never closed.'),
  },
  {
    name: 'a quote inside an unquoted field',
    content: file('before,two,Two "2",text,,,,'),
    message: bad('row 2, column text: it holds a quote but does not start with one. A field that holds a quote is written in quotes, with each quote in it written twice.'),
  },
  {
    name: 'text after a closing quote',
    content: file('before,two,"Two" 2,text,,,,'),
    message: bad('row 2, column text: it has text after its closing quote. A quote inside a quoted field is written twice.'),
  },
  {
    name: 'a list outside before and after',
    content: file('Before,two,Two,text,,,,'),
    message: bad('row 2, column list: it is "Before", and a list is before or after, in lower case.'),
  },
  {
    name: 'a blank list',
    content: file(',two,Two,text,,,,'),
    message: bad('row 2, column list: it is "", and a list is before or after, in lower case.'),
  },
  {
    name: 'a required that is not yes, no or blank',
    content: file('before,two,Two,text,,true,,'),
    message: bad('row 2, column required: it is "true", and required is yes, no or blank.'),
  },
  {
    name: 'a min that is not a whole number',
    content: file('before,two,Two,number,,,1.5,'),
    message: bad('row 2, column min: it is "1.5", and a min is blank or a whole number, such as 18 or -5.'),
  },
  {
    name: 'a max that is not a number',
    content: file('before,two,Two,number,,,,ten'),
    message: bad('row 2, column max: it is "ten", and a max is blank or a whole number, such as 18 or -5.'),
  },
  {
    name: 'a max outside the range',
    content: file('before,two,Two,number,,,,2147483648'),
    message: bad('row 2, column max: its max is not a whole number from -2,147,483,647 to 2,147,483,647, and it is "2147483648".'),
  },
  {
    name: 'a blank name',
    content: file('before,,Two,text,,,,'),
    message: bad('row 2, column name: it has no name.'),
  },
  {
    name: 'a name outside the pattern',
    content: file('before,Age,Two,text,,,,'),
    message: bad('row 2, column name: its name is "Age", and a name starts with a lower-case letter and holds only lower-case letters, digits and "_", up to 30 characters.'),
  },
  {
    name: 'a name used twice, counting a quoted line break as part of its row',
    content: file('before,two,Two,choice,"A|\nB",,,', 'after,two,Again,text,,,,'),
    message: bad('row 3, column name: its name "two" is also the name of row 2.'),
  },
  {
    name: 'a blank text',
    content: file('before,two, ,text,,,,'),
    message: bad('row 2, column text: it has no text.'),
  },
  {
    name: 'a text holding a line break',
    content: file('before,two,"Line one\nline two",text,,,,'),
    message: bad('row 2, column text: its text holds a line break, and a question text is one line.'),
  },
  {
    name: 'a text of 1,001 characters',
    content: file(`before,two,${'x'.repeat(1001)},text,,,,`),
    message: bad('row 2, column text: its text has 1,001 characters, more than the 1,000 it may hold.'),
  },
  {
    name: 'a type in upper case',
    content: file('before,two,Two,Text,,,,'),
    message: bad('row 2, column type: its type is "Text", and a type is "text", "number", "choice" or "multi".'),
  },
  {
    name: 'a choice with one option',
    content: file('before,two,Two,choice,Only,,,'),
    message: bad('row 2, column options: it has 1 option, and a question holds 2 to 20.'),
  },
  {
    name: 'a choice with no options',
    content: file('before,two,Two,choice,,,,'),
    message: bad('row 2, column options: it is a choice question and has no options.'),
  },
  {
    name: 'an empty option between two separators',
    content: file('before,two,Two,multi,A||B,,,'),
    message: bad('row 2, column options: its option 2 is empty or holds only white space.'),
  },
  {
    name: 'two options the same',
    content: file('before,two,Two,choice,A|B| A ,,,'),
    message: bad('row 2, column options: its options 1 and 3 are the same after trimming: "A".'),
  },
  {
    name: 'an option of 201 characters',
    content: file(`before,two,Two,choice,A|${'b'.repeat(201)},,,`),
    message: bad('row 2, column options: its option 2 has 201 characters, more than the 200 it may hold.'),
  },
  {
    name: 'options on a text question',
    content: file('before,two,Two,text,A|B,,,'),
    message: bad('row 2, column options: it is a text question and cannot have options.'),
  },
  {
    name: 'a min on a choice question',
    content: file('before,two,Two,choice,A|B,,1,'),
    message: bad('row 2, column min: it is a choice question and cannot have a min.'),
  },
  {
    name: 'a min above the max',
    content: file('before,two,Two,number,,,10,5'),
    message: bad('row 2, column min: its min 10 is above its max 5.'),
  },
  { name: '51 questions', content: file(...many(51)), message: bad('it has 51 questions, more than the 50 it may hold.') },
];

for (const probe of REFUSED) {
  test(`LF4: the builder refuses ${probe.name} and keeps the editor's questions`, async ({ page }) => {
    await openBuilder(page);
    await load(page, 'list,name,text,type\nafter,kept,Kept question,text\n');
    await expect(page.locator('#questionsStatus')).toHaveText('Loaded 1 question from questions.csv.');
    await load(page, probe.content);
    await expect(page.locator('#questionsErr')).toHaveText(probe.message);
    await expect(page.locator('#questionsStatus')).toHaveText('');
    expect(await readEditor(page)).toEqual([['Question 1', 'after', 'kept', 'Kept question', 'text', '', '', '', false]]);
  });
}

// LF5: the requests are recorded from the first network idle, so the page's
// own files are not in the record.
test('LF5: loading a file makes no network request', async ({ page }) => {
  await page.goto(`${base()}link.html`, { waitUntil: 'networkidle' });
  const urls = [];
  page.on('request', (req) => urls.push(req.url()));
  await load(page, FULL);
  await expect(page.locator('#questionsStatus')).toHaveText('Loaded 6 questions from questions.csv.');
  await page.waitForLoadState('networkidle');
  expect(urls).toEqual([]);
});

// Adds a group with "Add a question" and fills it.
async function addQ(page, { list, name, text, type, options, min, max, required }) {
  await page.getByRole('button', { name: 'Add a question' }).click();
  const g = page.locator('fieldset.question-edit').last();
  await g.locator('[name=qList]').selectOption(list);
  await g.locator('[name=qName]').fill(name);
  await g.locator('[name=qText]').fill(text);
  await g.locator('[name=qType]').selectOption(type);
  if (options !== undefined) await g.locator('[name=qOptions]').fill(options);
  if (min !== undefined) await g.locator('[name=qMin]').fill(min);
  if (max !== undefined) await g.locator('[name=qMax]').fill(max);
  if (required) await g.locator('[name=qRequired]').check();
}

// Presses a download button and returns the saved file's name and bytes.
async function download(page, button) {
  const saved = awaitDownload(page);
  await page.getByRole('button', { name: button }).click();
  const dl = await saved;
  return { name: dl.suggestedFilename(), bytes: await readFile(await dl.path()) };
}

// The questions field of the link "Make the link" builds from the editor.
async function linkQuestions(page) {
  await page.locator('input[name="study"]').fill('round trip');
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toHaveText('');
  return decodeLinkParam(await page.locator('#out').textContent()).questions;
}

// The form of every saved file: a byte-order mark, then lines each ended by
// CR LF, with no LF alone.
function expectFileForm(bytes) {
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const text = bytes.subarray(3).toString('utf8');
  expect(text.endsWith('\r\n')).toBe(true);
  expect(/(?<!\r)\n/.test(text)).toBe(false);
  return text;
}

test('LF6: the editor saved as a file loads back as the same questions', async ({ page }) => {
  await openBuilder(page);
  await addQ(page, { list: 'after', name: 'note', text: 'Anything, "else"?', type: 'text' });
  await addQ(page, { list: 'before', name: 'age', text: 'Age, in "years" ñ', type: 'number', min: '-5', max: '120', required: true });
  await addQ(page, { list: 'before', name: 'pick', text: 'Pick one', type: 'choice', options: 'Café, au lait\nTea "green"\nWater' });
  await addQ(page, { list: 'after', name: 'days', text: 'Días', type: 'multi', options: 'Mon\nTue' });
  const before = await readEditor(page);
  const { name, bytes } = await download(page, 'Download these questions');
  expect(name).toBe('questions.csv');
  await expect(page.locator('#questionsErr')).toHaveText('');
  expect(expectFileForm(bytes)).toBe([
    'list,name,text,type,options,required,min,max',
    'before,age,"Age, in ""years"" ñ",number,,yes,-5,120',
    'before,pick,Pick one,choice,"Café, au lait|Tea ""green""|Water",no,,',
    'after,note,"Anything, ""else""?",text,,no,,',
    'after,days,Días,multi,Mon|Tue,no,,',
  ].map((line) => `${line}\r\n`).join(''));
  const built = await linkQuestions(page);

  await openBuilder(page);
  await load(page, bytes);
  await expect(page.locator('#questionsStatus')).toHaveText('Loaded 4 questions from questions.csv.');
  // The editor held the lists interleaved; the loaded file holds the before
  // list first, so the same groups come back in list order.
  const byList = [...before].sort((a, b) => (a[1] === b[1] ? 0 : a[1] === 'before' ? -1 : 1))
    .map((g, k) => [`Question ${k + 1}`, ...g.slice(1)]);
  expect(await readEditor(page)).toEqual(byList);
  expect(await linkQuestions(page)).toEqual(built);
});

test('LF7: the template is saved in the same form and loads as one question of each type', async ({ page }) => {
  await openBuilder(page);
  const { name, bytes } = await download(page, 'Download a template');
  expect(name).toBe('questions-template.csv');
  const text = expectFileForm(bytes);
  expect(text.split('\r\n')[0]).toBe('list,name,text,type,options,required,min,max');
  await openBuilder(page);
  await load(page, bytes, name);
  await expect(page.locator('#questionsStatus')).toHaveText('Loaded 4 questions from questions-template.csv.');
  const types = (await readEditor(page)).map((g) => g[4]);
  expect([...types].sort()).toEqual(['choice', 'multi', 'number', 'text']);
});

for (const { label, setup, message } of [
  {
    label: 'no question',
    setup: async () => {},
    message: 'There are no questions to download. Add a question or load a file first.',
  },
  {
    label: 'a question with no name',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Add a question' }).click();
      await page.locator('[name=qText]').fill('No name');
    },
    message: 'The questions could not be used: question 1: it has no name.',
  },
]) {
  test(`LF8: "Download these questions" saves nothing from an editor with ${label}`, async ({ page }) => {
    await openBuilder(page);
    await setup(page);
    let saved = 0;
    page.on('download', () => { saved += 1; });
    await page.getByRole('button', { name: 'Download these questions' }).click();
    await expect(page.locator('#questionsErr')).toHaveText(message);
    // A download starts inside the press, so one would be recorded by now.
    await page.waitForTimeout(500);
    expect(saved).toBe(0);
  });
}
