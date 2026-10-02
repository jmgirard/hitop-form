// The Study Link Builder's "Where the setup is kept" choice, and a study
// link that names a setup file opened on the builder. The file is answered
// through a route; the fingerprint is computed here in Node.
//
//   LF1: the form holds a "Where the setup is kept" fieldset before "Make
//        the link", with "In the study link" chosen and "In a file I host";
//        the second shows "Download the setup file" and "Address of the
//        setup file", and the first hides them again
//   LF2: "Download the setup file" saves setup.json holding the form's
//        setup as JSON.stringify(config, null, 2) and a final newline; a
//        setup of exactly 100,000 bytes as saved is saved; a form "Make the
//        link" refuses is refused and nothing is saved; one byte over is
//        refused naming the size, and nothing is saved
//   LF3: with "In a file I host", "Make the link" refuses an empty address,
//        a relative and an http: address, and one with a user name and
//        password; it refuses, naming the address, a fetch that throws
//        (saying the host must let other sites read the file), a status
//        outside 200 to 299, a body over 100,000 bytes, bytes that are not
//        UTF-8, text that is not JSON, JSON that is not an object, and a
//        file that does not match the form; and a file not arrived after
//        30 seconds, the page's clock advanced
//   LF4: a downloaded file served back makes the link: the online form's
//        address with setup and sha256 written by URLSearchParams, plus
//        Prolific's ending when Prolific is chosen; an address holding "&"
//        is written so, and the online form opens the made link
//   LF5: link.html opened with setup and sha256 fills the form from a
//        matching file as a z link fills it, with "In a file I host" chosen
//        and the address filled and listed. The sections holding a filled
//        field are open, and the others closed
//   LF6: each fault in the shape of the opened link is refused in the
//        builder's refusal pattern, and nothing is fetched or filled
//   LF7: a file that changed since the link was made leaves the form empty
//        and offers "Fill in the form from the current file"; pressing it
//        fills the form, and the next link carries the file's current
//        fingerprint; making a link of the researcher's own hides the
//        offer, and a refused press leaves it; pressing it empties the
//        file controls' messages and drops a module file read still
//        running; a file nested too deeply to fingerprint is refused by
//        name, opened and at "Make the link" (JSON.stringify() made to
//        throw, since Chromium writes any file that fits)
//   LF8: an opened link whose fetch throws, is answered 404, or is over
//        100,000 bytes is refused in the builder's refusal pattern; one
//        whose file has not arrived after 30 seconds is refused at the
//        limit, and "Make the link" then works
//   LF9: a setup-file link counting 8,192 characters after its origin is
//        made, and one counting 8,193 is refused naming its length, with no
//        advice to host a file; with Prolific chosen, each placeholder
//        counts as 24 characters
//  LF10: while an opened link's setup file is fetched, typing in the study
//        box and pressing "Add an instrument" change nothing; once the
//        file arrives, the box holds the file's study name and takes
//        typed text
//  LF11: an opened link to a matching file whose module is an object
//        holding an array nested 20,000 deep is refused by name, with
//        nothing filled, the file not chosen and no uncaught error; the
//        test first checks that the browser throws on the module's
//        indented write
//
// LF7 also holds a throw in the offer's fill and a second throw in
// emptying the form, which still leave a message and an enabled "Make the
// link". Every refusal checked here holds none of the retired terms.

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  useTarget, openSectionOf, encodeConfig, encodeCompressed, setupFingerprint, serveSetup, setupQuery, retiredIn,
  SETUP_URL, COMPLETE_URL, SETUP_TIMEOUT_MS, armOnAddress, expectHeldInput, expectReleasedInput,
  deepModuleText, textFingerprint, DEEP_MODULE_REFUSAL, expectIndentThrows,
} from './helpers.mjs';

const base = useTarget();

const make = (page) => page.getByRole('button', { name: 'Make the link' });
const downloadButton = (page) => page.getByRole('button', { name: 'Download the setup file' });
const addressField = (page) => page.locator('input[name="setupAddress"]');
const err = (page) => page.locator('#err');

// The setup a plain form holds, filled by fillPlain().
const PLAIN = { instrument: 'hitopbr', study: 'hosted' };

