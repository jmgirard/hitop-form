// The compressed study link: `?z=`, the config's UTF-8 JSON compressed with
// deflate-raw and written as base64url with no padding. The page reads it
// beside `?c=`.
//
//   Z1: a z link without consent opens the form as its c link does, and a
//       z link that inflates to exactly 100,000 bytes is read
//   Z2: each fault in a z is refused by name, and no form starts: text that
//       is not base64url (a character outside the alphabet, a length no
//       base64 has), a stream that does not inflate (bytes that are no
//       stream, a truncated stream, bytes after the end of the stream),
//       more than 100,000 bytes inflated, bytes that are not UTF-8, text
//       that is not JSON, and JSON that is not an object
//   Z3: a link carrying both c and z is refused by name, each order
//   Z4: in a browser without DecompressionStream, a z link is refused
//       naming the browser, and a c link still opens
//   Z5: participantParam "z" is refused as "c" is, naming the parameter

import { test, expect } from '@playwright/test';
import { deflateRawSync } from 'node:zlib';
import { useTarget, openForm, encodeConfig, encodeCompressed, refusalText } from './helpers.mjs';

const base = useTarget();

const CONFIG = { instrument: 'hitopbr', study: 'zlink', participant: 'z1' };

const z = (bytes) => Buffer.from(bytes).toString('base64url');
const deflate = (text) => deflateRawSync(Buffer.from(text, 'utf8'));

// A config whose JSON is padded with spaces to exactly `n` bytes.
function paddedJson(n) {
  const json = JSON.stringify(CONFIG);
  return `${json.slice(0, -1)}${' '.repeat(n - json.length)}}`;
}

async function expectRefused(page, message) {
  await expect(refusalText(page)).toHaveText(message);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
}

const zFault = (why) => `The study link could not be read: it ${why}. Ask the study team for a new link.`;

// Z1
test('a z link without consent opens the form as its c link does', async ({ page }) => {
  await openForm(page, base(), CONFIG, { param: 'z' });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.locator('h1')).toHaveText('HiTOP-BR');
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
});

test('a z link that inflates to exactly 100,000 bytes is read', async ({ page }) => {
  const json = paddedJson(100_000);
  expect(Buffer.byteLength(json)).toBe(100_000);
  await page.goto(`${base()}?z=${z(deflate(json))}`);
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
});

// Z2
const good = deflate(JSON.stringify(CONFIG));
const REFUSED_Z = [
  { name: 'a character outside base64url', value: `${z(good)}*`, why: 'is not base64url text' },
  { name: 'a length no base64 has', value: 'abcde', why: 'is not base64url text' },
  { name: 'bytes that are no stream', value: z(Buffer.from('hello world')), why: 'does not unpack' },
  { name: 'a truncated stream', value: z(good.subarray(0, good.length - 2)), why: 'does not unpack' },
  { name: 'bytes after the end of the stream', value: z(Buffer.concat([good, Buffer.from([1, 2, 3])])), why: 'does not unpack' },
  { name: '100,001 bytes inflated', value: z(deflate(paddedJson(100_001))), why: 'unpacks to more than 100,000 bytes' },
  { name: 'bytes that are not UTF-8', value: z(deflateRawSync(Buffer.from([0x7b, 0xff, 0xfe, 0x7d]))), why: 'is not UTF-8 text' },
  { name: 'text that is not JSON', value: z(deflate('{instrument: hitopbr}')), why: 'is not JSON' },
];

for (const probe of REFUSED_Z) {
  test(`a z holding ${probe.name} is refused, naming the fault`, async ({ page }) => {
    await page.goto(`${base()}?z=${probe.value}`);
    await expectRefused(page, zFault(probe.why));
  });
}

test('a z holding JSON that is not an object is refused as a c is', async ({ page }) => {
  await page.goto(`${base()}?z=${z(deflate('[1,2]'))}`);
  await expectRefused(page, 'The study link could not be read: it does not hold a form.');
});

// Z3
for (const order of ['c first', 'z first']) {
  test(`a link carrying both c and z, ${order}, is refused naming both`, async ({ page }) => {
    const c = `c=${encodeConfig(CONFIG)}`;
    const zp = `z=${encodeCompressed(CONFIG)}`;
    await page.goto(`${base()}?${order === 'c first' ? `${c}&${zp}` : `${zp}&${c}`}`);
    await expectRefused(page, 'The study link holds its setup twice, in two forms, and a study link holds it once. Ask the study team for a new link.');
  });
}

// Z4
test('without DecompressionStream, a z link is refused naming the browser', async ({ page }) => {
  await page.addInitScript(() => { delete window.DecompressionStream; });
  await openForm(page, base(), CONFIG, { param: 'z' });
  await expectRefused(page, "This browser cannot read the study link, because it cannot unpack it. Open the link in a current version of Chrome, Edge, Firefox or Safari.");
  expect(await page.evaluate(() => typeof DecompressionStream)).toBe('undefined');
});

test('without DecompressionStream, a c link still opens', async ({ page }) => {
  await page.addInitScript(() => { delete window.DecompressionStream; });
  await openForm(page, base(), CONFIG);
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
});

// Z5
test('participantParam "z" is refused, naming the parameter', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'zlink', participantParam: 'z' });
  await expectRefused(page, 'The study link\'s participantParam field could not be used: it is "z", which also carries the study link itself.');
});
