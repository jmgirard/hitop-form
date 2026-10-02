// The export's version display and the format guard.
//
//   G1: the start screen and the done screen hold the export's buildDate and
//       packageVersion, in the closed study-team section (form_build in the
//       saved file is S2 in save.spec.js)
//   G2: an export whose format is a string other than "1.0" is refused with
//       a message naming the format found, and no form starts
//   G3: an export with no format field is refused with a message saying so
//   G4: an export whose format is not a string is refused with a message
//       naming the value found
//   G7: a link's store is refused by name when it is null, an array or a
//       string, when its kind is unknown, and when its url is missing, not
//       text, unparsable, http: to a host other than 127.0.0.1 or localhost
//       (near misses included), or of another scheme; an https: url and an
//       http: url to 127.0.0.1 or localhost are accepted
//   G8: a supabase store is refused by name when its url fails the G7 rule
//       or is not the project URL alone (a table path, a dashboard page, a
//       query, a fragment), its key is missing, empty, not text, has a
//       space, is a secret key or a JWT for a role other than anon, or its
//       table is missing or not a lower-case Postgres name (a capital, a
//       leading digit, a hyphen, the empty string, 64 characters); four
//       table forms, an anon JWT and a url ending in /rest/v1/ accepted
//   G9: a link whose shuffle field is the string "true", the number 1 or
//       null is refused with a message naming the field and the value, and
//       no form starts
//   G10: a link whose prolific field is the string "true", the number 1 or
//       null is refused with a message naming the field and the value; a
//       link with prolific: true beside a participant identifier is refused
//       naming both; prolific: false is accepted as no field
//   G11: a link's complete field is refused by name, with the value shown,
//       when it is http://127.0.0.1, http://localhost, a javascript:
//       address, a string that is no URL, an address with a user name only
//       or one with a password, or a number; an https:// address is
//       accepted
//   G12: a link's completeSaved field is refused by name, with the value
//       shown, for five of the G11 forms (http://localhost, a string that is
//       no URL, a user name only, a password, a number) beside a complete, and
//       when it stands alone with no complete field; an https:// address
//       beside a complete is accepted
//   G13: a descriptor whose items are not in ascending order, reversed or
//       with its last two swapped, is refused with a message naming the
//       fault, and no form starts
//   G14: a link's participantParam field is refused by name, with the value
//       shown, when it is not text (a number, null, an array), empty, over
//       64 characters, holds a character outside A-Z a-z 0-9 _ . - (a space,
//       "=", "&", an accented letter), is "c", or is one of the three
//       Prolific names; a link naming it beside a non-blank participant or
//       beside prolific: true is refused naming both; a blank participant
//       beside it is dropped and the name accepted; a 64-character name and
//       names holding "." and "-" are accepted
//   G15: a complete or completeSaved address holding the {participant}
//       token in its path (typed with braces or as %7Bparticipant%7D) or in
//       its host is refused by name with the value shown; the token in the
//       query, in the fragment, or twice in the query is accepted
//   G16: a complete or completeSaved address holding another spelling of
//       the token after the ? or the # (another letter case, alone and
//       beside an exact token; both braces, the opening one or the closing
//       one as %7B and %7D; both as %257B and %257D; doubled braces; a
//       space inside the braces, each alone) is refused naming that
//       spelling as the address holds it, with the address shown
//   G17: a link whose participant holds an unpaired surrogate (a lone high
//       or low one, alone or at the start, middle or end; a low before a
//       high; a high before a valid pair) is refused with one message, and
//       no form starts, also with no completion address in the link; an
//       identifier holding a paired character (U+1F600)
//       is accepted and fills the completion address with its encoding
//
// The altered exports are copies of the export fetchExport() returns, served
// in its place, so nothing but the one field differs.