async function fillPlain(page) {
  await page.locator('#instrumentList select').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('hosted');
}

async function openBuilder(page, query = '') {
  await page.goto(`${base()}link.html${query}`);
  await expect(make(page)).toBeEnabled();
}

async function chooseFile(page, address) {
  await page.getByLabel('In a file I host').check();
  if (address !== undefined) await addressField(page).fill(address);
}

// The bytes of the file "Download the setup file" saves.
async function download(page) {
  const saving = page.waitForEvent('download', { timeout: 15 * 1000 });
  await downloadButton(page).click();
  const d = await saving;
  return { name: d.suggestedFilename(), text: await readFile(await d.path(), 'utf8') };
}

// A refusal: its exact text, holding no retired term, with no link shown.
async function expectRefused(page, message) {
  await expect(err(page)).toHaveText(message);
  expect(retiredIn(await err(page).textContent()), 'retired terms in the refusal').toEqual([]);
  await expect(page.locator('#result')).toBeHidden();
}

const pretty = (config) => `${JSON.stringify(config, null, 2)}\n`;

// LF1
test('the setup choice sits before "Make the link", the link chosen, and the file choice shows its controls', async ({ page }) => {
  await openBuilder(page);
  const order = await page.evaluate(() => [...document.getElementById('f').children].map((n) => n.id || n.tagName));
  expect(order.indexOf('setupBlock'), 'the fieldset is in the form').toBeGreaterThan(-1);
  expect(order.indexOf('setupBlock')).toBeLessThan(order.indexOf('err'));
  await expect(page.locator('#setupBlock legend')).toHaveText('Where the setup is kept');
  await expect(page.getByLabel('In the study link', { exact: true })).toBeChecked();
  await expect(page.getByLabel('In a file I host')).not.toBeChecked();
  await expect(downloadButton(page)).toBeHidden();
  await expect(addressField(page)).toBeHidden();
  await chooseFile(page);
  await expect(downloadButton(page)).toBeVisible();
  await expect(page.getByLabel('Address of the setup file')).toBeVisible();
  await page.getByLabel('In the study link', { exact: true }).check();
  await expect(downloadButton(page)).toBeHidden();
});

// LF2
test('the download saves setup.json holding the form\'s setup, pretty-printed', async ({ page }) => {
  await openBuilder(page);
  await fillPlain(page);
  await openSectionOf(page, 'complete');
  await page.locator('input[name="complete"]').fill(COMPLETE_URL);
  await chooseFile(page);
  const file = await download(page);
  expect(file.name).toBe('setup.json');
  expect(file.text).toBe(pretty({ ...PLAIN, complete: COMPLETE_URL }));
});

test('a setup of exactly 100,000 bytes as saved is saved, and one byte more is refused naming the size', async ({ page }) => {
  await openBuilder(page);
  await fillPlain(page);
  await openSectionOf(page, 'consentText');
  // A consent text that makes the saved file exactly 100,000 bytes. To stay
  // under the 20,000 characters the text may hold, most of it is a control
  // character, which JSON writes as 6 bytes, and "a" makes up the rest.
  const room = 100_000 - Buffer.byteLength(pretty({ ...PLAIN, consent: { text: '' } }));
  const padded = '\u0001'.repeat(Math.floor(room / 6)) + 'a'.repeat(room % 6);
  expect(padded.length).toBeLessThanOrEqual(20_000);
  expect(Buffer.byteLength(pretty({ ...PLAIN, consent: { text: padded } }))).toBe(100_000);
  await page.locator('textarea[name="consentText"]').fill(padded);
  await expect(page.locator('textarea[name="consentText"]')).toHaveValue(padded);
  await chooseFile(page);
  const file = await download(page);
  expect(Buffer.byteLength(file.text)).toBe(100_000);
  expect(JSON.parse(file.text)).toEqual({ ...PLAIN, consent: { text: padded } });

  await page.locator('textarea[name="consentText"]').fill(`${padded}a`);
  let saved = false;
  page.on('download', () => { saved = true; });
  await downloadButton(page).click();
  await expectRefused(page, 'The setup file would be 100,001 bytes, more than the 100,000 bytes the online form reads. Shorten the consent text or the questions.');
  expect(saved, 'nothing was saved').toBe(false);
});

