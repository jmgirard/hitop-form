// The Study Link Builder's "Choose the module file" control.
//
//   MF1: choosing tests/fixtures/module-plain.json as a file puts the
//        file's text in the "Module file" box, and "Make the link" then
//        builds the same link as the same text pasted into the box; that
//        link's module is the fixture's
//   MF2: after the choice, the section's summary reads "Module file", not the
//        file control's label, and the status line under the control names
//        the file read; emptying the box and choosing the same file again
//        fills the box again
//   MF3: a link made while the chosen file is still being read comes from
//        the box's old text, and the fill that follows hides it
//   MF4: an edit to the "Module file" box after a file read clears the
//        status line that named the file
//   MF5: of two files chosen in turn, the later one fills the box and names
//        itself in the status, even when the earlier read ends last

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { useTarget, openBuilderSections, decodeLinkParam, FIXTURES } from './helpers.mjs';

const base = useTarget();
openBuilderSections();

const FIXTURE = path.join(FIXTURES, 'module-plain.json');

async function openBuilder(page) {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopsr');
  await page.locator('input[name="study"]').fill('module file');
}

async function makeLink(page) {
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toHaveText('');
  return page.locator('#out').textContent();
}

// MF1
test('a chosen module file builds the same link as its pasted text', async ({ page }) => {
  const text = await readFile(FIXTURE, 'utf8');

  await openBuilder(page);
  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await expect(page.locator('textarea[name="module"]')).toHaveValue(text);
  const chosen = await makeLink(page);

  await openBuilder(page);
  await page.locator('textarea[name="module"]').fill(text);
  const pasted = await makeLink(page);

  expect(chosen).toBe(pasted);
  expect(decodeLinkParam(chosen).module).toEqual(JSON.parse(text));
});

// MF2
test('the summary lists the module box, and the same file reads again', async ({ page }) => {
  const text = await readFile(FIXTURE, 'utf8');
  const state = page.locator('#secOrder .sec-state');

  await openBuilder(page);
  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await expect(page.locator('textarea[name="module"]')).toHaveValue(text);
  await expect(state).toHaveText('Module file');
  await expect(page.locator('#moduleFileStatus')).toHaveText('Read the module file module-plain.json.');

  await page.locator('textarea[name="module"]').fill('');
  await expect(state).toHaveText('Not used');
  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await expect(page.locator('textarea[name="module"]')).toHaveValue(text);
  await expect(state).toHaveText('Module file');
});

// MF3
test('a link made during the file read is hidden when the box fills', async ({ page }) => {
  const text = await readFile(FIXTURE, 'utf8');

  await openBuilder(page);
  // The read is held until the link is made. Blob.prototype.text is put
  // back at its first call, so nothing else the page reads waits on it.
  await page.evaluate(() => {
    const real = Blob.prototype.text;
    Blob.prototype.text = function () {
      Blob.prototype.text = real;
      return new Promise((resolve) => {
        window.releaseRead = () => resolve(real.call(this));
      });
    };
  });
  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await page.waitForFunction(() => typeof window.releaseRead === 'function');

  // The link made now carries no module: the box is still empty.
  const made = await makeLink(page);
  await expect(page.locator('#result')).toBeVisible();
  expect(decodeLinkParam(made).module).toBeUndefined();

  await page.evaluate(() => window.releaseRead());
  await expect(page.locator('textarea[name="module"]')).toHaveValue(text);
  await expect(page.locator('#result')).toBeHidden();
});

// MF4
test('an edit to the box clears the file status', async ({ page }) => {
  await openBuilder(page);
  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await expect(page.locator('#moduleFileStatus')).toHaveText('Read the module file module-plain.json.');

  await page.locator('textarea[name="module"]').press('End');
  await page.locator('textarea[name="module"]').press('Space');
  await expect(page.locator('#moduleFileStatus')).toHaveText('');
});

// MF5
test('the later of two chosen files wins when the earlier read ends last', async ({ page }) => {
  const later = path.join(FIXTURES, 'module-shuffled.json');
  const laterText = await readFile(later, 'utf8');

  await openBuilder(page);
  // The first read is held; the second runs at once. Blob.prototype.text is
  // put back at its first call, so only the first read waits.
  await page.evaluate(() => {
    const real = Blob.prototype.text;
    Blob.prototype.text = function () {
      Blob.prototype.text = real;
      return new Promise((resolve) => {
        window.releaseRead = () => resolve(real.call(this));
      });
    };
  });
  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await page.waitForFunction(() => typeof window.releaseRead === 'function');
  await page.locator('#moduleFile').setInputFiles(later);
  await expect(page.locator('textarea[name="module"]')).toHaveValue(laterText);

  await page.evaluate(() => window.releaseRead());
  // The held read's promise settles on the page's next turn; a round trip
  // later, a fill from it would be in the box.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));
  await expect(page.locator('textarea[name="module"]')).toHaveValue(laterText);
  await expect(page.locator('#moduleFileStatus')).toHaveText('Read the module file module-shuffled.json.');
});
