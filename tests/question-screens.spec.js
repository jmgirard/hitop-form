// The two question screens: `before`, ahead of the start screen, and
// `after`, behind the last item page. Walked on the PID-5-BF, whose 25 items
// fill two pages.
//
//   QS1: a link with only before shows "Before you begin" with the
//        questions numbered from 1, a required one ending in "(required)",
//        and Next and no Back; Next shows the start screen; the last item
//        page carries Finish
//   QS2: a link with only after shows the start screen first; the last item
//        page carries Next, which shows "Before you finish" with Back and
//        Finish; Back shows the last item page with its answers kept, and
//        Next shows the questions again with theirs kept
//   QS3: a link with consent and both lists shows consent, then before,
//        then the start screen, and after behind the last item page
//   QS4: a question text and an option label holding `<b>x</b>` and `&amp;`
//        show as that text, with no `b` element; a text and a label with
//        spaces around them show trimmed
//   QS5: each type left unanswered while required is refused, "Please
//        answer question <n> before continuing.", with focus on its input
//        and the screen kept; a text of white space counts as no answer; the
//        same questions not required go on unanswered
//   QS6: a number answer of abc, 2.5, 1e3, min - 1 or max + 1 is refused
//        with the question's range, and -0 and 007 are accepted; a number
//        question with no bound refuses abc as "a whole number"; the range
//        line under a bounded question states the range
//   QS7: a text answer holding a lone surrogate is refused, naming the
//        question by its number
//   QS8: closing the page asks first once a before question holds an
//        answer, and not when it holds none

import { test, expect } from '@playwright/test';
import { useTarget, openForm, begin, walkAll, currentPage, answerPage, nextButton } from './helpers.mjs';

const base = useTarget();

const LINK = { instrument: 'pid5bf', study: 'screens', participant: 's1' };
const NOTE = { name: 'note', text: 'Anything to add?', type: 'text' };
const AGE = { name: 'age', text: 'Your age', type: 'number', min: 18, max: 99 };
const COLOUR = { name: 'colour', text: 'Pick one', type: 'choice', options: ['Red', 'Blue', 'Green'] };
const DAYS = { name: 'days', text: 'Pick any', type: 'multi', options: ['Mon', 'Tue', 'Wed'] };

const heading = (page) => page.locator('h1');
const alert = (page) => page.locator('[role=alert]');
const button = (page, name) => page.getByRole('button', { name, exact: true });

async function captions(page) {
  return page.$$eval('.question', (ns) => ns.map((n) => n.querySelector('legend, label').innerText));
}