test('the download refuses a form "Make the link" refuses, and saves nothing', async ({ page }) => {
  await openBuilder(page);
  await chooseFile(page);
  let saved = false;
  page.on('download', () => { saved = true; });
  await downloadButton(page).click();
  await expectRefused(page, 'Give the study a name.');
  await expect(page.locator('input[name="study"]')).toBeFocused();
  expect(saved).toBe(false);
});

// LF3: the address.
const ADDRESS_FAULTS = [
  { name: 'an empty address', address: '', message: 'Give the address of the setup file, or choose "In the study link".' },
  { name: 'a relative address', address: 'setup.json', message: 'The address of the setup file could not be used: it is not a web address: "setup.json".' },
  { name: 'an http: address', address: 'http://setup.example.org/study/setup.json', message: 'The address of the setup file could not be used: it must start with https://, and it is "http://setup.example.org/study/setup.json".' },
  {
    name: 'an address with a user name and password',
    address: 'https://user:secret@setup.example.org/study/setup.json',
    message: 'The address of the setup file could not be used: it must not carry a user name or password, and it is "https://user:secret@setup.example.org/study/setup.json".',
  },
];

for (const fault of ADDRESS_FAULTS) {
  test(`"Make the link" refuses ${fault.name}, before any fetch`, async ({ page }) => {
    const requests = await serveSetup(page, JSON.stringify(PLAIN), { url: '**/setup.json' });
    await openBuilder(page);
    await fillPlain(page);
    await chooseFile(page, fault.address);
    await make(page).click();
    await expectRefused(page, fault.message);
    await expect(addressField(page)).toBeFocused();
    expect(requests).toEqual([]);
  });
}

// LF3: the fetched file.
const notObject = [1, 2];
const FILE_FAULTS = [
  {
    name: 'a fetch that throws',
    serve: { abort: true },
    message: `The setup file at ${SETUP_URL} could not be fetched. Check the address and the connection. The host must let other sites read the file, as GitHub does for a raw-file address.`,
  },
  { name: 'a status of 404', body: 'not found', serve: { status: 404 }, why: 'was answered with HTTP 404' },
  { name: 'a body of 100,001 bytes', body: `{"a":"${'x'.repeat(100_001 - 8)}"}`, why: 'is larger than 100,000 bytes' },
  { name: 'bytes that are not UTF-8', body: [0x7b, 0xff, 0xfe, 0x7d], why: 'is not UTF-8 text' },
  { name: 'text that is not JSON', body: '{instrument: hitopbr}', why: 'is not JSON' },
  { name: 'JSON that is not an object', body: JSON.stringify(notObject), why: 'does not hold a setup: its JSON is not an object' },
  {
    name: 'a file that does not match the form',
    body: pretty({ ...PLAIN, study: 'other' }),
    message: `The file at ${SETUP_URL} does not match this setup. Download the setup file again and replace the hosted copy.`,
  },
];

for (const fault of FILE_FAULTS) {
  test(`"Make the link" refuses ${fault.name}, naming the address`, async ({ page }) => {
    if (fault.body !== undefined && typeof fault.body === 'string' && fault.name.startsWith('a body')) {
      expect(Buffer.byteLength(fault.body)).toBe(100_001);
    }
    const requests = await serveSetup(page, fault.body ?? '', fault.serve);
    await openBuilder(page);
    await fillPlain(page);
    await chooseFile(page, SETUP_URL);
    await make(page).click();
    await expectRefused(page, fault.message ?? `The setup file at ${SETUP_URL} could not be used: it ${fault.why}.`);
    await expect(addressField(page)).toBeFocused();
    expect(requests.length, 'the file was asked for once').toBe(1);
  });
}