import {
  test, expect, useTarget, openForm, begin, walkAll, awaitDownload, fetchExport, readDescriptor, JWT_SHAPED_KEY,
  NOT_ASCENDING, NOT_ASCENDING_MESSAGE, notAscendingDescriptor, refusalText,
} from './helpers.mjs';

// A JWT-shaped key whose payload is {"role":"service_role"}: not a real
// token, only its middle segment is read.
const SERVICE_ROLE_KEY = `x.${Buffer.from('{"role":"service_role"}').toString('base64url')}.y`;

const base = useTarget();

test('the start and done screens show the export build and package version', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g1' });
  // G1
  const version = page.locator('main > details.study-team:not([open]) > footer > .version');
  await expect(version).toContainText(exp.buildDate);
  await expect(version).toContainText(exp.packageVersion);
  await begin(page);
  await walkAll(page);
  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(version).toContainText(exp.buildDate);
  await expect(version).toContainText(exp.packageVersion);
});

const PROBES = [
  { name: 'altered', alter: (e) => ({ ...e, format: '2.0' }), names: 'format "2.0"' },
  {
    name: 'absent',
    alter: (e) => { const c = { ...e }; delete c.format; return c; },
    names: 'no format field',
  },
  { name: 'non-string', alter: (e) => ({ ...e, format: 1 }), names: 'a format that is not text (1)' },
];

for (const probe of PROBES) {
  test(`an export with format ${probe.name} is refused, naming what was found`, async ({ page }) => {
    const exp = await fetchExport('hitopbr');
    const served = probe.alter(exp);
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g2' }, {
      exportJson: served,
    });
    // G2, G3, G4
    const alert = refusalText(page);
    await expect(alert).toContainText('The online form reads format "1.0"');
    await expect(alert).toContainText(probe.names);
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
  });
}

// G5: the fields the saved file carries are guarded too.
test('an export whose stem does not match the link is refused', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g5' }, {
    exportJson: { ...exp, stem: 'hitopsr' },
  });
  await expect(refusalText(page)).toContainText('its stem is "hitopsr" and the link asked for "hitopbr"');
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('an export with no buildDate is refused', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  const served = { ...exp };
  delete served.buildDate;
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g5' }, {
    exportJson: served,
  });
  await expect(refusalText(page)).toContainText('its buildDate field is missing or not text');
});

// G6: the link's own guards. A descriptor of another format is refused by
// name, and a blank participant identifier makes the start screen ask.
test('a descriptor whose format is not "1.0" is refused', async ({ page }) => {
  const module = { ...(await readDescriptor('module-plain.json')), format: '2.0' };
  await openForm(page, base(), { instrument: module.instrument, study: 'guard', module });
  await expect(refusalText(page)).toContainText('the online form reads format "1.0" and found format "2.0"');
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('a blank participant identifier in the link is asked for on the start screen', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: '   ' });
  await expect(page.locator('input[name="participant"]')).toBeVisible();
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.locator('[role=alert]')).toHaveText('Please enter your participant identifier before starting.');
  await expect(page.locator('.progress')).toHaveCount(0);
});

// G13: a descriptor whose items are not in ascending order. With no
// `itemOrder`, as here, the page follows the order of `items` for its
// columns, so an order other than ascending would score wrong by position;
// it is refused by name, and no form starts.
for (const entry of NOT_ASCENDING) {
  test(`a descriptor whose items are ${entry.name} is refused`, async ({ page }) => {
    const module = await notAscendingDescriptor(entry);
    await openForm(page, base(), { instrument: module.instrument, study: 'guard', module });
    await expect(refusalText(page)).toHaveText(NOT_ASCENDING_MESSAGE);
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  });
}

