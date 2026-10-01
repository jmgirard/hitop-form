// The screens a participant sees, as a participant reads them.
//
//   P1: each call of showError() in form.js shows its refusal on a screen
//       with the heading, one sentence for the participant, and the
//       refusal's own text in a closed "Details for the study team"
//       section; no other text shows. A failed export fetch says to check
//       the connection and reload, a browser that cannot unpack a `z` link
//       says to open it in another browser, and any other refusal says to
//       contact the study team. A search of form.js lists the calls
//   P2: three walks, each screen read as shown: consent, questions before
//       and after, two instruments and no store, to the saved-file screen;
//       a web address with a complete address, from the identifier screen
//       to the sent screen; and a send answered HTTP 500 with a
//       completeSaved address, to the saved-file screen. On every screen
//       the page's own text (all shown text but the consent text, the
//       questions, the study name and the file name) holds no build date,
//       package version, host name or HTTP status, and none of the words
//       store, endpoint, JSON, descriptor and module. Every screen ends
//       with the closed study-team section, whose footer holds one version
//       line per instrument
//   P3: the identifier screen: a hint under the "Participant identifier"
//       label, named by the input's aria-describedby; the input turns off
//       capitals, correction and spell check; Enter runs Begin's checks, so
//       an empty value or one holding a lone surrogate gets Begin's alert
//       and a filled value starts the form

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  useTarget, openForm, formUrl, fetchExport, exportUrl, readDescriptor, refusalText, ROOT,
  answerPage, nextButton, awaitDownload, COMPLETE_URL, COMPLETE_SAVED_URL, CONTINUE,
} from './helpers.mjs';

const base = useTarget();

const TITLES = { hitopsr: 'HiTOP-SR', hitopbr: 'HiTOP-BR', pid5: 'PID-5', pid5sf: 'PID-5-SF', pid5bf: 'PID-5-BF' };

// A web address no test server holds: each test answers it with a route.
const STORE_URL = 'https://store.example.org/hook';
const CORS = { 'access-control-allow-origin': '*' };

// Answers the store's POST with `status`, a 200 carrying the confirmation
// the page reads. Returns the requests it saw.
async function routeStore(page, status) {
  const seen = [];
  await page.route(STORE_URL, (route) => {
    seen.push(route.request().method());
    return route.fulfill({
      status,
      headers: CORS,
      contentType: 'application/json',
      body: status === 200 ? '{"ok":true}' : '{"error":"down"}',
    });
  });
  return seen;
}

// Marks the screen on show, so waitNewScreen() can tell when a press has
// replaced it: every screen is drawn new, heading included.
async function markScreen(page) {
  await page.locator('main > h1').evaluate((h) => { h.dataset.old = '1'; });
}

async function waitNewScreen(page) {
  await expect(page.locator('main > h1:not([data-old])')).toHaveCount(1);
}

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

// ---- P2 ---------------------------------------------------------------

const CONSENT = 'This study asks about your mood.\n\nYou can stop at any time.';
const AGE = { name: 'age', text: 'Your age in years', type: 'number', min: 18, max: 99, required: true };
const NOTE = { name: 'note', text: 'Anything else to tell us?', type: 'text' };
const WORDS = [/\bstores?\b/i, /\bendpoint\b/i, /\bjson\b/i, /\bdescriptor\b/i, /\bmodule\b/i];

// The page's own text on the screen on show: the rendered text of `main`,
// which leaves out the body of the closed study-team section, with each
// piece of the researcher's text cut out.
async function ownText(page, researcher) {
  let text = await page.locator('main').innerText();
  for (const piece of researcher) text = text.split(piece).join('\n');
  return text;
}

// The checks P2 makes on each screen. `exps` and `stems` are the link's,
// `hosts` every host the walk touches, and `researcher` the researcher's
// text the screen can show.
async function expectOwnText(page, { exps, stems, hosts, researcher }) {
  const h1 = await page.locator('main > h1').textContent();
  const own = await ownText(page, researcher);
  for (const exp of exps) {
    expect(own, `${h1}: the build date`).not.toContain(exp.buildDate);
    expect(own, `${h1}: the package version`).not.toContain(exp.packageVersion);
  }
  for (const host of hosts) expect(own, `${h1}: the host ${host}`).not.toContain(host);
  expect(own, `${h1}: an HTTP status`).not.toMatch(/\bHTTP\b|\b500\b/i);
  for (const word of WORDS) expect(own, `${h1}: ${word}`).not.toMatch(word);
  const details = page.locator('main > details.study-team');
  await expect(details, `${h1}: the study-team section`).toHaveCount(1);
  await expect(details).toHaveJSProperty('open', false);
  await expect(page.locator('main > *').last(), `${h1}: the section ends the screen`).toHaveClass('study-team');
  await expect(details.locator('> footer > .version'), `${h1}: the version lines`).toHaveText(
    stems.length > 1
      ? exps.map((e, k) => `${TITLES[stems[k]]} form build ${e.buildDate} · ${e.package} ${e.packageVersion}`)
      : [`Form build ${exps[0].buildDate} · ${exps[0].package} ${exps[0].packageVersion}`],
  );
}

