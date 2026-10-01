// A link that names a setup file: `setup`, the https:// address of a JSON
// file holding the setup, and `sha256`, its fingerprint. The file is
// answered through a route, and the fingerprint is computed here in Node
// (helpers.mjs setupFingerprint()), not by the page.
//
//   SF1: a link naming a setup file that holds consent text and questions
//        runs the form from it, to a saved file; the file is served
//        pretty-printed with CRLF line endings, so its bytes differ from
//        the JSON the fingerprint is taken over; a file of exactly
//        100,000 bytes is read
//   SF2: a setup file whose fingerprint matches and whose instrument the
//        page does not know is refused with the message the same setup
//        gets as a c link
//   SF3: each fault in a setup-file link is refused by name in "Details for
//        the study team", and no form starts: setup beside c, setup beside
//        z, setup without sha256, sha256 without setup, a sha256 that is
//        not 43 base64url characters, a setup that is not an absolute
//        https: address (relative, and http:), a setup holding a user name
//        and password, a fetch that throws (kind connection), a status
//        outside 200 to 299, a body over 100,000 bytes, bytes that are not
//        UTF-8, text that is not JSON, JSON that is not an object, a
//        fingerprint that differs, and a browser without crypto.subtle
//        (kind browser)
//   SF4: participantParam "setup" and "sha256" are refused as "c" is

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  useTarget, refusalText, begin, walkAll, awaitDownload, parseCsv, encodeConfig, encodeCompressed,
  setupFingerprint, serveSetup, setupQuery, SETUP_URL,
} from './helpers.mjs';

const base = useTarget();

const SETUP = {
  instrument: 'pid5bf',
  study: 'setupfile',
  participant: 'sf1',
  consent: { text: 'Please read this before you begin.' },
  questions: { before: [{ name: 'age', text: 'Your age', type: 'number' }] },
};

// The participant's sentence on an error screen, by kind, as form.js
// states it.
const CONTACT = 'Please contact the study team, and show them the details below.';
const CONNECTION = 'Please check your internet connection, then reload this page.';
const BROWSER = 'Please open the study link in another browser, such as a current version of Chrome, Edge, Firefox or Safari.';

async function expectRefused(page, message, sentence = CONTACT) {
  await expect(page.locator('h1')).toHaveText('This form cannot be shown');
  await expect(page.locator('p[role=alert]')).toHaveText(sentence);
  await expect(refusalText(page)).toHaveText(message);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'I agree' })).toHaveCount(0);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
}

const fileFault = (why) => `The setup file at ${SETUP_URL} could not be used: it ${why}.`;

