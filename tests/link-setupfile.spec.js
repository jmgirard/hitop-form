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
//        file that does not match the form
//   LF4: a downloaded file served back makes the link: the online form's
//        address with setup and sha256 written by URLSearchParams, plus
//        Prolific's ending when Prolific is chosen; an address holding "&"
//        is written so, and the online form opens the made link
//   LF5: link.html opened with setup and sha256 fills the form from a
//        matching file as a z link fills it, with "In a file I host" chosen
//        and the address filled and listed
//   LF6: each fault in the shape of the opened link is refused in the
//        builder's refusal pattern, and nothing is fetched or filled
//   LF7: a file that changed since the link was made leaves the form empty
//        and offers "Fill in the form from the current file"; pressing it
//        fills the form, and the next link carries the file's current
//        fingerprint
//   LF8: an opened link whose fetch throws, is answered 404, or is over
//        100,000 bytes is refused in the builder's refusal pattern
//
// Every refusal checked here holds none of the retired terms.

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  useTarget, openSectionOf, encodeConfig, encodeCompressed, setupFingerprint, serveSetup, setupQuery, retiredIn,
  SETUP_URL, COMPLETE_URL,
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

// LF8
const FETCH_FAULTS = [
  { name: 'a fetch that throws', serve: { abort: true }, why: 'could not be fetched' },
  { name: 'a status of 404', body: 'not found', serve: { status: 404 }, why: 'was answered with HTTP 404' },
  { name: 'a body of 100,001 bytes', body: `{"a":"${'x'.repeat(100_001 - 8)}"}`, why: 'is larger than 100,000 bytes' },
];

for (const fault of FETCH_FAULTS) {
  test(`an opened link whose file has ${fault.name} is refused`, async ({ page }) => {
    await serveSetup(page, fault.body ?? '', fault.serve);
    await openBuilder(page, `?${setupQuery({ sha256: SHA })}`);
    await expectRefused(page, refusal(`names the setup file ${SETUP_URL}, which ${fault.why}.`));
    await expect(page.locator('input[name="study"]')).toHaveValue('');
    await expect(page.locator('#setupChanged')).toBeHidden();
  });
}