// LF4
test('a downloaded file served back makes a link of setup and sha256, which the online form opens', async ({ page }) => {
  await openBuilder(page);
  await fillPlain(page);
  await chooseFile(page);
  const file = await download(page);
  await serveSetup(page, file.text);
  await addressField(page).fill(SETUP_URL);
  await make(page).click();
  await expect(err(page)).toHaveText('');
  await expect(page.locator('#result')).toBeVisible();
  const href = await page.locator('#out').textContent();
  const sha256 = setupFingerprint(PLAIN);
  expect(href).toBe(`${base()}?${new URLSearchParams({ setup: SETUP_URL, sha256 })}`);
  await page.goto(href);
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
});

test('an address holding "&" is written by URLSearchParams, and Prolific\'s ending follows', async ({ page }) => {
  const address = 'https://setup.example.org/study/setup.json?a=1&b=2';
  // Matched by a function: a route's string pattern is a glob.
  await serveSetup(page, pretty({ ...PLAIN, prolific: true }), { url: (u) => u.href === address });
  await openBuilder(page);
  await fillPlain(page);
  await openSectionOf(page, 'site');
  await page.locator('select[name="site"]').selectOption('prolific');
  await chooseFile(page, address);
  await make(page).click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(err(page)).toHaveText('');
  const href = await page.locator('#out').textContent();
  const sha256 = setupFingerprint({ ...PLAIN, prolific: true });
  const suffix = '&PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}';
  expect(href).toBe(`${base()}?setup=${encodeURIComponent(address)}&sha256=${sha256}${suffix}`);
  expect(new URL(href).searchParams.get('setup')).toBe(address);
  await page.goto(href);
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
});

// LF5
// In the key order the builder writes, so a link made from the filled form
// matches the file: the fingerprint is taken over JSON.stringify(), which
// keeps the order.
const FILLED = {
  instrument: 'hitopbr',
  study: 'prefilled',
  complete: COMPLETE_URL,
  consent: { text: 'Please read this.' },
  store: { kind: 'webhook', url: 'https://hooks.example.org/rows' },
};

test('an opened setup-file link fills the form from a matching file, the file chosen and its address listed', async ({ page }) => {
  await serveSetup(page, pretty(FILLED));
  await openBuilder(page, `?${setupQuery({ sha256: setupFingerprint(FILLED) })}`);
  await expect(err(page)).toHaveText('');
  await expect(page.locator('input[name="study"]')).toHaveValue('prefilled');
  await expect(page.locator('textarea[name="consentText"]')).toHaveValue('Please read this.');
  await expect(page.locator('input[name="store"]')).toHaveValue('https://hooks.example.org/rows');
  await expect(page.getByLabel('In a file I host')).toBeChecked();
  await expect(addressField(page)).toHaveValue(SETUP_URL);
  await expect(page.locator('#prefilledList li')).toHaveText([
    `Completion URL: ${COMPLETE_URL}`,
    'Web address: https://hooks.example.org/rows',
    `Address of the setup file: ${SETUP_URL}`,
  ]);
  await expect(page.locator('#prefilled')).toBeFocused();
  await expect(page.locator('#setupChanged')).toBeHidden();
  // The file sets a completion URL and consent text, so their two sections
  // open and the other three stay closed.
  for (const [id, open] of [['secParticipants', false], ['secOrder', false], ['secConsent', true], ['secFinish', true], ['secQuestions', false]]) {
    await expect(page.locator(`#${id}`), `${id} open`).toHaveJSProperty('open', open);
  }
});