// Walks from the screen on show to a closing screen, checking each screen
// on the way, and returns the headings in order. Each press is the one a
// participant makes: I agree, the questions answered then Next or Finish,
// Begin (with `participant` typed when asked), and each item page answered
// then Next or Finish.
async function walkScreens(page, check, { participant } = {}) {
  const headings = [];
  for (;;) {
    await check();
    const h1 = await page.locator('main > h1').textContent();
    headings.push(h1);
    await markScreen(page);
    if (h1 === 'Consent to take part') {
      await page.getByRole('button', { name: 'I agree' }).click();
    } else if (h1 === 'Before you begin') {
      await page.locator('input[name="q-age"]').fill('30');
      await page.getByRole('button', { name: 'Next' }).click();
    } else if (h1 === 'Before you finish') {
      await page.locator('input[name="q-note"]').fill('Nothing.');
      await page.getByRole('button', { name: 'Finish' }).click();
    } else if (await page.getByRole('button', { name: 'Begin' }).count() === 1) {
      const input = page.locator('input[name="participant"]');
      if (await input.count() === 1) await input.fill(participant);
      await page.getByRole('button', { name: 'Begin' }).click();
    } else if (await page.locator('fieldset.item').count() > 0) {
      await answerPage(page);
      await nextButton(page).click();
    } else {
      return headings;
    }
    await waitNewScreen(page);
  }
}

test('a walk with consent, questions and two instruments to the saved-file screen shows only the participant text', async ({ page }) => {
  const stems = ['pid5bf', 'hitopbr'];
  const exps = await Promise.all(stems.map(fetchExport));
  const config = {
    instruments: stems, study: 'screens', participant: 'p2a',
    consent: { text: CONSENT }, questions: { before: [AGE], after: [NOTE] },
  };
  await page.goto(formUrl(base(), config, '', 'z'));
  await expect(page.locator('main > h1')).toHaveText('Consent to take part');
  const downloading = awaitDownload(page);
  let fileName = null;
  const researcher = () => [
    ...CONSENT.split('\n\n'), AGE.text, NOTE.text, 'Nothing.', config.study, ...(fileName ? [fileName] : []),
  ];
  const hosts = [new URL(base()).host, '127.0.0.1', 'localhost', new URL(exportUrl('hitopbr')).host];
  const headings = await walkScreens(page, async () => {
    if (await page.locator('code.filename').count() === 1) fileName = await page.locator('code.filename').textContent();
    await expectOwnText(page, { exps, stems, hosts, researcher: researcher() });
  });
  await downloading;
  expect(headings).toEqual([
    'Consent to take part', 'Before you begin',
    'PID-5-BF', 'PID-5-BF', 'PID-5-BF',
    'HiTOP-BR', 'HiTOP-BR', 'HiTOP-BR', 'HiTOP-BR',
    'Before you finish', 'Thank you',
  ]);
  expect(fileName, 'the walk reached the saved-file screen').not.toBeNull();
});

test('a walk from the identifier screen to the sent screen, with a complete address, shows only the participant text', async ({ page }) => {
  const exps = [await fetchExport('pid5bf')];
  const posts = await routeStore(page, 200);
  // A 204 answer leaves the sent screen in place, so it can be read after
  // the page asks for the completion address.
  const navigations = [];
  await page.route(COMPLETE_URL, (route) => {
    navigations.push(route.request().url());
    return route.fulfill({ status: 204 });
  });
  await openForm(page, base(), {
    instrument: 'pid5bf', study: 'screens', store: { kind: 'webhook', url: STORE_URL }, complete: COMPLETE_URL,
  });
  await expect(page.locator('input[name="participant"]')).toBeVisible();
  const hosts = [new URL(base()).host, '127.0.0.1', 'localhost', new URL(exportUrl('pid5bf')).host, 'store.example.org', 'app.prolific.com'];
  const headings = await walkScreens(page, async () => {
    await expectOwnText(page, { exps, stems: ['pid5bf'], hosts, researcher: ['screens', 'p2b'] });
  }, { participant: 'p2b' });
  expect(headings).toEqual(['PID-5-BF', 'PID-5-BF', 'PID-5-BF', 'Thank you']);
  expect(posts, 'one send').toEqual(['POST']);
  await expect.poll(() => navigations, 'the page asked for the completion address').toEqual([COMPLETE_URL]);
  await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
  await expect(page.locator('p.complete a')).toHaveText(CONTINUE);
});

