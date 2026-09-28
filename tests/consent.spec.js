// A link's `consent` field and its `completeDeclined` address.
//
// The link check. Each probe travels as z, since a 20,001-character text
// would make a c link longer than the test server reads:
//
//   C1: each fault in consent is refused naming the field and the fault,
//       and no screen of the form shows: not an object, a key other than
//       text and declined, text absent, not a string, blank, over 20,000
//       characters or holding a lone surrogate, and declined not a
//       string, blank, over 2,000 characters or holding a lone surrogate
//   C2: a text of exactly 20,000 characters and a declined text of exactly
//       2,000 are accepted, as is a text holding a paired character
//   C3: completeDeclined without consent, and an http: completeDeclined,
//       are refused naming completeDeclined

import { test, expect } from '@playwright/test';
import { useTarget, openForm } from './helpers.mjs';

const base = useTarget();

const LINK = { instrument: 'hitopbr', study: 'consent', participant: 'c1' };
const PROLIFIC_DECLINED = 'https://app.prolific.com/submissions/complete?cc=NOCONSENT';

async function expectRefused(page, message) {
  await expect(page.locator('[role=alert]')).toHaveText(message);
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'I agree' })).toHaveCount(0);
  await expect(page.locator('fieldset.item')).toHaveCount(0);
}

const consentFault = (why) => `The study link's consent field could not be used: ${why}`;

// C1
const REFUSED_CONSENT = [
  ...['Please read this.', null, ['a']].map((consent) => ({ name: JSON.stringify(consent), consent, why: 'it is not an object.' })),
  { name: 'a key "other"', consent: { text: 'a', other: 1 }, why: 'it has a field "other", and it takes only text and declined.' },
  { name: 'no text', consent: { declined: 'b' }, why: 'it has no text.' },
  { name: 'a text of 7', consent: { text: 7 }, why: 'its text is not a string.' },
  { name: 'an empty text', consent: { text: '' }, why: 'its text is empty or holds only white space.' },
  { name: 'a text of white space', consent: { text: ' \n\t\r\n ' }, why: 'its text is empty or holds only white space.' },
  { name: 'a text of 20,001 characters', consent: { text: 'x'.repeat(20_001) }, why: 'its text has 20,001 characters, more than the 20,000 it may hold.' },
  { name: 'a text holding a lone surrogate', consent: { text: 'I agree \ud800 here' }, why: 'its text holds half of a character (a lone surrogate), which cannot be written.' },
  { name: 'a declined text of 7', consent: { text: 'a', declined: 7 }, why: 'its declined text is not a string.' },
  { name: 'an empty declined text', consent: { text: 'a', declined: '' }, why: 'its declined text is empty or holds only white space.' },
  { name: 'a declined text of white space', consent: { text: 'a', declined: '\n \n' }, why: 'its declined text is empty or holds only white space.' },
  { name: 'a declined text of 2,001 characters', consent: { text: 'a', declined: 'y'.repeat(2_001) }, why: 'its declined text has 2,001 characters, more than the 2,000 it may hold.' },
  { name: 'a declined text holding a lone surrogate', consent: { text: 'a', declined: 'bye \udc00' }, why: 'its declined text holds half of a character (a lone surrogate), which cannot be written.' },
];

for (const probe of REFUSED_CONSENT) {
  test(`a consent field with ${probe.name} is refused, naming the fault`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, consent: probe.consent }, { param: 'z' });
    await expectRefused(page, consentFault(probe.why));
  });
}

// C2
for (const probe of [
  { name: 'a text of exactly 20,000 characters', consent: { text: 'x'.repeat(20_000) } },
  { name: 'a declined text of exactly 2,000 characters', consent: { text: 'a', declined: 'y'.repeat(2_000) } },
  { name: 'a text holding a paired character', consent: { text: 'I agree 😀' } },
]) {
  test(`a consent field with ${probe.name} is accepted`, async ({ page }) => {
    await openForm(page, base(), { ...LINK, consent: probe.consent }, { param: 'z' });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}

// C3
test('a completeDeclined field without consent is refused, naming the field', async ({ page }) => {
  await openForm(page, base(), { ...LINK, completeDeclined: PROLIFIC_DECLINED });
  await expectRefused(page, `The study link's completeDeclined field could not be used: it needs a consent field beside it, and the link carries none; it is "${PROLIFIC_DECLINED}".`);
});

test('an http: completeDeclined field is refused, naming the field', async ({ page }) => {
  await openForm(page, base(), { ...LINK, consent: { text: 'a' }, completeDeclined: 'http://example.org/declined' }, { param: 'z' });
  await expectRefused(page, 'The study link\'s completeDeclined field could not be used: it must start with https://, and it is "http://example.org/declined".');
});
