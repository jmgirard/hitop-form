// The link builder's consent fields: the "Consent text" and "Declined
// text" boxes, and "Completion URL after a decline".
//
//   K1: a link built with consent text opens a consent screen whose
//       paragraphs' innerText splits the text as the page states, a single
//       line break as \n, with no `b` element
//   K2: consent text holding CR LF, blank lines, a tab and non-ASCII text
//       makes a ?z= link whose consent text is the box's own text, which
//       the page writes back line for line, the tab and the non-ASCII text
//       kept
//   K3: with the three fields empty the builder writes ?c=, as before, and
//       the link carries no consent and no completeDeclined; with consent
//       text it writes ?z= and no c
//   K4: link.html?z=<p> fills the boxes and the decline address, lists the
//       address in the notice, and "Make the link" builds a link whose z
//       decodes to the config opened
//   K5: each fault the three fields can produce is refused by name, and no
//       link is built: a Consent or Declined box of white space only, a
//       Declined box or a decline address filled beside an empty Consent
//       box, a box over its limit, a box holding a lone surrogate, and an
//       http: decline address; a box at its limit builds a link
//   K6: "Another site" with the address parameter "z" is refused by name
//   K7: link.html with both c and z, and with a z that does not decompress,
//       is refused by name and fills nothing

import { deflateRawSync } from 'node:zlib';
import { test, expect, useTarget, openSectionOf, encodeConfig, encodeCompressed, decodeLinkParam } from './helpers.mjs';

const base = useTarget();

const TEXT = [
  'You are invited to take part in a study.',
  'It takes <b>x</b> minutes.',
  ' \t ',
  '',
  'Risks &amp; benefits are small.',
  'Ask us anything.',
].join('\n');
const TEXT_PARAGRAPHS = [
  'You are invited to take part in a study.\nIt takes <b>x</b> minutes.',
  'Risks &amp; benefits are small.\nAsk us anything.',
];

async function openBuilder(page, query = '') {
  await page.goto(`${base()}link.html${query}`);
}

// Fills the study and the given boxes, presses "Make the link", and waits
// for the link or a refusal.
async function make(page, { consent, declined, completeDeclined, study = 'consent' } = {}) {
  await page.locator('input[name="study"]').fill(study);
  if (consent !== undefined) await setBox(page, 'consentText', consent);
  if (declined !== undefined) await setBox(page, 'declinedText', declined);
  if (completeDeclined !== undefined) {
    await openSectionOf(page, 'completeDeclined');
    await page.locator('input[name="completeDeclined"]').fill(completeDeclined);
  }
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#err, #out').filter({ hasText: /./ }).first()).toBeVisible();
}

// Sets a box's value from the page: fill() would turn a lone surrogate into
// U+FFFD, and the builder reads the box as it holds its value. The box's
// section is opened first, by a click on its summary. The write fires no
// input event, so the section's summary is not redrawn.
async function setBox(page, name, value) {
  await openSectionOf(page, name);
  await page.locator(`textarea[name="${name}"]`).evaluate((node, v) => { node.value = v; }, value);
}

// The consent screen's paragraphs as the page wrote them: each text node's
// data, and \n for each `br`. Unlike innerText, this keeps a tab.
function writtenParagraphs(page) {
  return page.$$eval('.consent p', (ps) => ps.map((p) =>
    [...p.childNodes].map((n) => (n.nodeName === 'BR' ? '\n' : n.nodeType === 3 ? n.data : `<${n.nodeName}>`)).join('')));
}

// K1
test('a link built with consent text shows it as paragraphs', async ({ page }) => {
  await openBuilder(page);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  await make(page, { consent: TEXT });
  await expect(page.locator('#err')).toHaveText('');
  const href = await page.locator('#out').textContent();
  await page.goto(href);
  await expect(page.locator('h1')).toHaveText('Consent to take part');
  expect(await page.$$eval('.consent p', (ns) => ns.map((n) => n.innerText))).toEqual(TEXT_PARAGRAPHS);
  await expect(page.locator('main b')).toHaveCount(0);
});