// G7: the store guard. Each refused form names its fault; no request is sent
// before Finish, so the accepted forms need no endpoint to open.
const REFUSED_STORES = [
  { name: 'null', store: null, names: 'it is not an object.' },
  { name: 'an array', store: ['https://example.com/hook'], names: 'it is not an object.' },
  { name: 'a string', store: 'https://example.com/hook', names: 'it is not an object.' },
  {
    name: 'an unknown kind',
    store: { kind: 'ftp', url: 'https://example.com/hook' },
    names: 'its kind is "ftp", and the online form knows only "webhook", "supabase".',
  },
  { name: 'a missing url', store: { kind: 'webhook' }, names: 'it names no url.' },
  { name: 'a url that is not text', store: { kind: 'webhook', url: 7 }, names: 'its url is not text.' },
  // Wrong on the scheme and the credentials both: refused for the scheme.
  {
    name: 'an http url with a user name',
    store: { kind: 'webhook', url: 'http://user@example.com/hook' },
    names: 'its url must start with https:// (http:// is accepted only for 127.0.0.1 or localhost), and it is "http://user@example.com/hook".',
  },
  {
    name: 'an unparsable url',
    store: { kind: 'webhook', url: 'not a url' },
    names: 'its url is not a web address: "not a url".',
  },
  ...[
    'http://example.com/hook',
    'http://localhost.example.com/hook',
    'http://127.0.0.1.example.com/hook',
    'javascript:alert(1)',
    'data:text/plain,x',
  ].map((url) => ({
    name: `the url ${url}`,
    store: { kind: 'webhook', url },
    names: `its url must start with https:// (http:// is accepted only for 127.0.0.1 or localhost), and it is ${JSON.stringify(url)}.`,
  })),
  {
    name: 'a url with a user name and password',
    store: { kind: 'webhook', url: 'https://user:pass@example.com/hook' },
    names: 'its url must not carry a user name or password, and it is "https://user:pass@example.com/hook".',
  },
  // G8: the supabase kind. Its url takes the webhook rule; its key and its
  // table have rules of their own.
  {
    name: 'a supabase store with an http: url to another host',
    store: { kind: 'supabase', url: 'http://example.supabase.co', key: 'k', table: 'responses' },
    names: 'its url must start with https:// (http:// is accepted only for 127.0.0.1 or localhost), and it is "http://example.supabase.co".',
  },
  { name: 'a supabase store with no key', store: { kind: 'supabase', url: 'https://example.supabase.co', table: 'responses' }, names: 'it names no key.' },
  { name: 'a supabase store whose key is empty', store: { kind: 'supabase', url: 'https://example.supabase.co', key: '  ', table: 'responses' }, names: 'its key is empty.' },
  { name: 'a supabase store whose key is not text', store: { kind: 'supabase', url: 'https://example.supabase.co', key: 7, table: 'responses' }, names: 'its key is not text.' },
  { name: 'a supabase store with no table', store: { kind: 'supabase', url: 'https://example.supabase.co', key: 'k' }, names: 'it names no table.' },
  ...[
    'https://example.supabase.co/rest/v1/responses',
    'https://supabase.com/dashboard/project/example',
    'https://example.supabase.co/?x=1',
    'https://example.supabase.co/#x',
  ].map((url) => ({
    name: `a supabase store whose url is ${url}`,
    store: { kind: 'supabase', url, key: 'k', table: 'responses' },
    names: `its url must be the project URL alone, such as https://abcdefghijkl.supabase.co, and it is ${JSON.stringify(url)}.`,
  })),
  {
    name: 'a supabase store whose key has a space',
    store: { kind: 'supabase', url: 'https://example.supabase.co', key: 'sb_publishable_a b', table: 'responses' },
    names: 'its key has a space or a character outside printable ASCII.',
  },
  {
    name: 'a supabase store whose key is a secret key',
    store: { kind: 'supabase', url: 'https://example.supabase.co', key: 'sb_secret_abc', table: 'responses' },
    names: 'its key is a secret key (sb_secret_…), which must never be in a study link. Use the publishable key.',
  },
  {
    name: 'a supabase store whose key is a service_role JWT',
    store: { kind: 'supabase', url: 'https://example.supabase.co', key: SERVICE_ROLE_KEY, table: 'responses' },
    names: 'its key is a JWT whose role is "service_role", not "anon", so it must never be in a study link. Use the anon or publishable key.',
  },
  ...['Responses', '1abc', 'a-b', '', 'a'.repeat(64)].map((table) => ({
    name: `a supabase store whose table is ${JSON.stringify(table)}`,
    store: { kind: 'supabase', url: 'https://example.supabase.co', key: 'k', table },
    names: `its table must be a lower-case name of up to 63 letters, digits and underscores, not starting with a digit, and it is ${JSON.stringify(table)}.`,
  })),
];