test('a walk whose send is answered HTTP 500, with a completeSaved address, shows only the participant text', async ({ page }) => {
  const exps = [await fetchExport('pid5bf')];
  await routeStore(page, 500);
  await openForm(page, base(), {
    instrument: 'pid5bf', study: 'screens', participant: 'p2c', store: { kind: 'webhook', url: STORE_URL },
    complete: COMPLETE_URL, completeSaved: COMPLETE_SAVED_URL,
  });
  const downloading = awaitDownload(page);
  let fileName = null;
  const hosts = [
    new URL(base()).host, '127.0.0.1', 'localhost', new URL(exportUrl('pid5bf')).host,
    'store.example.org', 'app.prolific.com', 'saved.example.org',
  ];
  const headings = await walkScreens(page, async () => {
    if (await page.locator('code.filename').count() === 1) fileName = await page.locator('code.filename').textContent();
    await expectOwnText(page, { exps, stems: ['pid5bf'], hosts, researcher: ['screens', 'p2c', ...(fileName ? [fileName] : [])] });
  });
  await downloading;
  expect(headings).toEqual(['PID-5-BF', 'PID-5-BF', 'PID-5-BF', 'Thank you']);
  await expect(page.locator('p.complete a')).toHaveAttribute('href', COMPLETE_SAVED_URL);
  await expect(refusalText(page)).toHaveText('The send was not confirmed: the server answered HTTP 500.');
});

// ---- P3 ---------------------------------------------------------------

const EMPTY_ALERT = 'Please enter your participant identifier before starting.';
const UNREADABLE_ALERT = 'Your participant identifier holds a character this page cannot read. Please type it again.';

async function openIdentifierScreen(page) {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'screens' });
  const input = page.locator('input[name="participant"]');
  await expect(input).toBeVisible();
  return input;
}

test('the identifier screen shows a hint under the label, tied to the input', async ({ page }) => {
  const input = await openIdentifierScreen(page);
  const label = page.locator('label[for="participant"]');
  await expect(label).toHaveText('Participant identifier');
  const hintId = await input.getAttribute('aria-describedby');
  expect(hintId, 'the input names a description').toBeTruthy();
  const hint = page.locator(`[id="${hintId}"]`);
  await expect(hint).toHaveCount(1);
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText('Type the identifier the study team gave you, exactly as they gave it.');
  // Under the label: the hint's top is at or below the label's bottom, and
  // above the input.
  const [l, h, i] = await Promise.all([label.boundingBox(), hint.boundingBox(), input.boundingBox()]);
  expect(h.y, 'the hint starts below the label').toBeGreaterThanOrEqual(l.y + l.height - 1);
  expect(i.y, 'the input starts below the hint').toBeGreaterThanOrEqual(h.y + h.height - 1);
  // The label names the input, so the hint is its description and not its name.
  await expect(page.getByRole('textbox', { name: 'Participant identifier', exact: true })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Participant identifier' })).toHaveAccessibleDescription(
    'Type the identifier the study team gave you, exactly as they gave it.',
  );
});

test('the identifier input turns off capitals, correction and spell check', async ({ page }) => {
  const input = await openIdentifierScreen(page);
  await expect(input).toHaveAttribute('autocapitalize', 'off');
  await expect(input).toHaveAttribute('autocorrect', 'off');
  await expect(input).toHaveAttribute('spellcheck', 'false');
  expect(await input.evaluate((n) => n.spellcheck), 'the spellcheck property').toBe(false);
});

// Enter and Begin side by side: each case is made once with each key, on a
// fresh load, and both must reach the same screen.
for (const press of ['Enter', 'Begin']) {
  const go = async (page, input) => {
    if (press === 'Enter') await input.press('Enter');
    else await page.getByRole('button', { name: 'Begin' }).click();
  };

  test(`${press} with the identifier empty shows Begin's alert and starts nothing`, async ({ page }) => {
    const input = await openIdentifierScreen(page);
    await input.focus();
    await go(page, input);
    await expect(page.locator('[role=alert]')).toHaveText(EMPTY_ALERT);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
    await expect(input).toBeFocused();
  });

  test(`${press} with an identifier holding a lone surrogate shows Begin's alert and starts nothing`, async ({ page }) => {
    const input = await openIdentifierScreen(page);
    await input.evaluate((n) => { n.value = 'a\ud800b'; });
    await input.focus();
    await go(page, input);
    await expect(page.locator('[role=alert]')).toHaveText(UNREADABLE_ALERT);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
  });

  test(`${press} with an identifier filled starts the form`, async ({ page }) => {
    const input = await openIdentifierScreen(page);
    await input.fill('p3');
    await go(page, input);
    await expect(page.locator('.progress')).toHaveText('Page 1 of 3');
    await expect(page.locator('fieldset.item')).toHaveCount(15);
  });
}
