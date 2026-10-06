// The Study Link Builder's "A Google Sheet" choice under "Where responses
// go", beside "Another web address". Both make the same link: a store of
// kind webhook.
//
//   G1: the menu lists "A file on the participant's device", "A Google
//       Sheet", "Another web address" and "A Supabase table", in that
//       order; each choice shows its own field group and no other; "Another
//       web address" has no Google placeholder
//   G2: a link and a downloaded setup file made under each of the two web
//       choices hold store {kind: 'webhook', url}
//   G3: a c link and a setup file holding a web address open the builder
//       with "A Google Sheet" chosen for an Apps Script web app's address
//       and "Another web address" chosen otherwise, the notice labelling the
//       address "Web app URL" or "Web address"; a link made under "Another
//       web address" with a web app's address reopens as "A Google Sheet"
//   G4: "A Google Sheet" shows four setup steps, outside any hint and with
//       no retired term, and "Copy the script" puts the README's script on
//       the clipboard; a refused copy names where the script is, and with
//       no clipboard the button is hidden
//   G5: "Make the link" and "Download the setup file" under "A Google
//       Sheet" refuse an address whose host is not script.google.com, whose
//       port is not the default or whose path does not end in /exec, at the
//       field; an http: address the online form refuses gets its message
//       first, and one it takes (localhost) gets the sheet refusal; web app addresses of
//       both account kinds, in any host case and with a query, are taken;
//       "Another web address" takes any https address

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  test, expect, useTarget, encodeConfig, decodeLinkParam, setupFingerprint, serveSetup, setupQuery, retiredIn, ROOT,
} from './helpers.mjs';

const base = useTarget();

const make = (page) => page.getByRole('button', { name: 'Make the link' });
const kindSelect = (page) => page.locator('select[name="storeKind"]');
const SHEET_URL = 'https://script.google.com/macros/s/abc/exec';
const WEB_URL = 'https://example.org/rows';

// The two web choices: the menu value, the field it fills, and that
// field's label as the notice lists it.
const WEB_CHOICES = [
  { value: 'sheet', field: 'sheetUrl', label: 'Web app URL', url: SHEET_URL },
  { value: 'webhook', field: 'store', label: 'Web address', url: WEB_URL },
];

async function openBuilder(page, query = '') {
  await page.goto(`${base()}link.html${query}`);
  await expect(make(page)).toBeEnabled();
}

async function fillPlain(page) {
  await page.locator('#instrumentList select').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('sheet');
}

// G1
test('the destination menu lists four choices, and each shows its own fields', async ({ page }) => {
  await openBuilder(page);
  const options = await kindSelect(page).locator('option').evaluateAll((os) => os.map((o) => [o.value, o.textContent]));
  expect(options).toEqual([
    ['', "A file on the participant's device"],
    ['sheet', 'A Google Sheet'],
    ['webhook', 'Another web address'],
    ['supabase', 'A Supabase table'],
  ]);
  const groups = { sheet: '#sheetFields', webhook: '#webhookFields', supabase: '#supabaseFields' };
  for (const [value] of options) {
    await kindSelect(page).selectOption(value);
    for (const [kind, id] of Object.entries(groups)) {
      await expect(page.locator(id), `${id} under ${JSON.stringify(value)}`).toBeVisible({ visible: kind === value });
    }
  }
  await kindSelect(page).selectOption('sheet');
  await expect(page.getByLabel(/^Web app URL/)).toBeVisible();
  await kindSelect(page).selectOption('webhook');
  await expect(page.getByLabel(/^Web address/)).toBeVisible();
  expect(await page.locator('input[name="store"]').getAttribute('placeholder')).not.toContain('script.google.com');
});

// G2
for (const choice of WEB_CHOICES) {
  test(`a link and a setup file made under ${choice.value} hold a webhook store`, async ({ page }) => {
    await openBuilder(page);
    await fillPlain(page);
    await kindSelect(page).selectOption(choice.value);
    await page.locator(`input[name="${choice.field}"]`).fill(choice.url);
    await make(page).click();
    await expect(page.locator('#err')).toHaveText('');
    const config = { instrument: 'hitopbr', study: 'sheet', store: { kind: 'webhook', url: choice.url } };
    expect(decodeLinkParam(await page.locator('#out').textContent())).toEqual(config);
    await page.getByLabel('In a file I host').check();
    const saving = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the setup file' }).click();
    const file = JSON.parse(await readFile(await (await saving).path(), 'utf8'));
    expect(file).toEqual(config);
  });
}