// LF6
const refusal = (what) => `The study link you opened ${what} Fill in the form above to make a new link.`;
const SHA = setupFingerprint(FILLED);
const LINK_FAULTS = [
  { name: 'setup beside c', query: `c=${encodeConfig(FILLED)}&${setupQuery({ sha256: SHA })}`, what: 'names a setup file and also holds a setup of its own, and a study link does one or the other.' },
  { name: 'setup beside z', query: `${setupQuery({ sha256: SHA })}&z=${encodeCompressed(FILLED)}`, what: 'names a setup file and also holds a setup of its own, and a study link does one or the other.' },
  { name: 'setup without sha256', query: setupQuery({ sha256: null }), what: 'names a setup file and gives no fingerprint for it (sha256).' },
  { name: 'sha256 without setup', query: setupQuery({ setup: null, sha256: SHA }), what: 'gives a fingerprint (sha256) and names no setup file (setup).' },
  {
    name: 'a sha256 of 42 characters',
    query: setupQuery({ sha256: SHA.slice(0, 42) }),
    what: `holds a sha256 field that could not be used: it must be 43 characters of A-Z, a-z, 0-9, "-" and "_", and it is ${JSON.stringify(SHA.slice(0, 42))}.`,
  },
  {
    name: 'a sha256 holding a character outside base64url',
    query: setupQuery({ sha256: `${SHA.slice(0, 42)}=` }),
    what: `holds a sha256 field that could not be used: it must be 43 characters of A-Z, a-z, 0-9, "-" and "_", and it is ${JSON.stringify(`${SHA.slice(0, 42)}=`)}.`,
  },
  { name: 'a relative setup', query: setupQuery({ setup: 'setup.json', sha256: SHA }), what: 'holds a setup field that could not be used: it is not a web address: "setup.json".' },
  { name: 'an http: setup', query: setupQuery({ setup: 'http://setup.example.org/study/setup.json', sha256: SHA }), what: 'holds a setup field that could not be used: it must start with https://, and it is "http://setup.example.org/study/setup.json".' },
  {
    name: 'a setup with a user name and password',
    query: setupQuery({ setup: 'https://user:secret@setup.example.org/study/setup.json', sha256: SHA }),
    what: 'holds a setup field that could not be used: it must not carry a user name or password, and it is "https://user:secret@setup.example.org/study/setup.json".',
  },
];

for (const fault of LINK_FAULTS) {
  test(`an opened link with ${fault.name} is refused, and nothing is fetched or filled`, async ({ page }) => {
    const requests = await serveSetup(page, pretty(FILLED), { url: '**/setup.json' });
    await openBuilder(page, `?${fault.query}`);
    await expectRefused(page, refusal(fault.what));
    await expect(err(page)).toBeFocused();
    await expect(page.locator('input[name="study"]')).toHaveValue('');
    await expect(page.getByLabel('In the study link', { exact: true })).toBeChecked();
    expect(requests).toEqual([]);
  });
}

// LF7
test('a changed file is offered, and pressing the offer fills the form for a new link', async ({ page }) => {
  const now = { ...FILLED, study: 'edited' };
  await serveSetup(page, pretty(now));
  await openBuilder(page, `?${setupQuery({ sha256: SHA })}`);
  const offer = page.locator('#setupChanged');
  await expect(offer).toBeVisible();
  await expect(offer).toBeFocused();
  await expect(offer.locator('p').first()).toHaveText(`The setup file at ${SETUP_URL} changed after the study link you opened was made, so that link no longer opens the online form. Fill in the form from the file as it is now, then make a new link.`);
  expect(retiredIn(await offer.textContent())).toEqual([]);
  await expect(err(page)).toHaveText('');
  await expect(page.locator('input[name="study"]')).toHaveValue('');
  await expect(page.locator('#prefilled')).toBeHidden();

  await offer.getByRole('button', { name: 'Fill in the form from the current file' }).click();
  await expect(offer).toBeHidden();
  await expect(page.locator('input[name="study"]')).toHaveValue('edited');
  await expect(page.getByLabel('In a file I host')).toBeChecked();
  await expect(addressField(page)).toHaveValue(SETUP_URL);
  await expect(page.locator('#prefilledList li').last()).toHaveText(`Address of the setup file: ${SETUP_URL}`);
  await expect(page.locator('#prefilled')).toBeFocused();

  await make(page).click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(err(page)).toHaveText('');
  const href = await page.locator('#out').textContent();
  expect(new URL(href).searchParams.get('sha256')).toBe(setupFingerprint(now));
});

// LF7: the offer goes once the researcher makes a link of their own, so a
// later press cannot overwrite the form they filled.
test('making a link hides the offer to fill the form from a changed file', async ({ page }) => {
  await serveSetup(page, pretty({ ...FILLED, study: 'edited' }));
  await openBuilder(page, `?${setupQuery({ sha256: SHA })}`);
  const offer = page.locator('#setupChanged');
  await expect(offer).toBeVisible();
  await fillPlain(page);
  await make(page).click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(offer).toBeHidden();
  await expect(offer.getByRole('button', { name: 'Fill in the form from the current file' })).toHaveCount(0);
  await expect(page.locator('input[name="study"]')).toHaveValue('hosted');
});

