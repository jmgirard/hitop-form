// A link's `instruments` list, walked: the page gives each instrument in
// turn in one session.
//
//   W1: the page fetches every export in the list before it shows its first
//       screen: with one export held back, no screen of the form shows
//   W2: a refused export under a list is named by its instrument: a missing
//       export, and an export of another format; with two refused, the first
//       in the list's order is named
//   W3: a walk of two instruments (HiTOP-BR, PID-5-BF) and of three
//       (PID-5-BF, a HiTOP-SR module, HiTOP-BR): each instrument has its own
//       start screen with its title, the version lines of every instrument
//       in its study-team section, "Part n of N", its
//       instructions and its own item and page counts, then its item pages.
//       Positions and page labels count within each instrument, and the
//       first page of each carries no Back. With no participant in the link,
//       only the first start screen asks for one, and only the first says
//       where the answers go. The HiTOP-SR entry shows the module's items
//   W4: the PID-5-BF's first page, after a walk of the HiTOP-BR whose item
//       numbers 1 to 25 it shares, has no radio checked
//   W5: with consent and questions, the screens come in the order consent,
//       before, each instrument, after, for two and for three instruments;
//       Back on the after screen goes to the last page of the last
//       instrument, and Back on a later page of an instrument stays within it
//   W6: closing the page asks first with an item answered on the first
//       page, and not with none; it also asks on the second instrument's
//       first page, where only the first instrument holds answers
//   W7: the start screen of a link with one instrument shows no part line

import {
  test, expect, useTarget, formUrl, begin, walkAll, fetchExport, exportUrl, routeExport, readDescriptor, chosenIndexFor, PAGE_SIZE, refusalText,
} from './helpers.mjs';

const base = useTarget();

const TITLES = { hitopsr: 'HiTOP-SR', hitopbr: 'HiTOP-BR', pid5bf: 'PID-5-BF' };
const STORE_NOTICE = 'Your answers are saved to this device as one file when you finish. No answer is sent anywhere.';

// The items each entry of a list shows, in the export's order: the module's
// items for the HiTOP-SR entry when the link carries one.
function shownNumbers(exp, module) {
  return module && exp.stem === 'hitopsr' ? module.items : exp.items.map((it) => it.number);
}

// Checks the start screen of place `k` of `stems`, fills the participant
// identifier on the first when `participant` is given, presses Begin, checks
// the first page, and walks the instrument's pages with its own pattern.
// Returns the item numbers seen, in order.
async function walkPart(page, { k, stems, exps, module, participant }) {
  const exp = exps[k];
  const count = shownNumbers(exp, module).length;
  const pages = Math.ceil(count / PAGE_SIZE);
  await expect(page.locator('h1')).toHaveText(TITLES[stems[k]]);
  await expect(page.locator('details.study-team > footer .version')).toHaveText(
    exps.map((e, j) => `${TITLES[stems[j]]} form build ${e.buildDate} · ${e.package} ${e.packageVersion}`),
  );
  await expect(page.locator('.part')).toHaveText(`Part ${k + 1} of ${stems.length}`);
  await expect(page.locator('.start')).toHaveText(exp.instructions.start);
  const counts = `${count} items over ${pages} ${pages === 1 ? 'page' : 'pages'}.`;
  await expect(page.locator('p.muted')).toHaveText(k === 0 ? `${counts} ${STORE_NOTICE}` : counts);
  await expect(page.locator('input[name="participant"]'), 'the identifier is asked on the first start screen only')
    .toHaveCount(k === 0 && participant !== undefined ? 1 : 0);
  await begin(page, k === 0 ? participant : undefined);
  await expect(page.locator('h1')).toHaveText(TITLES[stems[k]]);
  await expect(page.locator('.progress')).toHaveText(`Page 1 of ${pages}`);
  await expect(page.getByRole('button', { name: 'Back' }), 'no Back on the first page of an instrument').toHaveCount(0);
  await expect(page.locator('fieldset.item').first()).toHaveAttribute('data-position', '1');
  await expect(page.locator('fieldset.item').first()).toHaveAttribute('data-stem', stems[k]);
  const seen = await walkAll(page, { choose: chosenIndexFor(k) });
  return seen.map((it) => it.number);
}

// The exports of `stems`, as the page gets them (fetchExport()).
async function exportsFor(stems) {
  return Promise.all(stems.map((stem) => fetchExport(stem)));
}