// G3: a c link and a setup file per choice.
for (const choice of WEB_CHOICES) {
  const config = { instrument: 'hitopbr', study: 'reopened', store: { kind: 'webhook', url: choice.url } };
  const expectChosen = async (page) => {
    await expect(page.locator('#err')).toHaveText('');
    await expect(kindSelect(page)).toHaveValue(choice.value);
    await expect(page.locator(`input[name="${choice.field}"]`)).toHaveValue(choice.url);
    await expect(page.locator('#prefilledList li').first()).toHaveText(`${choice.label}: ${choice.url}`);
  };
  test(`a c link with ${choice.url} opens with ${choice.value} chosen`, async ({ page }) => {
    await openBuilder(page, `?c=${encodeConfig(config)}`);
    await expectChosen(page);
  });
  test(`a setup file with ${choice.url} opens with ${choice.value} chosen`, async ({ page }) => {
    await serveSetup(page, JSON.stringify(config));
    await openBuilder(page, `?${setupQuery({ sha256: setupFingerprint(config) })}`);
    await expectChosen(page);
  });
}

// G4: the README's script, read from README.md here: the fenced js block in
// step 2 of "Send responses to a Google Sheet", its 3-space list indent
// removed, ending in one line break.
async function readmeScript() {
  const lines = (await readFile(path.join(ROOT, 'README.md'), 'utf8')).split('\n');
  const from = lines.indexOf('## Send responses to a Google Sheet');
  const open = lines.indexOf('   ```js', from);
  const close = lines.indexOf('   ```', open + 1);
  expect(from, 'the README section').toBeGreaterThan(-1);
  expect(open, 'the js fence').toBeGreaterThan(from);
  const body = lines.slice(open + 1, close);
  for (const line of body) expect(line === '' || line.startsWith('   '), `indent of ${JSON.stringify(line)}`).toBe(true);
  return `${body.map((line) => line.slice(3)).join('\n')}\n`;
}

test('"Copy the script" copies the README\'s script, beside the setup steps', async ({ page }) => {
  await page.addInitScript(() => {
    window.copied = [];
    navigator.clipboard.writeText = async (text) => { window.copied.push(text); };
  });
  await openBuilder(page);
  await expect(page.getByRole('button', { name: 'Copy the script' })).toBeHidden();
  await kindSelect(page).selectOption('sheet');
  const steps = page.locator('#sheetSteps li');
  await expect(steps).toHaveText([
    /^Make a new Google Sheet\. In its menu, choose Extensions, then Apps Script\.$/,
    /^Press "Copy the script"\. .*Code\.gs.*save\.$/,
    /^Choose Deploy, then New deployment\. .*"Execute as" to Me.*"Who has access" to Anyone\./,
    /^Copy the web app URL, which ends in \/exec, and paste it below\.$/,
  ]);
  expect(await page.locator('#sheetSteps').evaluate((n) => n.closest('.hint') === null && n.querySelector('.hint') === null), 'the steps are not a hint').toBe(true);
  expect(retiredIn(await page.locator('#sheetFields').innerText()), 'retired terms in the sheet fields').toEqual([]);
  await page.getByRole('button', { name: 'Copy the script' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  const copied = await page.evaluate(() => window.copied);
  expect(copied).toHaveLength(1);
  expect(copied[0]).toBe(await readmeScript());
  expect(copied[0]).toContain('function doPost(e) {');
});

// G4: a copy the browser refuses says where the script is, and a browser
// with no clipboard shows no button.
test('a refused copy names where to find the script', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.clipboard.writeText = async () => { throw new Error('denied'); };
  });
  await openBuilder(page);
  await kindSelect(page).selectOption('sheet');
  await page.getByRole('button', { name: 'Copy the script' }).click();
  await expect(page.locator('#err')).toHaveText('The script could not be copied. Under "A Google Sheet", open "What the script does, and how to change it" and copy it from there.');
  await expect(page.getByRole('link', { name: 'What the script does, and how to change it' })).toBeVisible();
  expect(retiredIn(await page.locator('#err').textContent())).toEqual([]);
});

test('with no clipboard, "Copy the script" is hidden and the README link shows', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined, configurable: true });
  });
  await openBuilder(page);
  await kindSelect(page).selectOption('sheet');
  await expect(page.locator('#sheetSteps')).toBeVisible();
  await expect(page.locator('#copyScript')).toBeHidden();
  await expect(page.getByRole('link', { name: 'What the script does, and how to change it' })).toBeVisible();
});

