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
//   P4: at 375 px, on the first and the last page of each part of a
//       HiTOP-BR link and of a PID-5-BF plus HiTOP-BR link: "Page p of n"
//       above the items and beside the Next or Finish button, n the pages
//       of that instrument, and under the list "Part k of m" in both
//       places; every option's label at least 44 px high; with three items
//       missed and then one, a press marks each missed item "Please answer
//       this item" and no other, puts the count directly above the first
//       missed item, and scrolls that item into view
//   P5: the first and the last page of each of the five instruments hold a
//       closed "Instructions" section above the items, whose body text is
//       the export's instructions.start
//   P6: "I do not agree" asks first, with the consent text still shown and
//       focus on the question; "Go back" draws the consent screen again
//       with both buttons, and no request or file follows; "Yes, I do not
//       agree" reaches the declined screen, and with completeDeclined the
//       page then goes there. While a send runs, a line says the answers
//       are sending; after a send answered HTTP 500 and after a failed
//       connection, the saved-file screen is headed "Your answers were not
//       sent", says the file holds the answers, and shows no HTTP detail
//       outside the closed study-team section

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

// A browser that has DecompressionStream but not its deflate-raw format, as
// some older Chromium releases do, stood in for by a constructor that throws
// a TypeError for that format: the page says what it says with no
// DecompressionStream.
test('a z link in a browser whose DecompressionStream lacks deflate-raw says to open it in another browser', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.DecompressionStream;
    window.DecompressionStream = class extends Native {
      constructor(format) {
        if (format === 'deflate-raw') throw new TypeError(`Failed to construct 'DecompressionStream': Unsupported compression format: '${format}'`);
        super(format);
      }
    };
  });
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
  await expect(page.locator('.done')).toHaveText('Your answers were sent to the study team.');
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
  expect(headings).toEqual(['PID-5-BF', 'PID-5-BF', 'PID-5-BF', 'Your answers were not sent']);
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

// The hint names no giver, since a recruiting site's participant got the
// identifier from the site and not from the study team.
const HINT = 'Type your participant identifier exactly as you received it.';