// W1
test('the page fetches every export of the list before it shows its first screen', async ({ page }) => {
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  // Passed on, once released, to the route that answers it: the copy, or
  // the site under FORM_TARGET.
  await page.route(exportUrl('pid5bf'), async (route) => {
    await held;
    await route.fallback();
  });
  await page.goto(formUrl(base(), { instruments: ['hitopbr', 'pid5bf'], study: 'walk', participant: 'w1' }));
  await page.waitForTimeout(1000);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(page.locator('main')).toHaveText('Loading the form…');
  release();
  await expect(page.locator('h1')).toHaveText('HiTOP-BR');
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(1);
});

// W2
test('a missing export in a list is refused naming its instrument', async ({ page }) => {
  await routeExport(page, 'pid5bf', (route) => route.fulfill({ status: 404, body: 'not here' }));
  await page.goto(formUrl(base(), { instruments: ['hitopbr', 'pid5bf'], study: 'walk', participant: 'w2' }));
  await expect(refusalText(page)).toHaveText(`PID-5-BF: The instrument could not be fetched from ${exportUrl('pid5bf')} (HTTP 404).`);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('an export of another format in a list is refused naming its instrument', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await routeExport(page, 'hitopbr', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ ...exp, format: '2.0' }),
  }));
  await page.goto(formUrl(base(), { instruments: ['pid5bf', 'hitopbr'], study: 'walk', participant: 'w2' }));
  await expect(refusalText(page)).toHaveText('HiTOP-BR: The online form reads format "1.0" of the instrument export and found format "2.0".');
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('with two exports refused, the first in the list is named', async ({ page }) => {
  for (const stem of ['hitopbr', 'pid5bf']) {
    await routeExport(page, stem, (route) => route.fulfill({ status: 500, body: 'down' }));
  }
  await page.goto(formUrl(base(), { instruments: ['pid5bf', 'hitopsr', 'hitopbr'], study: 'walk', participant: 'w2' }));
  await expect(refusalText(page)).toHaveText(`PID-5-BF: The instrument could not be fetched from ${exportUrl('pid5bf')} (HTTP 500).`);
});

// W3, W4
test('a walk of two instruments gives each its start screen and its pages, answers kept apart', async ({ page }) => {
  const stems = ['hitopbr', 'pid5bf'];
  const exps = await exportsFor(stems);
  await page.goto(formUrl(base(), { instruments: stems, study: 'walk' }));
  const seen0 = await walkPart(page, { k: 0, stems, exps, participant: 'w3' });
  expect(seen0).toHaveLength(45);
  // W4: the PID-5-BF's item numbers 1 to 25 are the HiTOP-BR's first 25.
  await expect(page.locator('h1')).toHaveText('PID-5-BF');
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.locator('fieldset.item')).toHaveCount(15);
  await expect(page.locator('fieldset.item[data-number="1"]')).toHaveCount(1);
  await expect(page.locator('input[type=radio]:checked'), 'no answer carried from the HiTOP-BR').toHaveCount(0);
});

test('a walk of two instruments ends at the saved screen with a version line per instrument', async ({ page }) => {
  const stems = ['hitopbr', 'pid5bf'];
  const exps = await exportsFor(stems);
  await page.goto(formUrl(base(), { instruments: stems, study: 'walk' }));
  const seen0 = await walkPart(page, { k: 0, stems, exps, participant: 'w3' });
  const seen1 = await walkPart(page, { k: 1, stems, exps });
  expect(seen0).toEqual(exps[0].items.map((it) => it.number));
  expect(seen1).toEqual(exps[1].items.map((it) => it.number));
  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(page.locator('.version')).toHaveText(
    exps.map((exp, k) => `${TITLES[stems[k]]} form build ${exp.buildDate} · ${exp.package} ${exp.packageVersion}`),
  );
});

test('a walk of three instruments, with a module for the HiTOP-SR entry', async ({ page }) => {
  const stems = ['pid5bf', 'hitopsr', 'hitopbr'];
  const exps = await exportsFor(stems);
  const module = await readDescriptor('module-plain.json');
  await page.goto(formUrl(base(), { instruments: stems, study: 'walk', module }));
  const seen = [];
  for (let k = 0; k < 3; k++) seen.push(await walkPart(page, { k, stems, exps, module, participant: 'w3' }));
  expect(seen[0]).toEqual(exps[0].items.map((it) => it.number));
  expect(seen[1], 'the module items, in their printed order').toEqual(module.itemOrder ?? module.items);
  expect(seen[2]).toEqual(exps[2].items.map((it) => it.number));
  await expect(page.locator('h1')).toHaveText('Thank you');
});