for (const probe of REFUSED_STORES) {
  test(`a store that is ${probe.name} is refused, naming the fault`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g7', store: probe.store });
    const alert = refusalText(page);
    await expect(alert).toContainText("Where responses go could not be used: ");
    await expect(alert).toContainText(probe.names);
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  });
}

for (const url of ['https://example.com/hook', 'http://127.0.0.1:8123/record', 'http://localhost:8123/record']) {
  test(`a store at ${url} is accepted`, async ({ page }) => {
    await openForm(page, base(), {
      instrument: 'hitopbr', study: 'guard', participant: 'g7', store: { kind: 'webhook', url },
    });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}

// A project URL pasted with the REST path the dashboard shows is accepted:
// the start screen says the answers are sent, and shows no refusal.
test('a supabase store whose url ends in /rest/v1/ is accepted', async ({ page }) => {
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'guard', participant: 'g8',
    store: { kind: 'supabase', url: 'https://example.supabase.co/rest/v1/', key: 'sb_publishable_x', table: 'r' },
  });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.locator('p.muted')).toContainText('When you finish, your answers are sent to the study team.');
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
});

// The accepted table forms: the shortest, one with digits and underscores
// after the first letter, one starting with an underscore, and the longest.
for (const table of ['a', 'r2_d2', '_x', 'a'.repeat(63)]) {
  test(`a supabase store whose table is ${JSON.stringify(table)} is accepted`, async ({ page }) => {
    await openForm(page, base(), {
      instrument: 'hitopbr', study: 'guard', participant: 'g8',
      store: { kind: 'supabase', url: 'https://example.supabase.co', key: 'sb_publishable_x', table },
    });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}

test('a supabase store whose key is an anon JWT is accepted', async ({ page }) => {
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'guard', participant: 'g8',
    store: { kind: 'supabase', url: 'https://example.supabase.co', key: JWT_SHAPED_KEY, table: 'r' },
  });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
});

// G9: a shuffle field that is not one of the two booleans.
for (const shuffle of ['true', 1, null]) {
  test(`a shuffle field of ${JSON.stringify(shuffle)} is refused, naming the field and the value`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g9', shuffle });
    await expect(refusalText(page)).toHaveText(
      `The study link's shuffle field must be true or false, and it is ${JSON.stringify(shuffle)}.`,
    );
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
  });
}

// G10: a prolific field that is not one of the two booleans, and the
// participant conflict.
for (const prolific of ['true', 1, null]) {
  test(`a prolific field of ${JSON.stringify(prolific)} is refused, naming the field and the value`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', prolific });
    await expect(refusalText(page)).toHaveText(
      `The study link's prolific field must be true or false, and it is ${JSON.stringify(prolific)}.`,
    );
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
  });
}

test('prolific: true beside a participant identifier is refused, naming both', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g10', prolific: true });
  await expect(refusalText(page)).toHaveText(
    "The study link names a participant and asks for the Prolific ID as well. Under prolific: true the participant identifier comes from the page's address, so the link must carry no participant.",
  );
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('prolific: false beside a participant identifier is accepted', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g10', prolific: false });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.locator('input[name="participant"]')).toHaveCount(0);
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
});