// LF7: a press that is refused makes no link, so the offer stays and can
// still be pressed.
test('a refused "Make the link" leaves the offer to fill the form from a changed file', async ({ page }) => {
  await serveSetup(page, pretty({ ...FILLED, study: 'edited' }));
  await openBuilder(page, `?${setupQuery({ sha256: SHA })}`);
  const offer = page.locator('#setupChanged');
  await expect(offer).toBeVisible();
  await fillPlain(page);
  await chooseFile(page);
  await make(page).click();
  await expectRefused(page, 'Give the address of the setup file, or choose "In the study link".');
  await expect(offer).toBeVisible();
  await offer.getByRole('button', { name: 'Fill in the form from the current file' }).click();
  await expect(page.locator('input[name="study"]')).toHaveValue('edited');
});

// LF7: the offer's press replaces every field, so what the file controls
// said goes, and a module file read that ends after the press drops its
// text. The read is held open by File.prototype.text() until the test
// lets it go.
test('pressing the offer empties the file controls\' messages and drops a module file read still running', async ({ page }) => {
  await page.addInitScript(() => {
    const real = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== 'late.json') return real.call(this);
      return new Promise((resolve) => { window.releaseRead = () => resolve('{"late": true}'); });
    };
  });
  await serveSetup(page, pretty({ ...FILLED, study: 'edited' }));
  await openBuilder(page, `?${setupQuery({ sha256: SHA })}`);
  const offer = page.locator('#setupChanged');
  await expect(offer).toBeVisible();
  // The changed file leaves the form empty, so its sections stay closed.
  await openSectionOf(page, '#questionsFile', { wasOpen: false });
  await page.locator('#questionsFile').setInputFiles({
    name: 'q.csv', mimeType: 'text/csv',
    buffer: Buffer.from('list,name,text,type,options,required,min,max\nbefore,ok,Fine,text,,,,\n'),
  });
  await expect(page.locator('#questionsStatus')).toHaveText('Loaded 1 question from q.csv.');
  const row = page.locator('.instrument-row').first();
  await row.locator('select[name="instrument"]').selectOption('hitopsr-module');
  await row.locator('input.module-file').setInputFiles({ name: 'late.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await page.waitForFunction(() => typeof window.releaseRead === 'function');
  await offer.getByRole('button', { name: 'Fill in the form from the current file' }).click();
  await expect(page.locator('input[name="study"]')).toHaveValue('edited');
  await expect(page.locator('#questionsStatus')).toHaveText('');
  // A link made from the filled form while the read is still held. A read
  // that went on to fill its old row would count as a change and hide it.
  await make(page).click();
  await expect(page.locator('#result')).toBeVisible();
  // The read's own continuation runs once the promise settles, within the
  // next task, so one task later it has dropped its text or written it.
  await page.evaluate(() => { window.releaseRead(); return new Promise((r) => setTimeout(r, 50)); });
  // The offer's press made the rows again, so the read's row has left the
  // list and the row now first holds nothing from the read.
  await expect(page.locator('.instrument-row .module-status')).toHaveText('');
  await expect(page.locator('.instrument-row textarea[name="module"]')).toHaveValue('');
  await expect(page.locator('#result')).toBeVisible();
});

// LF7: a throw in the offer's fill, then a second throw in emptying the
// form, still leaves a message. fillFromCurrent() and resetForm() each start
// with f.reset(), and the plant throws at every call once armed
// (armOnAddress()). The load calls no f.reset().
test('a throw in the offer\'s fill and in emptying the form still leaves a message and an enabled button', async ({ page }) => {
  await page.addInitScript(armOnAddress);
  await page.addInitScript(() => {
    const reset = HTMLFormElement.prototype.reset;
    window.resets = 0;
    HTMLFormElement.prototype.reset = function () {
      if (window.armed) {
        window.resets += 1;
        throw new Error('planted reset throw');
      }
      return reset.call(this);
    };
  });
  await serveSetup(page, pretty({ ...FILLED, study: 'edited' }));
  await openBuilder(page, `?${setupQuery({ sha256: SHA })}`);
  const offer = page.locator('#setupChanged');
  await expect(offer).toBeVisible();
  expect(await page.evaluate(() => window.resets)).toBe(0);
  await offer.getByRole('button', { name: 'Fill in the form from the current file' }).click();
  await expect(err(page)).toHaveText(refusal('could not be read.'));
  expect(await page.evaluate(() => window.resets)).toBe(2);
  await expect(make(page)).toBeEnabled();
});