test('a list link that names its participant asks on no start screen', async ({ page }) => {
  const stems = ['hitopbr', 'pid5bf'];
  const exps = await exportsFor(stems);
  await page.goto(formUrl(base(), { instruments: stems, study: 'walk', participant: 'p9' }));
  await walkPart(page, { k: 0, stems, exps });
  await walkPart(page, { k: 1, stems, exps });
  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(page.locator('code.filename')).toContainText('hitopbr-pid5bf_walk_p9_');
});

// W5: the order of screens with consent and questions.
const CONSENT = { text: 'You agree to take part.' };
const QUESTIONS = {
  before: [{ name: 'age', text: 'How old are you?', type: 'number' }],
  after: [{ name: 'note', text: 'Anything to add?', type: 'text' }],
};

for (const stems of [['hitopbr', 'pid5bf'], ['pid5bf', 'hitopsr', 'hitopbr']]) {
  test(`with consent and questions, ${stems.length} instruments come between the before and the after screen`, async ({ page }) => {
    const exps = await exportsFor(stems);
    const module = await readDescriptor('module-plain.json');
    await page.goto(formUrl(base(), {
      instruments: stems, study: 'walk', consent: CONSENT, questions: QUESTIONS, ...(stems.includes('hitopsr') ? { module } : {}),
    }));
    const headings = [];
    const record = async () => headings.push(await page.locator('h1').textContent());
    await record();
    await page.getByRole('button', { name: 'I agree' }).click();
    await record();
    await page.getByRole('button', { name: 'Next' }).click();
    for (let k = 0; k < stems.length; k++) {
      await record();
      await walkPart(page, { k, stems, exps, module, participant: 'w5' });
    }
    await record();
    expect(headings).toEqual(['Consent to take part', 'Before you begin', ...stems.map((s) => TITLES[s]), 'Before you finish']);
    // Back from the after screen: the last page of the last instrument.
    await page.getByRole('button', { name: 'Back' }).click();
    const lastExp = exps[stems.length - 1];
    const lastPages = Math.ceil(lastExp.items.length / PAGE_SIZE);
    await expect(page.locator('h1')).toHaveText(TITLES[stems[stems.length - 1]]);
    await expect(page.locator('.progress')).toHaveText(`Page ${lastPages} of ${lastPages}`);
    await expect(page.locator('input[type=radio]:checked'), 'the answers are kept').not.toHaveCount(0);
    // Back within that instrument, to its first page, which has no Back.
    for (let p = lastPages - 1; p >= 1; p--) {
      await page.getByRole('button', { name: 'Back' }).click();
      await expect(page.locator('.progress')).toHaveText(`Page ${p} of ${lastPages}`);
      await expect(page.locator('h1')).toHaveText(TITLES[stems[stems.length - 1]]);
    }
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
  });
}

// W6: the unload guard under a list link. Chromium shows a beforeunload
// dialog only after the page had a user gesture; the press of Begin is one,
// so the unanswered control has one too.
async function closeDialogs(page) {
  const dialogs = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.type());
    await d.accept();
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => page.isClosed()).toBe(true);
  return dialogs;
}

for (const answered of [true, false]) {
  test(`closing a list link's first page with ${answered ? 'an item answered asks first' : 'no item answered does not ask'}`, async ({ page }) => {
    await page.goto(formUrl(base(), { instruments: ['hitopbr', 'pid5bf'], study: 'walk', participant: 'w6' }));
    await begin(page);
    if (answered) await page.locator('fieldset.item').first().locator('input[type=radio]').first().check();
    expect(await closeDialogs(page)).toEqual(answered ? ['beforeunload'] : []);
  });
}

test('closing the second instrument\'s first page asks first, with the answers held in the first', async ({ page }) => {
  const stems = ['hitopbr', 'pid5bf'];
  const exps = await exportsFor(stems);
  await page.goto(formUrl(base(), { instruments: stems, study: 'walk', participant: 'w6' }));
  await walkPart(page, { k: 0, stems, exps });
  await expect(page.locator('.part')).toHaveText('Part 2 of 2');
  await begin(page);
  await expect(page.locator('fieldset.item').first()).toHaveAttribute('data-stem', 'pid5bf');
  await expect(page.locator('input[type=radio]:checked')).toHaveCount(0);
  expect(await closeDialogs(page)).toEqual(['beforeunload']);
});

// W7: a link with one instrument shows no part line.
test('the start screen of a single-instrument link shows no part line', async ({ page }) => {
  await page.goto(formUrl(base(), { instrument: 'hitopbr', study: 'walk', participant: 'w7' }));
  await expect(page.locator('h1')).toHaveText('HiTOP-BR');
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(1);
  await expect(page.locator('.part')).toHaveCount(0);
});
