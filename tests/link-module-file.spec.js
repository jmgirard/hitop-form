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
//   MF6: an edit typed into the box while a file is read wins: when the
//        read ends, the box keeps the typed text and no status names the
//        file. A read that fails shows "The module file could not be
//        read." under the control
//   MF7: a chosen instrument export is refused with a message that holds
//        no "Paste" and names the Module Builder and write_module()

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { useTarget, openBuilderSections, decodeLinkParam, fetchExport, FIXTURES } from './helpers.mjs';

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
        // Returns the real read, so the release below can wait for it.
        window.releaseRead = () => { const read = real.call(this); resolve(read); return read; };
      });
    };
  });
  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await page.waitForFunction(() => typeof window.releaseRead === 'function');
  await page.locator('#moduleFile').setInputFiles(later);
  await expect(page.locator('textarea[name="module"]')).toHaveValue(laterText);

  // The release waits for the held read to end, then for one task, which
  // lets the change handler run past its await: any fill from the earlier
  // file is in the box before the reads below.
  await page.evaluate(async () => {
    await window.releaseRead();
    await new Promise((r) => setTimeout(r, 0));
  });
  await expect(page.locator('textarea[name="module"]')).toHaveValue(laterText);
  await expect(page.locator('#moduleFileStatus')).toHaveText('Read the module file module-shuffled.json.');
});

// MF6
test('an edit typed during a file read wins, and a failed read says so', async ({ page }) => {
  // The first read is held until releaseRead(), which returns the real
  // read so the release can wait for it. The second read rejects. Any later
  // read is real.
  await page.addInitScript(() => {
    const real = Blob.prototype.text;
    let calls = 0;
    File.prototype.text = function () {
      calls += 1;
      if (calls === 1) {
        return new Promise((resolve) => {
          window.releaseRead = () => { const read = real.call(this); resolve(read); return read; };
        });
      }
      if (calls === 2) return Promise.reject(new DOMException('planted read failure', 'NotReadableError'));
      return real.call(this);
    };
  });
  await openBuilder(page);
  const box = page.locator('textarea[name="module"]');

  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await page.waitForFunction(() => typeof window.releaseRead === 'function');
  await box.pressSequentially('typed');
  // As in MF5, the release waits for the read and then one task, so any
  // fill from the file is in the box before the reads below.
  await page.evaluate(async () => {
    await window.releaseRead();
    await new Promise((r) => setTimeout(r, 0));
  });
  await expect(box).toHaveValue('typed');
  await expect(page.locator('#moduleFileStatus')).toHaveText('');

  await page.locator('#moduleFile').setInputFiles(FIXTURE);
  await expect(page.locator('#moduleFileErr')).toHaveText('The module file could not be read.');
  await expect(box).toHaveValue('typed');
});

// MF7
test('a chosen instrument export is refused, naming the files to use', async ({ page }) => {
  const exp = await fetchExport('hitopsr');
  await openBuilder(page);
  await page.locator('#moduleFile').setInputFiles({
    name: 'hitopsr.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exp), 'utf8'),
  });
  await expect(page.locator('#moduleFileStatus')).toHaveText('Read the module file hitopsr.json.');
  await page.getByRole('button', { name: 'Make the link' }).click();
  const err = page.locator('#err');
  await expect(err).toHaveText('The module file could not be used: it is the instrument export, not a module file. Use the file that the Module Builder or write_module() saved.');
  const message = await err.textContent();
  expect(message).not.toContain('Paste');
  expect(message).toContain('Module Builder');
  expect(message).toContain('write_module()');
  await expect(page.locator('#out')).toHaveText('');
});