// K2
test('consent text with CR LF, blank lines, a tab and non-ASCII text round-trips through a z link', async ({ page }) => {
  const typed = 'Vous êtes invité·e.\tMerci.\r\nIt takes <b>x</b> minutes, 日本語 ✓.\r\n\r\n \r\n\r\nRisks &amp; benefits.\r\nAsk.';
  // The box gives CR LF back as LF, and the page splits at the blank lines.
  const held = typed.replace(/\r\n/g, '\n');
  const expected = ['Vous êtes invité·e.\tMerci.\nIt takes <b>x</b> minutes, 日本語 ✓.', 'Risks &amp; benefits.\nAsk.'];
  await openBuilder(page);
  await page.locator('select[name="instrument"]').selectOption('hitopbr');
  // Set as a paste sets it: Playwright's fill() types a CR as something
  // else.
  await setBox(page, 'consentText', typed);
  expect(await page.locator('textarea[name="consentText"]').inputValue()).toBe(held);
  await make(page);
  await expect(page.locator('#err')).toHaveText('');
  const href = await page.locator('#out').textContent();
  const u = new URL(href);
  expect([...u.searchParams.keys()]).toEqual(['z']);
  expect(u.searchParams.get('z')).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(decodeLinkParam(href).consent).toEqual({ text: held });
  await page.goto(href);
  await expect(page.locator('h1')).toHaveText('Consent to take part');
  expect(await writtenParagraphs(page)).toEqual(expected);
});

// K3
test('with the consent fields empty the builder writes c, and with consent text z', async ({ page }) => {
  await openBuilder(page);
  await make(page);
  const plain = await page.locator('#out').textContent();
  expect([...new URL(plain).searchParams.keys()]).toEqual(['c']);
  const config = decodeLinkParam(plain);
  expect(config).toEqual({ instrument: 'hitopsr', study: 'consent' });

  await make(page, { consent: 'I agree to take part.' });
  const withConsent = await page.locator('#out').textContent();
  expect([...new URL(withConsent).searchParams.keys()]).toEqual(['z']);
  expect(decodeLinkParam(withConsent)).toEqual({ instrument: 'hitopsr', study: 'consent', consent: { text: 'I agree to take part.' } });
});

// K4
test('a z parameter fills the consent fields and round-trips', async ({ page }) => {
  const config = {
    instrument: 'hitopbr',
    study: 'prefill',
    participant: 'k4',
    complete: 'https://app.prolific.com/submissions/complete?cc=CHHXQERF',
    consent: { text: 'Paragraph one.\nLine two.\n\nParagraph two.', declined: 'Thank you.\n\nBye.' },
    completeDeclined: 'https://app.prolific.com/submissions/complete?cc=NOCONSENT',
    store: { kind: 'webhook', url: 'https://script.google.com/macros/s/abc/exec' },
  };
  await openBuilder(page, `?z=${encodeCompressed(config)}`);
  await expect(page.locator('#err')).toHaveText('');
  await expect(page.locator('textarea[name="consentText"]')).toHaveValue(config.consent.text);
  await expect(page.locator('textarea[name="declinedText"]')).toHaveValue(config.consent.declined);
  await expect(page.locator('input[name="completeDeclined"]')).toHaveValue(config.completeDeclined);
  await expect(page.locator('#prefilled li')).toHaveText([
    `Completion URL: ${config.complete}`,
    `Completion URL after a decline: ${config.completeDeclined}`,
    `Web app URL: ${config.store.url}`,
  ]);
  await page.getByRole('button', { name: 'Make the link' }).click();
  await expect(page.locator('#out')).not.toBeEmpty();
  await expect(page.locator('#err')).toHaveText('');
  expect(decodeLinkParam(await page.locator('#out').textContent())).toEqual(config);
});