// SF1
test('a link naming a setup file with consent and questions runs the form to a saved file', async ({ page }) => {
  const body = `${JSON.stringify(SETUP, null, 2).replace(/\n/g, '\r\n')}\r\n`;
  expect(body, 'the served bytes differ from the fingerprinted JSON').not.toBe(JSON.stringify(SETUP));
  const requests = await serveSetup(page, body);
  // The options the page passes to fetch() for the setup file, recorded
  // before the page's own script runs.
  await page.addInitScript((host) => {
    window.__setupInits = [];
    const original = window.fetch;
    window.fetch = function (input, init) {
      if (String(input).includes(host)) {
        window.__setupInits.push({ cache: init?.cache, credentials: init?.credentials, referrerPolicy: init?.referrerPolicy });
      }
      return original.apply(this, arguments);
    };
  }, new URL(SETUP_URL).host);
  await page.goto(`${base()}?${setupQuery({ sha256: setupFingerprint(SETUP) })}`);
  await expect(page.locator('h1')).toHaveText('Consent to take part');
  expect(await page.evaluate(() => window.__setupInits), 'the fetch options').toEqual([
    { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' },
  ]);
  expect(requests[0].headers.referer, 'no referrer was sent').toBeUndefined();
  await expect(page.locator('main')).toContainText('Please read this before you begin.');
  await page.getByRole('button', { name: 'I agree' }).click();
  await expect(page.locator('h1')).toHaveText('Before you begin');
  await page.locator('.question[data-name=age] input').fill('30');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  const download = awaitDownload(page);
  await begin(page);
  await walkAll(page);
  const d = await download;
  const [header, row] = parseCsv(await readFile(await d.path(), 'utf8'));
  expect(header.at(-1), 'the question column').toBe('q_age');
  expect(row.at(-1)).toBe('30');
  expect(row[header.indexOf('study')]).toBe('setupfile');
  expect(row[header.indexOf('participant')]).toBe('sf1');
  expect(requests, 'the setup file was asked for once, with GET').toEqual([{ method: 'GET', url: SETUP_URL }]);
});

// A setup padded with spaces inside its last brace to exactly `n` bytes.
function paddedBody(setup, n) {
  const json = JSON.stringify(setup);
  return `${json.slice(0, -1)}${' '.repeat(n - json.length)}}`;
}

test('a setup file of exactly 100,000 bytes is read', async ({ page }) => {
  const setup = { instrument: 'pid5bf', study: 'setupfile', participant: 'sf1' };
  const body = paddedBody(setup, 100_000);
  expect(Buffer.byteLength(body)).toBe(100_000);
  await serveSetup(page, body);
  await page.goto(`${base()}?${setupQuery({ sha256: setupFingerprint(setup) })}`);
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
});

// SF2
test('a setup file naming an unknown instrument is refused as its c link is', async ({ page }) => {
  const setup = { instrument: 'nope', study: 'setupfile' };
  const message = 'The study link names an instrument this page does not know: "nope".';
  await page.goto(`${base()}?c=${encodeConfig(setup)}`);
  await expectRefused(page, message);
  await serveSetup(page, JSON.stringify(setup));
  await page.goto(`${base()}?${setupQuery({ sha256: setupFingerprint(setup) })}`);
  await expectRefused(page, message);
});

// SF3: faults in the link itself, refused before any fetch.
const SHA = setupFingerprint(SETUP);
const LINK_FAULTS = [
  {
    name: 'setup beside c',
    query: `c=${encodeConfig(SETUP)}&${setupQuery({ sha256: SHA })}`,
    message: 'The study link names a setup file and also holds a setup of its own, and a study link does one or the other. Ask the study team for a new link.',
  },
  {
    name: 'setup beside z',
    query: `${setupQuery({ sha256: SHA })}&z=${encodeCompressed(SETUP)}`,
    message: 'The study link names a setup file and also holds a setup of its own, and a study link does one or the other. Ask the study team for a new link.',
  },
  {
    name: 'setup without sha256',
    query: setupQuery({ sha256: null }),
    message: 'The study link names a setup file and gives no fingerprint for it (sha256), and the online form needs both. Ask the study team for a new link.',
  },
  {
    name: 'sha256 without setup',
    query: setupQuery({ setup: null, sha256: SHA }),
    message: 'The study link gives a fingerprint (sha256) and names no setup file (setup), and the online form needs both. Ask the study team for a new link.',
  },
  {
    name: 'a sha256 of 42 characters',
    query: setupQuery({ sha256: SHA.slice(0, 42) }),
    message: `The study link's sha256 field could not be used: it must be 43 characters of A-Z, a-z, 0-9, "-" and "_", and it is ${JSON.stringify(SHA.slice(0, 42))}.`,
  },
  {
    name: 'a sha256 holding a character outside base64url',
    query: setupQuery({ sha256: `${SHA.slice(0, 42)}=` }),
    message: `The study link's sha256 field could not be used: it must be 43 characters of A-Z, a-z, 0-9, "-" and "_", and it is ${JSON.stringify(`${SHA.slice(0, 42)}=`)}.`,
  },
  {
    name: 'a relative setup address',
    query: setupQuery({ setup: 'setup.json', sha256: SHA }),
    message: 'The study link\'s setup field could not be used: it is not a web address: "setup.json".',
  },
  {
    name: 'an http: setup address',
    query: setupQuery({ setup: 'http://setup.example.org/study/setup.json', sha256: SHA }),
    message: 'The study link\'s setup field could not be used: it must start with https://, and it is "http://setup.example.org/study/setup.json".',
  },
  {
    name: 'a setup address holding a user name and password',
    query: setupQuery({ setup: 'https://user:secret@setup.example.org/study/setup.json', sha256: SHA }),
    message: 'The study link\'s setup field could not be used: it must not carry a user name or password, and it is "https://user:secret@setup.example.org/study/setup.json".',
  },
];

for (const fault of LINK_FAULTS) {
  test(`a link with ${fault.name} is refused, naming the fault`, async ({ page }) => {
    const requests = await serveSetup(page, JSON.stringify(SETUP), { url: '**/setup.json' });
    await page.goto(`${base()}?${fault.query}`);
    await expectRefused(page, fault.message);
    expect(requests, 'no setup file was fetched').toEqual([]);
  });
}

// SF3: faults in the fetched file.
const notObject = [1, 2];
const FILE_FAULTS = [
  { name: 'a fetch that throws', serve: { abort: true }, why: 'could not be fetched', sentence: CONNECTION },
  { name: 'a status of 404', body: 'not found', serve: { status: 404 }, why: 'was answered with HTTP 404' },
  { name: 'a status of 500', body: '{}', serve: { status: 500 }, why: 'was answered with HTTP 500' },
  { name: 'a body of 100,001 bytes', body: paddedBody(SETUP, 100_001), sha: SHA, why: 'is larger than 100,000 bytes' },
  { name: 'bytes that are not UTF-8', body: [0x7b, 0xff, 0xfe, 0x7d], why: 'is not UTF-8 text' },
  { name: 'text that is not JSON', body: '{instrument: pid5bf}', why: 'is not JSON' },
  { name: 'JSON that is not an object', body: JSON.stringify(notObject), sha: setupFingerprint(notObject), why: 'does not hold a setup: its JSON is not an object' },
];

for (const fault of FILE_FAULTS) {
  test(`a setup file with ${fault.name} is refused, naming the fault`, async ({ page }) => {
    const requests = await serveSetup(page, fault.body ?? '', fault.serve);
    await page.goto(`${base()}?${setupQuery({ sha256: fault.sha ?? SHA })}`);
    await expectRefused(page, fileFault(fault.why), fault.sentence);
    expect(requests.length, 'the file was asked for once').toBe(1);
  });
}

test('a setup file whose fingerprint differs from sha256 is refused, naming both', async ({ page }) => {
  const edited = { ...SETUP, study: 'edited' };
  await serveSetup(page, JSON.stringify(edited));
  await page.goto(`${base()}?${setupQuery({ sha256: SHA })}`);
  await expectRefused(
    page,
    `The setup file at ${SETUP_URL} does not match the study link: its fingerprint is ${setupFingerprint(edited)}, and the link gives ${SHA}. The file changed after the link was made. Ask the study team for a new link.`,
  );
});

test('without crypto.subtle, a setup-file link is refused naming the browser, before any fetch', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, 'subtle', { get: () => undefined, configurable: true });
  });
  const requests = await serveSetup(page, JSON.stringify(SETUP));
  await page.goto(`${base()}?${setupQuery({ sha256: SHA })}`);
  await expectRefused(
    page,
    'This browser cannot check the study link\'s setup file, because it cannot compute a fingerprint. Open the link in a current version of Chrome, Edge, Firefox or Safari.',
    BROWSER,
  );
  expect(await page.evaluate(() => crypto.subtle)).toBeUndefined();
  expect(requests).toEqual([]);
});

// SF4
for (const [name, why] of [
  ['setup', 'it is "setup", the parameter that names the study link\'s setup file.'],
  ['sha256', 'it is "sha256", the parameter that holds the fingerprint of the study link\'s setup file.'],
]) {
  test(`participantParam "${name}" is refused, naming the parameter`, async ({ page }) => {
    await page.goto(`${base()}?c=${encodeConfig({ instrument: 'pid5bf', study: 'setupfile', participantParam: name })}`);
    await expectRefused(page, `The study link's participantParam field could not be used: ${why}`);
  });
}