// A setup file this browser cannot write back out as JSON, such as one
// nested deeper than its JSON.stringify() goes. Chromium writes the
// deepest file that fits in 100,000 bytes, so JSON.stringify() is made to
// throw RangeError for a file holding the key "tooDeep", as such a browser's
// does.
async function stringifyFailsOnTooDeep(page) {
  await page.addInitScript(() => {
    const real = JSON.stringify;
    JSON.stringify = function (value, ...rest) {
      if (value !== null && typeof value === 'object' && Object.hasOwn(value, 'tooDeep')) {
        throw new RangeError('Maximum call stack size exceeded');
      }
      return real.call(this, value, ...rest);
    };
  });
}

test('an opened link whose file is nested too deeply to fingerprint is refused, naming the fault', async ({ page }) => {
  await stringifyFailsOnTooDeep(page);
  await serveSetup(page, JSON.stringify({ ...FILLED, tooDeep: [[[]]] }));
  await openBuilder(page, `?${setupQuery({ sha256: SHA })}`);
  await expectRefused(page, refusal(`names the setup file ${SETUP_URL}, which is nested too deeply for this browser to read.`));
  await expect(page.locator('input[name="study"]')).toHaveValue('');
});

test('"Make the link" refuses a file nested too deeply to fingerprint, naming the fault', async ({ page }) => {
  await stringifyFailsOnTooDeep(page);
  await serveSetup(page, JSON.stringify({ ...PLAIN, tooDeep: [[[]]] }));
  await openBuilder(page);
  await fillPlain(page);
  await chooseFile(page, SETUP_URL);
  await make(page).click();
  await expectRefused(page, `The setup file at ${SETUP_URL} could not be used: it is nested too deeply for this browser to read.`);
  await expect(addressField(page)).toBeFocused();
});

// LF8
const FETCH_FAULTS = [
  {
    name: 'a fetch that throws',
    serve: { abort: true },
    why: 'could not be fetched. The host must let other sites read the file, as GitHub does for a raw-file address',
  },
  { name: 'a status of 404', body: 'not found', serve: { status: 404 }, why: 'was answered with HTTP 404' },
  { name: 'a body of 100,001 bytes', body: `{"a":"${'x'.repeat(100_001 - 8)}"}`, why: 'is larger than 100,000 bytes' },
];

// The page's clock is installed before the page loads and paused once the
// request is made, as in setupfile.spec.js. Before the limit "Make the
// link" stays disabled; past it the link is refused and the builder can be
// used.
test('an opened link whose file has not arrived after 30 seconds is refused, and the builder works', async ({ page }) => {
  await page.clock.install();
  const requests = await serveSetup(page, '', { hang: true });
  await page.goto(`${base()}link.html?${setupQuery({ sha256: SHA })}`);
  await expect.poll(() => requests.length).toBe(1);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.clock.fastForward(SETUP_TIMEOUT_MS - 2000);
  await expect(make(page)).toBeDisabled();
  await page.clock.fastForward(2000);
  await expectRefused(page, refusal(`names the setup file ${SETUP_URL}, which did not arrive within 30 seconds.`));
  await expect(make(page)).toBeEnabled();
  await fillPlain(page);
  await make(page).click();
  await expect(page.locator('#result')).toBeVisible();
});

