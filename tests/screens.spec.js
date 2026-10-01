// The screens a participant sees, as a participant reads them.
//
//   P1: each call of showError() in form.js shows its refusal on a screen
//       with the heading, one sentence for the participant, and the
//       refusal's own text in a closed "Details for the study team"
//       section; no other text shows. A failed export fetch says to check
//       the connection and reload, a browser that cannot unpack a `z` link
//       says to open it in another browser, and any other refusal says to
//       contact the study team. A search of form.js lists the calls

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  useTarget, openForm, formUrl, fetchExport, exportUrl, readDescriptor, refusalText, ROOT,
} from './helpers.mjs';

const base = useTarget();

const SUMMARY = 'Details for the study team';

// The participant's sentence on an error screen, by what the participant
// can do, stated here rather than read from form.js.
const NEXT = {
  connection: 'Please check your internet connection, then reload this page.',
  browser: 'Please open the study link in another browser, such as a current version of Chrome, Edge, Firefox or Safari.',
  contact: 'Please contact the study team, and show them the details below.',
};

// The lines of text a participant sees in `main`: its rendered text, which
// leaves out the body of a closed `<details>`, split into its non-empty
// lines.
async function shownLines(page) {
  const text = await page.locator('main').evaluate((m) => m.innerText);
  return text.split('\n').map((line) => line.trim()).filter((line) => line !== '');
}

// An error screen: the heading, the one sentence, the closed section with
// the refusal in it, and no other shown text.
async function expectErrorScreen(page, next, message) {
  await expect(page.locator('h1')).toHaveText('This form cannot be shown');
  await expect(page.locator('[role=alert]')).toHaveText(next);
  const details = page.locator('details.study-team');
  await expect(details).toHaveCount(1);
  await expect(details).toHaveJSProperty('open', false);
  await expect(details.locator('> summary')).toHaveText(SUMMARY);
  await expect(refusalText(page)).toHaveText(message);
  expect(await shownLines(page), 'the text the screen shows').toEqual(['This form cannot be shown', next, SUMMARY]);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
  await expect(page.locator('button')).toHaveCount(0);
}

// P1: the search the criterion names. Each call outside the definition is
// one of the three boot() makes, one per step of loading the form; a new
// call fails here until a test below fires it.
test('form.js calls showError() at three places, one per loading step', async () => {
  const source = await readFile(path.join(ROOT, 'form.js'), 'utf8');
  const calls = source.split('\n').filter((line) => /\bshowError\(/.test(line) && !/^function showError\(/.test(line));
  expect(calls.map((line) => line.trim())).toEqual([
    'showError(root, e);',
    'showError(root, e);',
    'showError(root, e, [versionFooter(exps, linkStems(config))]);',
  ]);
});

// P1: the first call, reading the link.
test('a link that is not a form says to contact the study team', async ({ page }) => {
  await page.goto(`${base()}?c=bm90IGpzb24`);
  await expectErrorScreen(page, NEXT.contact, 'The study link could not be read. Ask the study team for a new link.');
});

test('a z link in a browser that cannot unpack it says to open it in another browser', async ({ page }) => {
  await page.addInitScript(() => { delete window.DecompressionStream; });
  await openForm(page, base(), { instrument: 'hitopbr', study: 'screens', participant: 'p1' }, { param: 'z' });
  await expectErrorScreen(
    page,
    NEXT.browser,
    'This browser cannot read the study link, because it cannot unpack it. Open the link in a current version of Chrome, Edge, Firefox or Safari.',
  );
});

// P1: the second call, fetching the exports. A fetch that fails outright
// is a connection failure, for one instrument and for a list; an export
// the site answers with an error status is not.
test('an export fetch that fails says to check the connection and reload', async ({ page }) => {
  await page.route(exportUrl('hitopbr'), (route) => route.abort('internetdisconnected'));
  await openForm(page, base(), { instrument: 'hitopbr', study: 'screens', participant: 'p1' });
  await expectErrorScreen(
    page,
    NEXT.connection,
    `The instrument could not be fetched from ${exportUrl('hitopbr')}. Check the connection and reload.`,
  );
});

test('an export fetch that fails in a list says to check the connection and reload', async ({ page }) => {
  await page.route(exportUrl('pid5bf'), (route) => route.abort('internetdisconnected'));
  await page.goto(formUrl(base(), { instruments: ['hitopbr', 'pid5bf'], study: 'screens', participant: 'p1' }));
  await expectErrorScreen(
    page,
    NEXT.connection,
    `PID-5-BF: The instrument could not be fetched from ${exportUrl('pid5bf')}. Check the connection and reload.`,
  );
});

test('an export the site answers with HTTP 500 says to contact the study team', async ({ page }) => {
  await page.route(exportUrl('hitopbr'), (route) => route.fulfill({ status: 500, body: 'down' }));
  await openForm(page, base(), { instrument: 'hitopbr', study: 'screens', participant: 'p1' });
  await expectErrorScreen(page, NEXT.contact, `The instrument could not be fetched from ${exportUrl('hitopbr')} (HTTP 500).`);
});

// P1: the third call, planning the items once the exports are loaded. The
// export served lacks the module's first item. The version line sits in
// the closed section after the refusal, so the screen shows no more text.
test('a module naming an item the export lacks says to contact the study team', async ({ page }) => {
  const module = await readDescriptor('module-plain.json');
  const exp = await fetchExport('hitopsr');
  const served = { ...exp, items: exp.items.filter((it) => it.number !== module.items[0]) };
  await openForm(page, base(), { instrument: 'hitopsr', study: 'screens', participant: 'p1', module }, { exportJson: served });
  await expectErrorScreen(
    page,
    NEXT.contact,
    `The study link's module names item ${module.items[0]}, which the HiTOP-SR export does not have.`,
  );
  await expect(page.locator('details.study-team > footer .version')).toHaveText(
    `Form build ${exp.buildDate} · ${exp.package} ${exp.packageVersion}`,
  );
});