// K5
const REFUSED = [
  { name: 'a Consent box of white space', fields: { consent: ' \n\t ' }, message: 'The consent text could not be used: it is empty or holds only white space.' },
  { name: 'a Declined box of white space', fields: { consent: 'a', declined: '\n  \n' }, message: 'The declined text could not be used: it is empty or holds only white space.' },
  { name: 'a Declined box beside an empty Consent box', fields: { declined: 'Thank you.' }, message: 'The declined text needs consent text beside it: give the consent text first, or leave the declined text empty.' },
  {
    name: 'a decline address beside an empty Consent box',
    fields: { completeDeclined: 'https://app.prolific.com/submissions/complete?cc=NOCONSENT' },
    message: 'The completion URL after a decline needs consent text beside it: give the consent text first, or leave this field empty.',
  },
  { name: 'a Consent box of 20,001 characters', fields: { consent: 'x'.repeat(20_001) }, message: 'The consent text could not be used: it has 20,001 characters, more than the 20,000 it may hold.' },
  { name: 'a Declined box of 2,001 characters', fields: { consent: 'a', declined: 'y'.repeat(2_001) }, message: 'The declined text could not be used: it has 2,001 characters, more than the 2,000 it may hold.' },
  { name: 'a Consent box holding a lone surrogate', fields: { consent: 'I agree \ud800' }, message: 'The consent text could not be used: it holds half of a character (a lone surrogate), which cannot be written.' },
  { name: 'a Declined box holding a lone surrogate', fields: { consent: 'a', declined: '\udc00 bye' }, message: 'The declined text could not be used: it holds half of a character (a lone surrogate), which cannot be written.' },
  {
    name: 'an http: decline address',
    fields: { consent: 'a', completeDeclined: 'http://example.org/declined' },
    message: 'The completion URL after a decline could not be used: it must start with https://, and it is "http://example.org/declined".',
  },
];

for (const probe of REFUSED) {
  test(`${probe.name} is refused by name and builds no link`, async ({ page }) => {
    await openBuilder(page);
    await make(page, probe.fields);
    await expect(page.locator('#err')).toHaveText(probe.message);
    await expect(page.locator('#out')).toHaveText('');
  });
}

test('a Consent box of 20,000 characters and a Declined box of 2,000 build a link', async ({ page }) => {
  await openBuilder(page);
  await make(page, { consent: 'x'.repeat(20_000), declined: 'y'.repeat(2_000) });
  await expect(page.locator('#err')).toHaveText('');
  const config = decodeLinkParam(await page.locator('#out').textContent());
  expect(config.consent).toEqual({ text: 'x'.repeat(20_000), declined: 'y'.repeat(2_000) });
});

// K6
test('"Another site" with the address parameter "z" is refused by name', async ({ page }) => {
  await openBuilder(page);
  await openSectionOf(page, 'site');
  await page.locator('select[name="site"]').selectOption('other');
  await page.locator('input[name="participantParam"]').fill('z');
  await make(page);
  await expect(page.locator('#err')).toHaveText('The address parameter could not be used: it is "z", which also carries the study link itself.');
  await expect(page.locator('#out')).toHaveText('');
});

// K7
for (const probe of [
  {
    name: 'both c and z',
    query: `?c=${encodeConfig({ instrument: 'pid5' })}&z=${encodeCompressed({ instrument: 'pid5' })}`,
    message: 'The study link you opened holds its setup twice, in two forms, and a study link holds it once. Fill in the form above to make a new link.',
  },
  {
    name: 'a z that does not decompress',
    query: `?z=${deflateRawSync(Buffer.from('{"instrument":"pid5"}')).subarray(0, 5).toString('base64url')}`,
    message: "The study link you opened does not unpack. Fill in the form above to make a new link.",
  },
]) {
  test(`link.html with ${probe.name} is refused by name and fills nothing`, async ({ page }) => {
    await openBuilder(page, probe.query);
    await expect(page.locator('#err')).toHaveText(probe.message);
    await expect(page.locator('select[name="instrument"]')).toHaveValue('hitopsr');
  });
}