// Walks every item page and stops on the last, answered, without pressing
// its forward button.
async function walkToLast(page) {
  for (;;) {
    const { page: p, of } = await currentPage(page);
    await answerPage(page);
    if (p === of) return;
    await nextButton(page).click();
    await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${of}`);
  }
}

// QS1
test('a link with only before asks its questions ahead of the start screen', async ({ page }) => {
  await openForm(page, base(), { ...LINK, questions: { before: [NOTE, { ...AGE, required: true }] } });
  await expect(heading(page)).toHaveText('Before you begin');
  await expect(heading(page)).toBeFocused();
  expect(await captions(page)).toEqual(['1. Anything to add?', '2. Your age (required)']);
  await expect(button(page, 'Back')).toHaveCount(0);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
  await expect(button(page, 'Begin')).toHaveCount(0);
  await page.locator('.question[data-name=age] input').fill('30');
  await button(page, 'Next').click();
  await expect(button(page, 'Begin')).toBeVisible();
  await begin(page);
  await walkToLast(page);
  await expect(nextButton(page)).toHaveText('Finish');
});

// QS2
test('a link with only after asks its questions behind the last item page, with Back', async ({ page }) => {
  await openForm(page, base(), { ...LINK, questions: { after: [NOTE, COLOUR] } });
  await expect(button(page, 'Begin')).toBeVisible();
  await begin(page);
  await walkToLast(page);
  const lastPage = await page.$$eval('fieldset.item input:checked', (ns) => ns.map((n) => `${n.name}=${n.value}`));
  await expect(nextButton(page)).toHaveText('Next');
  await nextButton(page).click();
  await expect(heading(page)).toHaveText('Before you finish');
  await expect(heading(page)).toBeFocused();
  await expect(page.locator('fieldset.item')).toHaveCount(0);
  expect(await page.$$eval('.nav button', (ns) => ns.map((n) => n.textContent))).toEqual(['Back', 'Finish']);
  await page.locator('.question[data-name=note] input').fill('hello');
  await page.getByLabel('Blue').check();
  await button(page, 'Back').click();
  await expect(page.locator('.progress')).toHaveText('Page 2 of 2');
  expect(await page.$$eval('fieldset.item input:checked', (ns) => ns.map((n) => `${n.name}=${n.value}`))).toEqual(lastPage);
  await nextButton(page).click();
  await expect(heading(page)).toHaveText('Before you finish');
  await expect(page.locator('.question[data-name=note] input')).toHaveValue('hello');
  await expect(page.getByLabel('Blue')).toBeChecked();
});

// QS3
test('a link with consent and both lists shows consent, before, the start screen, the items, then after', async ({ page }) => {
  await openForm(page, base(), { ...LINK, consent: { text: 'Please read this.' }, questions: { before: [NOTE], after: [COLOUR] } }, { param: 'z' });
  await expect(heading(page)).toHaveText('Consent to take part');
  await button(page, 'I agree').click();
  await expect(heading(page)).toHaveText('Before you begin');
  await button(page, 'Next').click();
  await expect(button(page, 'Begin')).toBeVisible();
  await begin(page);
  await walkToLast(page);
  await nextButton(page).click();
  await expect(heading(page)).toHaveText('Before you finish');
});

// QS4
test('question text and option labels are written as text, trimmed', async ({ page }) => {
  await openForm(page, base(), {
    ...LINK,
    questions: { before: [{ name: 'mark', text: '  <b>x</b> &amp; y  ', type: 'choice', options: [' <b>x</b> ', '&amp;'] }] },
  });
  await expect(heading(page)).toHaveText('Before you begin');
  expect(await page.locator('.question legend .text').innerText()).toBe('<b>x</b> &amp; y');
  expect(await page.$$eval('.question .options .label', (ns) => ns.map((n) => n.textContent))).toEqual(['<b>x</b>', '&amp;']);
  await expect(page.locator('main b')).toHaveCount(0);
});

// QS5
const REQUIRED = [NOTE, AGE, COLOUR, DAYS].map((q) => ({ ...q, required: true }));

test('each required type left unanswered is refused by number, and a text of white space is no answer', async ({ page }) => {
  await openForm(page, base(), { ...LINK, questions: { before: REQUIRED } });
  await expect(heading(page)).toHaveText('Before you begin');
  const fill = {
    note: async () => page.locator('.question[data-name=note] input').fill('ok'),
    age: async () => page.locator('.question[data-name=age] input').fill('40'),
    colour: async () => page.getByLabel('Green').check(),
    days: async () => page.getByLabel('Tue').check(),
  };
  await page.locator('.question[data-name=note] input').fill('   ');
  for (const [i, q] of REQUIRED.entries()) {
    await button(page, 'Next').click();
    await expect(alert(page)).toHaveText(`Please answer question ${i + 1} before continuing.`);
    await expect(page.locator(`.question[data-name=${q.name}] input`).first()).toBeFocused();
    await expect(page.locator(`.question[data-name=${q.name}]`)).toHaveClass(/unanswered/);
    await expect(heading(page)).toHaveText('Before you begin');
    await fill[q.name]();
  }
  await button(page, 'Next').click();
  await expect(button(page, 'Begin')).toBeVisible();
});

test('the same questions not required go on unanswered', async ({ page }) => {
  await openForm(page, base(), { ...LINK, questions: { before: [NOTE, AGE, COLOUR, DAYS] } });
  await button(page, 'Next').click();
  await expect(button(page, 'Begin')).toBeVisible();
});

// QS6
const AGE_RANGE = 'Question 1 needs a whole number from 18 to 99.';

for (const [typed, why] of [['abc', AGE_RANGE], ['2.5', AGE_RANGE], ['1e3', AGE_RANGE], ['17', AGE_RANGE], ['100', AGE_RANGE]]) {
  test(`a number answer of ${typed} is refused with the range`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, questions: { after: [AGE] } });
    await begin(page);
    await walkToLast(page);
    await nextButton(page).click();
    await page.locator('.question[data-name=age] input').fill(typed);
    await button(page, 'Finish').click();
    await expect(alert(page)).toHaveText(why);
    await expect(page.locator('.question[data-name=age] input')).toBeFocused();
    await expect(heading(page)).toHaveText('Before you finish');
  });
}

for (const typed of ['-0', '007', ' 18 ', '99']) {
  test(`a number answer of ${JSON.stringify(typed)} is accepted`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, questions: { before: [{ ...AGE, min: -5, max: 99 }] } });
    await page.locator('.question[data-name=age] input').fill(typed);
    await button(page, 'Next').click();
    await expect(button(page, 'Begin')).toBeVisible();
  });
}

test('the range line states each bound, and an unbounded number refuses abc as a whole number', async ({ page }) => {
  await openForm(page, base(), {
    ...LINK,
    questions: { before: [{ name: 'n', text: 'n', type: 'number' }, { ...AGE }, { name: 'lo', text: 'lo', type: 'number', min: -3 }, { name: 'hi', text: 'hi', type: 'number', max: 7 }] },
  });
  await expect(heading(page)).toHaveText('Before you begin');
  expect(await page.$$eval('.question .range', (ns) => ns.map((n) => n.textContent))).toEqual([
    'A whole number from 18 to 99.', 'A whole number of -3 or more.', 'A whole number of 7 or less.',
  ]);
  await expect(page.locator('.question[data-name=age] input')).toHaveAttribute('inputmode', 'numeric');
  await expect(page.locator('.question[data-name=age] input')).toHaveAttribute('aria-describedby', 'q-age-hint');
  await page.locator('.question[data-name=n] input').fill('abc');
  await button(page, 'Next').click();
  await expect(alert(page)).toHaveText('Question 1 needs a whole number.');
  await page.locator('.question[data-name=n] input').fill('12');
  await page.locator('.question[data-name=lo] input').fill('-4');
  await button(page, 'Next').click();
  await expect(alert(page)).toHaveText('Question 3 needs a whole number of -3 or more.');
  await page.locator('.question[data-name=lo] input').fill('-3');
  await page.locator('.question[data-name=hi] input').fill('8');
  await button(page, 'Next').click();
  await expect(alert(page)).toHaveText('Question 4 needs a whole number of 7 or less.');
});

// QS8: the page's unload guard counts a question's answer. Chromium shows
// a beforeunload dialog only after the page had a user gesture, so the
// control clicks into the same input and types nothing.
for (const typed of ['hello', '']) {
  test(`closing the page with a before question ${typed ? 'answered asks first' : 'unanswered does not ask'}`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, questions: { before: [NOTE] } });
    const input = page.locator('.question[data-name=note] input');
    await input.click();
    if (typed) await input.pressSequentially(typed);
    const dialogs = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.type());
      await d.accept();
    });
    await page.close({ runBeforeUnload: true });
    await expect.poll(() => page.isClosed()).toBe(true);
    expect(dialogs).toEqual(typed ? ['beforeunload'] : []);
  });
}

// QS7
test('a text answer holding a lone surrogate is refused, naming the question by its number', async ({ page }) => {
  await openForm(page, base(), { ...LINK, questions: { before: [AGE, NOTE] } });
  await page.locator('.question[data-name=note] input').evaluate((input) => {
    input.value = `bad ${String.fromCharCode(0xd800)}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await button(page, 'Next').click();
  await expect(alert(page)).toHaveText('Question 2 holds a character this page cannot read. Please type it again.');
  await expect(page.locator('.question[data-name=note] input')).toBeFocused();
});