// G11: the complete field. Its address takes the store address's parse, with
// https: alone accepted: the loopback exception is the recording endpoint's,
// and a completion address is never one.
const REFUSED_COMPLETE = [
  ...['http://127.0.0.1', 'http://localhost', 'javascript:alert(1)'].map((complete) => ({
    complete,
    names: `it must start with https://, and it is ${JSON.stringify(complete)}.`,
  })),
  { complete: 'not a url', names: 'it is not a web address: "not a url".' },
  ...['https://user@example.com/done', 'https://user:pass@example.com/done'].map((complete) => ({
    complete,
    names: `it must not carry a user name or password, and it is ${JSON.stringify(complete)}.`,
  })),
  { complete: 7, names: 'it is not text, and it is 7.' },
];

for (const probe of REFUSED_COMPLETE) {
  test(`a complete field of ${JSON.stringify(probe.complete)} is refused, naming the fault`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g11', complete: probe.complete });
    await expect(refusalText(page)).toHaveText(
      `The study link's complete field could not be used: ${probe.names}`,
    );
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  });
}

test('a complete field of an https:// address is accepted', async ({ page }) => {
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'guard', participant: 'g11', complete: 'https://app.prolific.com/submissions/complete?cc=CHHXQERF',
  });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
});

// G12: the completeSaved field. The same check as G11 under its own name,
// each probe beside a complete address the page accepts, then the field
// alone. The message names completeSaved and shows the value.
const COMPLETE_OK = 'https://app.prolific.com/submissions/complete?cc=CHHXQERF';
const REFUSED_COMPLETE_SAVED = [
  { completeSaved: 'http://localhost', names: 'it must start with https://, and it is "http://localhost".' },
  { completeSaved: 'not a url', names: 'it is not a web address: "not a url".' },
  ...['https://user@example.com/saved', 'https://user:pass@example.com/saved'].map((completeSaved) => ({
    completeSaved,
    names: `it must not carry a user name or password, and it is ${JSON.stringify(completeSaved)}.`,
  })),
  { completeSaved: 7, names: 'it is not text, and it is 7.' },
];

for (const probe of REFUSED_COMPLETE_SAVED) {
  test(`a completeSaved field of ${JSON.stringify(probe.completeSaved)} is refused, naming the field`, async ({ page }) => {
    await openForm(page, base(), {
      instrument: 'hitopbr', study: 'guard', participant: 'g12', complete: COMPLETE_OK, completeSaved: probe.completeSaved,
    });
    await expect(refusalText(page)).toHaveText(
      `The study link's completeSaved field could not be used: ${probe.names}`,
    );
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  });
}

test('a completeSaved field with no complete field is refused, naming the field', async ({ page }) => {
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'guard', participant: 'g12', completeSaved: 'https://app.prolific.com/submissions/complete?cc=SAVED123',
  });
  await expect(refusalText(page)).toHaveText(
    'The study link\'s completeSaved field could not be used: it needs a complete field beside it, and the link carries none; it is "https://app.prolific.com/submissions/complete?cc=SAVED123".',
  );
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('a completeSaved field of an https:// address beside a complete is accepted', async ({ page }) => {
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'guard', participant: 'g12', complete: COMPLETE_OK,
    completeSaved: 'https://app.prolific.com/submissions/complete?cc=SAVED123',
  });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
});

// G14: the participantParam field. Each refusal names the field and shows
// the value; the two conflicts name both fields and the parameter.
const LONG_NAME = 'p'.repeat(65);
const REFUSED_PARAM = [
  ...[7, null, ['id']].map((participantParam) => ({
    participantParam,
    names: `it is not text, and it is ${JSON.stringify(participantParam)}.`,
  })),
  { participantParam: '', names: 'it is empty, and it is "".' },
  { participantParam: LONG_NAME, names: `it is longer than 64 characters, and it is "${LONG_NAME}".` },
  ...['survey code', 'id=1', 'a&b', 'identité'].map((participantParam) => ({
    participantParam,
    names: `it must hold only the letters A-Z and a-z, digits, "_", "." and "-", and it is ${JSON.stringify(participantParam)}.`,
  })),
  { participantParam: 'c', names: 'it is "c", the parameter that carries the study link itself.' },
  ...['PROLIFIC_PID', 'STUDY_ID', 'SESSION_ID'].map((participantParam) => ({
    participantParam,
    names: `it is "${participantParam}", one of Prolific's parameters. For a Prolific study use prolific: true, which also keeps STUDY_ID and SESSION_ID.`,
  })),
];