test('the identifier screen shows a hint under the label, tied to the input', async ({ page }) => {
  const input = await openIdentifierScreen(page);
  const label = page.locator('label[for="participant"]');
  await expect(label).toHaveText('Participant identifier');
  const hintId = await input.getAttribute('aria-describedby');
  expect(hintId, 'the input names a description').toBeTruthy();
  const hint = page.locator(`[id="${hintId}"]`);
  await expect(hint).toHaveCount(1);
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText(HINT);
  // Under the label: the hint's top is at or below the label's bottom, and
  // above the input.
  const [l, h, i] = await Promise.all([label.boundingBox(), hint.boundingBox(), input.boundingBox()]);
  expect(h.y, 'the hint starts below the label').toBeGreaterThanOrEqual(l.y + l.height - 1);
  expect(i.y, 'the input starts below the hint').toBeGreaterThanOrEqual(h.y + h.height - 1);
  // The label names the input, so the hint is its description and not its name.
  await expect(page.getByRole('textbox', { name: 'Participant identifier', exact: true })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Participant identifier' })).toHaveAccessibleDescription(HINT);
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

// ---- P4 ---------------------------------------------------------------

// The count above the first missed item, stated here.
const missedCount = (n) => (n === 1 ? '1 item on this page has no answer yet.' : `${n} items on this page have no answer yet.`);

// Answers every item on the page through the page itself, the first option
// of each, so a long walk takes one evaluation a page.
async function answerAll(page) {
  await page.locator('fieldset.item').evaluateAll((nodes) => {
    for (const fs of nodes) fs.querySelector('input[type=radio]').click();
  });
}

// Presses the forward button and waits for the next screen.
async function forward(page) {
  await markScreen(page);
  await nextButton(page).click();
  await waitNewScreen(page);
}

// The checks P4 makes on an item page: page `p` of `n`, part `k` of `m`
// (m 1 for a single instrument).
async function expectProgress(page, { p, n, k, m }) {
  const pageText = `Page ${p} of ${n}`;
  const partText = `Part ${k} of ${m}`;
  const where = page.locator('main > p.where');
  await expect(where.locator('.progress')).toHaveText(pageText);
  if (m > 1) await expect(where).toHaveText(`${partText} · ${pageText}`);
  else await expect(where).toHaveText(pageText);
  const step = page.locator('.nav .step');
  await expect(step).toHaveText(m > 1 ? `${partText} · ${pageText}` : pageText);
  // Above the items: the line ends before the first item starts.
  const [w, item] = await Promise.all([where.boundingBox(), page.locator('fieldset.item').first().boundingBox()]);
  expect(w.y + w.height, `${pageText}: the line above the items`).toBeLessThanOrEqual(item.y);
  // Beside the button: on its row, and just before it.
  const button = nextButton(page);
  await expect(button).toHaveText(/^(Next|Finish)$/);
  const [s, b] = await Promise.all([step.boundingBox(), button.boundingBox()]);
  expect(s.y < b.y + b.height && b.y < s.y + s.height, `${pageText}: the line shares the button's row`).toBe(true);
  expect(s.x + s.width, `${pageText}: the line ends before the button`).toBeLessThanOrEqual(b.x);
  expect(b.x - (s.x + s.width), `${pageText}: no more than 2rem between them`).toBeLessThanOrEqual(32);
  // Each option's label is the target a finger presses.
  const heights = await page.locator('fieldset.item .options label').evaluateAll((ls) => ls.map((l) => l.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(0);
  expect(Math.min(...heights), `${pageText}: the lowest option label`).toBeGreaterThanOrEqual(44);
}

// Leaves the items at places `blank` (counted from 1 on the page) without
// an answer, presses forward, and checks the marks, the count above the
// first, and the scroll; the page stays.
async function expectMissed(page, blank) {
  const items = page.locator('fieldset.item');
  const before = await page.locator('.progress').textContent();
  await nextButton(page).click();
  // The count is written in the frame after the alert moves.
  await expect(page.locator('.missed-count'), 'the count after the press').toHaveText(missedCount(blank.length));
  const marked = await items.evaluateAll((ns) => ns.map((n, i) => (n.querySelector('.missed') ? i + 1 : null)).filter((i) => i !== null));
  expect(marked, 'the items marked').toEqual(blank);
  for (const i of blank) await expect(items.nth(i - 1).locator('.missed')).toHaveText('Please answer this item');
  const first = items.nth(blank[0] - 1);
  const above = await first.evaluate((n) => ({
    cls: n.previousElementSibling?.className ?? null,
    text: n.previousElementSibling?.textContent ?? null,
    role: n.previousElementSibling?.getAttribute('role') ?? null,
  }));
  expect(above, 'the element directly above the first missed item').toEqual({ cls: 'missed-count', text: missedCount(blank.length), role: 'alert' });
  await expect(first, 'the first missed item is in view').toBeInViewport();
  await expect(page.locator('.progress'), 'the page stays').toHaveText(before);
}

// Whether item `i` (counted from 1 on the page) carries a mark: its
// "Please answer this item" text and the aria-describedby naming it.
async function markOf(page, i) {
  return page.locator('fieldset.item').nth(i - 1).evaluate((n) => ({
    text: n.querySelector('.missed')?.textContent ?? null,
    describedBy: n.getAttribute('aria-describedby'),
  }));
}

// Probes the page on show: three items missed, then one, then all answered.
// The one left is the middle item, well above the Next or Finish button,
// which the click brings into view, so the scroll check can fail; the last
// item would already be in view.
async function probeMissed(page) {
  const items = page.locator('fieldset.item');
  const n = await items.count();
  const blank = [Math.ceil(n / 2), n - 2, n];
  // The alert is on the page before any press, empty and hidden, above the
  // first item.
  const drawn = await items.first().evaluate((f) => {
    const p = f.previousElementSibling;
    return { cls: p?.className ?? null, role: p?.getAttribute('role') ?? null, text: p?.textContent ?? null, shown: p ? p.getClientRects().length > 0 : null };
  });
  expect(drawn, 'the alert drawn on show').toEqual({ cls: 'missed-count', role: 'alert', text: '', shown: false });
  await answerPage(page, { skip: blank });
  await expectMissed(page, blank);
  // From here, count each change to the alert's text.
  await page.locator('.missed-count').evaluate((c) => {
    window.countWrites = 0;
    new MutationObserver((ms) => { window.countWrites += ms.length; }).observe(c, { childList: true, characterData: true, subtree: true });
  });
  // A changed answer to an item that was never missed leaves the number,
  // and the alert, as they are.
  await items.nth(0).locator('input[type=radio]').nth(1).check();
  await expect(items.nth(0).locator('input[type=radio]').nth(1)).toBeChecked();
  expect(await page.evaluate(() => window.countWrites), 'writes to the alert after an answer that leaves the count').toBe(0);
  // Each answer to a missed item takes its own mark away, leaves the other
  // marks, and lowers the count at once, before any press.
  for (const [k, i] of blank.slice(1).entries()) {
    await items.nth(i - 1).locator('input[type=radio]').first().check();
    expect(await markOf(page, i), `item ${i}'s mark after its answer`).toEqual({ text: null, describedBy: null });
    for (const j of blank.slice(k + 2)) {
      expect(await markOf(page, j), `item ${j}'s mark after item ${i}'s answer`).toEqual({ text: 'Please answer this item', describedBy: `missed-${await items.nth(j - 1).getAttribute('data-number')}` });
    }
    await expect(page.locator('.missed-count'), 'the count after an answer').toHaveText(missedCount(blank.length - k - 1));
  }
  expect(await page.evaluate(() => window.countWrites), 'writes to the alert after two answers that each lower the count').toBeGreaterThan(0);
  await expectMissed(page, blank.slice(0, 1));
  await items.nth(blank[0] - 1).locator('input[type=radio]').first().check();
  await expect(page.locator('.missed-count'), 'the count goes once every item is answered').toHaveText('');
  await expect(page.locator('.missed-count'), 'the empty alert is hidden').toBeHidden();
}

for (const link of [
  { name: 'a HiTOP-BR link', config: { instrument: 'hitopbr' }, pages: [3] },
  { name: 'a PID-5-BF plus HiTOP-BR link', config: { instruments: ['pid5bf', 'hitopbr'] }, pages: [2, 3] },
]) {
  test(`${link.name}: the progress lines, the option targets and the missed-item marks, at 375 px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(formUrl(base(), { ...link.config, study: 'screens', participant: 'p4' }));
    const m = link.pages.length;
    for (const [i, n] of link.pages.entries()) {
      // The part's start screen, whose one button is Begin.
      await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
      await forward(page);
      for (let p = 1; p <= n; p++) {
        if (p === 1 || p === n) {
          await expectProgress(page, { p, n, k: i + 1, m });
          await probeMissed(page);
        } else {
          await answerAll(page);
        }
        await forward(page);
      }
    }
    await expect(page.locator('main > h1')).toHaveText('Thank you');
  });
}

// ---- P5 ---------------------------------------------------------------

// The instructions section on the page on show: closed, named
// "Instructions", above the first item, and the text of its body.
async function expectReminder(page, start, label) {
  const reminder = page.locator('main > details.reminder');
  await expect(reminder, label).toHaveCount(1);
  await expect(reminder).toHaveJSProperty('open', false);
  await expect(reminder.locator('> summary')).toHaveText('Instructions');
  const body = await reminder.evaluate((d) => [...d.childNodes].filter((c) => c.nodeName !== 'SUMMARY').map((c) => c.textContent).join(''));
  expect(body, `${label}: the body text`).toBe(start);
  const before = await reminder.evaluate((d) => !!(d.compareDocumentPosition(document.querySelector('fieldset.item')) & Node.DOCUMENT_POSITION_FOLLOWING));
  expect(before, `${label}: above the items`).toBe(true);
}

for (const stem of ['hitopsr', 'hitopbr', 'pid5', 'pid5sf', 'pid5bf']) {
  test(`${TITLES[stem]}: the first and the last page hold the closed instructions`, async ({ page }) => {
    const exp = await fetchExport(stem);
    const n = Math.ceil(exp.items.length / 15);
    await openForm(page, base(), { instrument: stem, study: 'screens', participant: 'p5' });
    await forward(page);
    await expectReminder(page, exp.instructions.start, `${TITLES[stem]} page 1`);
    for (let p = 1; p < n; p++) {
      await answerAll(page);
      await forward(page);
    }
    await expect(page.locator('.progress')).toHaveText(`Page ${n} of ${n}`);
    await expectReminder(page, exp.instructions.start, `${TITLES[stem]} page ${n}`);
  });
}

// ---- P6 ---------------------------------------------------------------

const QUESTION = 'Are you sure you do not agree to take part?';
const DECLINED_URL = 'https://app.prolific.com/submissions/complete?cc=NOCONSENT';

// The consent screen as first drawn: the text and the two buttons.
async function expectConsentScreen(page) {
  await expect(page.locator('main > h1')).toHaveText('Consent to take part');
  await expect(page.locator('.consent p')).toHaveText(CONSENT.split('\n\n'));
  await expect(page.locator('main button')).toHaveText(['I agree', 'I do not agree']);
  await expect(page.locator('.confirm')).toHaveCount(0);
}

test('"I do not agree" asks first, and "Go back" draws the consent screen again with nothing sent or saved', async ({ page }) => {
  await openForm(page, base(), { instrument: 'pid5bf', study: 'screens', participant: 'p6', consent: { text: CONSENT } }, { param: 'z' });
  await expectConsentScreen(page);
  const requests = [];
  let downloads = 0;
  page.on('request', (r) => requests.push(r.url()));
  page.on('download', () => { downloads += 1; });

  await page.getByRole('button', { name: 'I do not agree', exact: true }).click();
  await expect(page.locator('.consent p'), 'the consent text stays').toHaveText(CONSENT.split('\n\n'));
  await expect(page.locator('.confirm-question')).toHaveText(QUESTION);
  await expect(page.locator('.confirm-question')).toBeFocused();
  await expect(page.getByRole('group', { name: QUESTION })).toHaveCount(1);
  await expect(page.locator('main button')).toHaveText(['Yes, I do not agree', 'Go back']);

  await page.getByRole('button', { name: 'Go back' }).click();
  await expectConsentScreen(page);
  await expect(page.locator('main > h1')).toBeFocused();
  await page.waitForTimeout(1000);
  expect(requests, 'requests after the presses').toEqual([]);
  expect(downloads, 'files saved').toBe(0);

  // The question again, then the decline.
  await page.getByRole('button', { name: 'I do not agree', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, I do not agree' }).click();
  await expect(page.locator('main > h1')).toHaveText('Thank you');
  await expect(page.locator('.declined')).toHaveText('You chose not to take part. You can close this page.');
  expect(requests, 'requests after the decline').toEqual([]);
  expect(downloads, 'files saved').toBe(0);
});

test('"Yes, I do not agree" with a completeDeclined address goes there', async ({ page }) => {
  const reached = [];
  await page.route(DECLINED_URL, (route) => {
    reached.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Declined</title><h1>Declined</h1>' });
  });
  await openForm(page, base(), {
    instrument: 'pid5bf', study: 'screens', participant: 'p6', consent: { text: CONSENT }, completeDeclined: DECLINED_URL,
  }, { param: 'z' });
  await expectConsentScreen(page);
  await page.getByRole('button', { name: 'I do not agree', exact: true }).click();
  expect(reached, 'nothing before the confirming press').toEqual([]);
  await page.getByRole('button', { name: 'Yes, I do not agree' }).click();
  await expect(page).toHaveURL(DECLINED_URL);
  expect(reached).toEqual([DECLINED_URL]);
});

const SENDING = 'Sending your answers. Please keep this page open.';

// The status line on a screen whose Finish sends: drawn with the screen,
// empty, directly above the buttons, so the press changes the text of a
// status region already on the page. Marked, so the test can tell the press
// filled this line rather than adding a new one.
async function markSendingLine(page) {
  const line = page.locator('p.sending');
  await expect(line, 'the sending line is drawn with the screen').toHaveCount(1);
  await expect(line).toHaveAttribute('role', 'status');
  await expect(line).toHaveText('');
  expect(await line.evaluate((n) => n.nextElementSibling.classList.contains('nav')), 'directly above the buttons').toBe(true);
  await line.evaluate((n) => { n.dataset.drawn = '1'; });
}

test('the "Before you finish" screen of a link with a store draws the sending line empty, and Finish fills it', async ({ page }) => {
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route(STORE_URL, async (route) => {
    await held;
    return route.fulfill({ status: 500, headers: CORS, body: 'down' });
  });
  await openForm(page, base(), {
    instrument: 'pid5bf', study: 'screens', participant: 'p6', store: { kind: 'webhook', url: STORE_URL }, questions: { after: [NOTE] },
  });
  const downloading = awaitDownload(page);
  await forward(page);
  await answerAll(page);
  await forward(page);
  await answerAll(page);
  await expect(page.locator('p.sending'), 'no sending line on an item page with Next').toHaveCount(0);
  await forward(page);
  await expect(page.locator('main > h1')).toHaveText('Before you finish');
  await markSendingLine(page);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.locator('p.sending[data-drawn]')).toHaveText(SENDING);
  release();
  await downloading;
  await expect(page.locator('main > h1')).toHaveText('Your answers were not sent');
});

test('a link without a store draws no sending line', async ({ page }) => {
  await openForm(page, base(), { instrument: 'pid5bf', study: 'screens', participant: 'p6' });
  await forward(page);
  await answerAll(page);
  await forward(page);
  await expect(nextButton(page)).toHaveText('Finish');
  await expect(page.locator('p.sending')).toHaveCount(0);
});

for (const outcome of [
  { name: 'answered HTTP 500', answer: (route) => route.fulfill({ status: 500, headers: CORS, body: 'down' }), fault: 'The send was not confirmed: the server answered HTTP 500.' },
  { name: 'a failed connection', answer: (route) => route.abort('connectionrefused'), fault: 'The send was not confirmed: the connection failed.' },
]) {
  test(`a send ${outcome.name} says it is sending, then that the answers were not sent`, async ({ page }) => {
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route(STORE_URL, async (route) => {
      await held;
      return outcome.answer(route);
    });
    await openForm(page, base(), { instrument: 'pid5bf', study: 'screens', participant: 'p6', store: { kind: 'webhook', url: STORE_URL } });
    const downloading = awaitDownload(page);
    await forward(page);
    await answerAll(page);
    await forward(page);
    await answerAll(page);
    await markSendingLine(page);
    await nextButton(page).click();
    await expect(page.locator('p.sending[data-drawn]')).toHaveText(SENDING);
    await expect(nextButton(page)).toBeDisabled();
    release();
    const download = await downloading;

    await expect(page.locator('main > h1')).toHaveText('Your answers were not sent');
    await expect(page.locator('.done')).toContainText(
      'This page got no confirmation that your answers reached the study team. They were saved on this device instead',
    );
    await expect(page.locator('code.filename')).toHaveText(download.suggestedFilename());
    await expect(page.locator('main > p').nth(2)).toHaveText(
      'This file holds your answers. Please send it to the study team the way they asked. If the file did not appear, press Save the file.',
    );
    await expect(refusalText(page)).toHaveText(outcome.fault);
    const details = page.locator('main > details.study-team');
    await expect(details).toHaveJSProperty('open', false);
    await expect(details.locator('> summary')).toHaveText(SUMMARY);
    const shown = await page.locator('main').innerText();
    expect(shown, 'the shown text').not.toMatch(/\bHTTP\b|\b500\b|connection/i);
  });
}