// G5: the addresses "A Google Sheet" refuses, and those it takes. The
// refusal is stated here in full rather than read from link.html.
const SHEET_REFUSAL = 'Where responses go could not be used: "A Google Sheet" needs the web app URL, the address that ends in /exec. For another server, choose "Another web address".';
const NOT_SHEET = [
  'https://docs.google.com/spreadsheets/d/x/edit',
  'https://script.google.com/home/projects/x/edit',
  'https://script.google.com/macros/s/x/dev',
  'https://script.google.com/macros/s/x/exec/',
  'https://script.google.com.evil.org/macros/s/x/exec',
  'https://script.googleusercontent.com/macros/echo?x=1',
  'https://example.org/exec',
  'https://script.google.com:8443/macros/s/x/exec',
  // The online form takes http: to localhost, so this one reaches the
  // sheet check.
  'http://localhost/macros/s/x/exec',
];
const SHEET_OK = [
  'https://script.google.com/macros/s/x/exec',
  'https://SCRIPT.GOOGLE.COM/macros/s/x/exec',
  'https://script.google.com/a/macros/example.edu/s/x/exec',
  'https://script.google.com/macros/s/x/exec?y=1',
];

async function tryAddress(page, value, url) {
  await openBuilder(page);
  await fillPlain(page);
  await kindSelect(page).selectOption(value);
  await page.locator(`input[name="${value === 'sheet' ? 'sheetUrl' : 'store'}"]`).fill(url);
  await make(page).click();
}

for (const url of NOT_SHEET) {
  test(`"A Google Sheet" refuses ${url}`, async ({ page }) => {
    await tryAddress(page, 'sheet', url);
    await expect(page.locator('#err')).toHaveText(SHEET_REFUSAL);
    await expect(page.locator('input[name="sheetUrl"]')).toBeFocused();
    await expect(page.locator('#result')).toBeHidden();
    expect(retiredIn(SHEET_REFUSAL), 'retired terms in the refusal').toEqual([]);
  });
}

test('"Download the setup file" refuses a sheet address too, and saves nothing', async ({ page }) => {
  await openBuilder(page);
  await fillPlain(page);
  await kindSelect(page).selectOption('sheet');
  await page.locator('input[name="sheetUrl"]').fill(NOT_SHEET[0]);
  await page.getByLabel('In a file I host').check();
  let saved = false;
  page.on('download', () => { saved = true; });
  await page.getByRole('button', { name: 'Download the setup file' }).click();
  await expect(page.locator('#err')).toHaveText(SHEET_REFUSAL);
  await expect(page.locator('input[name="sheetUrl"]')).toBeFocused();
  expect(saved).toBe(false);
});

test('an http: address under "A Google Sheet" gets the online form\'s https message', async ({ page }) => {
  await tryAddress(page, 'sheet', 'http://script.google.com/macros/s/x/exec');
  await expect(page.locator('#err')).toHaveText(/^Where responses go could not be used: its url/);
  await expect(page.locator('#err')).not.toHaveText(SHEET_REFUSAL);
});

for (const url of SHEET_OK) {
  test(`"A Google Sheet" takes ${url}`, async ({ page }) => {
    await tryAddress(page, 'sheet', url);
    await expect(page.locator('#err')).toHaveText('');
    expect(decodeLinkParam(await page.locator('#out').textContent()).store).toEqual({ kind: 'webhook', url: new URL(url).href });
  });
}

test('"Another web address" takes an address that is not a web app\'s', async ({ page }) => {
  await tryAddress(page, 'webhook', 'https://example.org/rows');
  await expect(page.locator('#err')).toHaveText('');
  expect(decodeLinkParam(await page.locator('#out').textContent()).store).toEqual({ kind: 'webhook', url: 'https://example.org/rows' });
});

// G3: the round trip from "Another web address" to "A Google Sheet".
test('a web app URL entered under "Another web address" reopens as "A Google Sheet"', async ({ page }) => {
  await openBuilder(page);
  await fillPlain(page);
  await kindSelect(page).selectOption('webhook');
  await page.locator('input[name="store"]').fill(SHEET_URL);
  await make(page).click();
  await expect(page.locator('#err')).toHaveText('');
  const href = await page.locator('#out').textContent();
  await openBuilder(page, new URL(href).search);
  await expect(kindSelect(page)).toHaveValue('sheet');
  await expect(page.locator('input[name="sheetUrl"]')).toHaveValue(SHEET_URL);
});