for (const probe of REFUSED_PARAM) {
  test(`a participantParam field of ${JSON.stringify(probe.participantParam).slice(0, 40)} is refused, naming the field and the value`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participantParam: probe.participantParam });
    await expect(refusalText(page)).toHaveText(
      `The study link's participantParam field could not be used: ${probe.names}`,
    );
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
  });
}

test('participantParam beside a participant identifier is refused, naming both and the parameter', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g14', participantParam: 'id' });
  await expect(refusalText(page)).toHaveText(
    'The study link names a participant and takes the identifier from the address parameter "id" as well. Under participantParam the participant identifier comes from the page\'s address, so the link must carry no participant.',
  );
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('participantParam beside prolific: true is refused, naming both and the parameter', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', prolific: true, participantParam: 'participantId' });
  await expect(refusalText(page)).toHaveText(
    'The study link carries prolific: true and takes the identifier from the address parameter "participantId" as well. Keep one: prolific: true for a Prolific study, participantParam for another site.',
  );
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

// A blank participant is no participant (parseLink() drops it), so it does
// not conflict; prolific: false is no Prolific field.
for (const extra of [{ participant: '  ' }, { prolific: false }]) {
  test(`participantParam beside ${JSON.stringify(extra)} is accepted`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participantParam: 'id', ...extra });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}

for (const participantParam of ['id', 'participantId', 'survey.code-1', 'q'.repeat(64)]) {
  test(`a participantParam field of ${JSON.stringify(participantParam).slice(0, 40)} is accepted`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participantParam });
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
    await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  });
}

// G15: where the {participant} token may stand in a completion address.
const TOKEN_REFUSED = [
  'https://example.org/{participant}/done',
  'https://example.org/done/%7Bparticipant%7D',
  'https://example.org/done/%7bparticipant%7d',
  'https://{participant}.example.org/done',
];
const TOKEN_ACCEPTED = [
  'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code={participant}',
  'https://example.org/done#code={participant}',
  'https://example.org/done?a={participant}&b={participant}',
];
for (const field of ['complete', 'completeSaved']) {
  for (const address of TOKEN_REFUSED) {
    test(`a ${field} address with the token in the host or the path, ${address}, is refused naming the token`, async ({ page }) => {
      const config = { instrument: 'hitopbr', study: 'guard', participant: 'g15', complete: COMPLETE_OK, [field]: address };
      await openForm(page, base(), config);
      await expect(refusalText(page)).toHaveText(
        `The study link's ${field} field could not be used: the {participant} token must stand after the ? or the #, not in the host or the path, and it is ${JSON.stringify(address)}.`,
      );
      await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    });
  }
  for (const address of TOKEN_ACCEPTED) {
    test(`a ${field} address with the token in ${address.includes('#') ? 'the fragment' : 'the query'}, ${address.slice(8, 40)}…, is accepted`, async ({ page }) => {
      await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g15', complete: COMPLETE_OK, [field]: address });
      await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
      await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
    });
  }
}

