// The link builder: link.html makes a study link for each instrument.
//
//   L1: the instrument selector offers the five instruments, each with its
//       item count, in this order
//   L2: a link built for each instrument opens that instrument's form, whose
//       heading names the instrument and whose start screen counts its items
//   L3: the module hint limits modules to the HiTOP-SR
//   L4: a "Send responses to" address the form page would refuse is refused
//       here, naming the fault, and no link is built; an empty field builds
//       a link with no store
//   L5: a link built with the address set opens a form whose Finish posts
//       the responses to that address

import { test, expect } from '@playwright/test';
import {
  useTarget, useStore, allowLocalStore, begin, walkAll, fetchExport,
} from './helpers.mjs';

const base = useTarget();
const store = useStore();

// Stated here rather than read from form.js or the exports, so a change to
// either shows up as a failure.
const OFFERED = [
  { value: 'hitopsr', label: 'HiTOP-SR (405 items)', title: 'HiTOP-SR', items: 405 },
  { value: 'hitopbr', label: 'HiTOP-BR (45 items)', title: 'HiTOP-BR', items: 45 },
  { value: 'pid5', label: 'PID-5 (220 items)', title: 'PID-5', items: 220 },
  { value: 'pid5sf', label: 'PID-5-SF (100 items)', title: 'PID-5-SF', items: 100 },
  { value: 'pid5bf', label: 'PID-5-BF (25 items)', title: 'PID-5-BF', items: 25 },
];

test('the selector offers the five instruments with their item counts', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  const options = await page.$$eval('select[name="instrument"] option', (nodes) =>
    nodes.map((n) => ({ value: n.value, label: n.textContent })),
  );
  // L1
  expect(options).toEqual(OFFERED.map(({ value, label }) => ({ value, label })));
});

for (const o of OFFERED) {
  test(`${o.value}: a built link opens the ${o.title} form`, async ({ page }) => {
    await page.goto(`${base()}link.html`);
    await page.locator('select[name="instrument"]').selectOption(o.value);
    await page.locator('input[name="study"]').fill('link');
    await page.locator('input[name="participant"]').fill('l1');
    await page.getByRole('button', { name: 'Make the link' }).click();
    const href = await page.locator('#out').textContent();
    expect(href).toMatch(/\?c=/);

    // L2
    await page.goto(href);
    await expect(page.locator('h1')).toHaveText(o.title);
    await expect(page.locator('p.muted')).toContainText(`${o.items} items over `);
  });
}

// Fills the builder for the HiTOP-BR with a store address and presses the
// button; returns the alert text and the built link (empty when refused).
async function build(page, storeUrl) {
  await page.goto(`${base()}link.html`);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await page.locator('input[name="study"]').fill('link');
  await page.locator('input[name="participant"]').fill('l4');
  await page.locator('input[name="store"]').fill(storeUrl);
  await page.getByRole('button', { name: 'Make the link' }).click();
  return { err: await page.locator('#err').textContent(), href: await page.locator('#out').textContent() };
}

function decodeLink(href) {
  const c = new URL(href).searchParams.get('c');
  return JSON.parse(Buffer.from(c, 'base64url').toString('utf8'));
}

// L4: one builder test per builder fault.
const BUILDER_FAULTS = [
  { url: 'http://example.com/hook', names: 'its url must start with https://' },
  { url: 'not a url', names: 'its url is not a web address: "not a url".' },
  { url: 'javascript:alert(1)', names: 'its url must start with https://' },
];

for (const fault of BUILDER_FAULTS) {
  test(`the builder refuses the address ${fault.url}`, async ({ page }) => {
    const { err, href } = await build(page, fault.url);
    expect(err).toContain("The study link's store could not be used: ");
    expect(err).toContain(fault.names);
    expect(href, 'no link is built').toBe('');
  });
}

test('an empty "Send responses to" field builds a link with no store', async ({ page }) => {
  const { err, href } = await build(page, '   ');
  expect(err).toBe('');
  expect(decodeLink(href)).toEqual({ instrument: 'hitopbr', study: 'link', participant: 'l4' });
});

// L5
test('a link built with the address set opens a form whose Finish posts to it', async ({ page, context }) => {
  await allowLocalStore(context);
  const exp = await fetchExport('hitopbr');
  const address = store().url('/record');
  const { err, href } = await build(page, address);
  expect(err).toBe('');
  expect(decodeLink(href).store).toEqual({ kind: 'webhook', url: address });

  const from = store().requests.length;
  await page.goto(href);
  await expect(page.locator('p.muted')).toContainText(`sent to the study team at ${new URL(address).host}.`);
  await begin(page);
  const seen = await walkAll(page);
  await expect(page.locator('.done')).toHaveText('Your responses were sent to the study team.');
  const sent = store().requests.slice(from).filter((r) => r.method === 'POST');
  expect(sent.map((r) => r.path)).toEqual(['/record']);
  const row = JSON.parse(sent[0].body);
  expect([row.study, row.participant, row.instrument]).toEqual(['link', 'l4', exp.stem]);
  expect(Object.keys(row).slice(5)).toEqual(seen.map((s) => exp.items.find((it) => it.number === s.number).name));
});

test('the module hint limits modules to the HiTOP-SR', async ({ page }) => {
  await page.goto(`${base()}link.html`);
  // L3
  const hint = page.locator('label', { hasText: 'Module descriptor' }).locator('.hint');
  await expect(hint).toContainText('Optional, HiTOP-SR only.');
});
