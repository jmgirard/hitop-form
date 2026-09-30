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