// G16: only the exact spelling is filled, so another one is refused rather
// than sent to the site unfilled.
const TOKEN_VARIANTS = [
  { address: 'https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=abc&survey_code={Participant}', spelling: '{Participant}' },
  { address: 'https://example.org/done?code={PARTICIPANT}', spelling: '{PARTICIPANT}' },
  { address: 'https://example.org/done?code=%7Bparticipant%7D', spelling: '%7Bparticipant%7D' },
  { address: 'https://example.org/done?code=%7bparticipant}', spelling: '%7bparticipant}' },
  { address: 'https://example.org/done?a={participant}#b={Participant}', spelling: '{Participant}' },
  { address: 'https://example.org/done?code={participant%7D', spelling: '{participant%7D' },
  { address: 'https://example.org/done?code=%257Bparticipant%257D', spelling: '%257Bparticipant%257D' },
  { address: 'https://example.org/done?code={{participant}}', spelling: '{{participant}}' },
  // The URL encodes the spaces, and the message names the spelling so.
  { address: 'https://example.org/done?code={ participant }', spelling: '{%20participant%20}' },
];
for (const field of ['complete', 'completeSaved']) {
  for (const { address, spelling } of TOKEN_VARIANTS) {
    test(`a ${field} address holding ${spelling} after the ? or #, ${address.slice(8, 60)}…, is refused naming that spelling`, async ({ page }) => {
      await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g16', complete: COMPLETE_OK, [field]: address });
      await expect(refusalText(page)).toHaveText(
        `The study link's ${field} field could not be used: the {participant} token must be written exactly so, in lower case with one typed brace on each side and no space, and ${JSON.stringify(spelling)} is another spelling of it. The address is ${JSON.stringify(address)}.`,
      );
      await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    });
  }
}

// G17: an identifier with an unpaired surrogate cannot be written into a
// completion address (encodeURIComponent() throws on one), so the link is
// refused before the form starts. The test's encodeConfig() writes the
// surrogate as a \u escape in the JSON, which the page's JSON.parse() reads
// back as the lone code unit.
const HIGH = '\ud800';
const LOW = '\udc00';
const BROKEN_IDS = [
  ...[HIGH, LOW].flatMap((s) => [s, `${s}abc`, `ab${s}c`, `abc${s}`]),
  `${LOW}${HIGH}`,
  `${HIGH}\u{1F600}`,
];
for (const participant of BROKEN_IDS) {
  const shown = [...participant].map((ch) => (ch.length === 1 && /[\ud800-\udfff]/.test(ch) ? `\\u${ch.charCodeAt(0).toString(16)}` : ch)).join('');
  test(`a participant of "${shown}" is refused, and no form starts`, async ({ page }) => {
    await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant, complete: COMPLETE_OK });
    await expect(refusalText(page)).toHaveText(
      'The study link carries a participant identifier with a character that cannot be written.',
    );
    await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
    await expect(page.locator('fieldset.item')).toHaveCount(0);
  });
}

test('a participant holding a lone surrogate is refused with no completion address in the link', async ({ page }) => {
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: `ab${HIGH}c` });
  await expect(refusalText(page)).toHaveText(
    'The study link carries a participant identifier with a character that cannot be written.',
  );
  await expect(page.getByRole('button', { name: 'Begin' })).toHaveCount(0);
});

test('a participant holding a paired character is accepted and fills the completion address with its encoding', async ({ page }) => {
  await openForm(page, base(), {
    instrument: 'hitopbr', study: 'guard', participant: 'p\u{1F600}', complete: 'https://example.org/done?code={participant}',
  });
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
  await begin(page);
  const downloading = awaitDownload(page);
  await walkAll(page);
  await downloading;
  await expect(page.locator('p.complete a')).toHaveAttribute('href', 'https://example.org/done?code=p%F0%9F%98%80');
});

test('the unaltered export is accepted (the probes fail for their field, not for the copy)', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  await openForm(page, base(), { instrument: 'hitopbr', study: 'guard', participant: 'g3' }, {
    exportJson: exp,
  });
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  // The start screen holds an empty alert slot for the participant box; a
  // refusal would have filled it.
  await expect(page.locator('[role=alert]:not(:empty)')).toHaveCount(0);
});
