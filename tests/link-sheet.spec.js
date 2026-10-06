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

import { readFile } from 'node:fs/promises';
import {
  test, expect, useTarget, encodeConfig, decodeLinkParam, setupFingerprint, serveSetup, setupQuery,
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