// "Make the link" against a host that never answers: refused past the
// limit, naming the address.
test('"Make the link" refuses a file that has not arrived after 30 seconds', async ({ page }) => {
  await page.clock.install();
  const requests = await serveSetup(page, '', { hang: true });
  await openBuilder(page);
  await fillPlain(page);
  await chooseFile(page, SETUP_URL);
  await make(page).click();
  await expect.poll(() => requests.length).toBe(1);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.clock.fastForward(SETUP_TIMEOUT_MS - 2000);
  await expect(err(page)).toHaveText('');
  await page.clock.fastForward(2000);
  await expectRefused(page, `The setup file at ${SETUP_URL} could not be used: it did not arrive within 30 seconds.`);
  await expect(addressField(page)).toBeFocused();
});

for (const fault of FETCH_FAULTS) {
  test(`an opened link whose file has ${fault.name} is refused`, async ({ page }) => {
    await serveSetup(page, fault.body ?? '', fault.serve);
    await openBuilder(page, `?${setupQuery({ sha256: SHA })}`);
    await expectRefused(page, refusal(`names the setup file ${SETUP_URL}, which ${fault.why}.`));
    await expect(page.locator('input[name="study"]')).toHaveValue('');
    await expect(page.locator('#setupChanged')).toBeHidden();
  });
}

// LF9: the count is made apart from the builder, as in link.spec.js L38: the
// link after its origin, each Prolific placeholder as 24 characters. The
// address's path sets the length one character at a time.
const hostCount = (href) => href.slice(new URL(href).origin.length).replace(/\{\{%[A-Z_]+%\}\}/g, 'x'.repeat(24)).length;
const longAddress = (k) => `https://setup.example.org/${'a'.repeat(k)}.json`;

for (const prolific of [false, true]) {
  test(`a setup-file link${prolific ? ' for Prolific' : ''} counting 8,192 characters is made, and one counting 8,193 is refused naming its length`, async ({ page }) => {
    await serveSetup(page, pretty(prolific ? { ...PLAIN, prolific: true } : PLAIN), { url: (u) => u.hostname === 'setup.example.org' });
    await openBuilder(page);
    await fillPlain(page);
    if (prolific) {
      await openSectionOf(page, 'site');
      await page.locator('select[name="site"]').selectOption('prolific');
    }
    await chooseFile(page, longAddress(1));
    await make(page).click();
    await expect(page.locator('#result')).toBeVisible();
    const first = await page.locator('#out').textContent();

    const k = 1 + 8_192 - hostCount(first);
    await addressField(page).fill(longAddress(k));
    await make(page).click();
    await expect(page.locator('#result')).toBeVisible();
    await expect(err(page)).toHaveText('');
    expect(hostCount(await page.locator('#out').textContent())).toBe(8_192);

    await addressField(page).fill(longAddress(k + 1));
    await make(page).click();
    await expectRefused(page, `This link is ${(first.length + k).toLocaleString('en-US')} characters long, longer than the online form's host accepts.`);
    await expect(page.locator('#out')).toHaveText('');
  });
}

// LF10: the file's answer is held until the test releases it.
test('LF10: while the setup file is fetched, typing and "Add an instrument" change nothing', async ({ page }) => {
  let release;
  const released = new Promise((r) => { release = r; });
  let requested;
  const seen = new Promise((r) => { requested = r; });
  await page.route(SETUP_URL, async (route) => {
    requested();
    await released;
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'text/plain; charset=utf-8' },
      body: pretty(FILLED),
    });
  });
  await page.goto(`${base()}link.html?${setupQuery({ sha256: SHA })}`, { waitUntil: 'commit' });
  await seen;
  await expectHeldInput(page);
  release();
  await expectReleasedInput(page, 'prefilled');
});

// LF11: a matching setup file whose module is nested too deeply for the
// module box is refused by name, with nothing filled, the file not chosen,
// and no uncaught error.
test('LF11: an opened setup-file link whose module is nested too deeply to show is refused by name', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const text = deepModuleText();
  await serveSetup(page, text);
  await openBuilder(page, `?${setupQuery({ sha256: textFingerprint(text) })}`);
  await expectIndentThrows(page);
  await expectRefused(page, DEEP_MODULE_REFUSAL);
  await expect(page.locator('input[name="study"]')).toHaveValue('');
  await expect(page.getByLabel('In the study link', { exact: true })).toBeChecked();
  await expect(page.locator('#setupChanged')).toBeHidden();
  expect(errors).toEqual([]);
});
