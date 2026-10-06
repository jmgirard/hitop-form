// The online form's host and the length of path and query it accepts.
//
//   H1: on the deployed page, on requests the host's cache does not answer,
//       a path and query of HOST_AT + 1 characters is refused with 400 or
//       414, and one of HOST_AT characters is answered 200
//
// The Study Link Builder refuses a link whose count passes HOST_PATH_MAX
// (link.html), which rests on a measurement of GitHub Pages (hitop's
// cairn/references/fastly2026limits.md). Fastly serves the page from a cache
// whose key leaves out the query, and a cached page answers longer links
// than GitHub's server does. So H1 asks for the page under a path no
// visitor uses, `/hitop-form/` and a run of slashes before `index.html`,
// which the cache has not stored. A refusal is not cached, so the longer
// request goes first and the shorter one is still a miss.
//
// H1 runs on the weekly and manual runs, when FORM_TARGET names the
// deployed page, so a change at the host turns the run red. Against the
// checkout on localhost there is no host to measure, and H1 is skipped.

import { test, expect, HOST_AT } from './helpers.mjs';

// The page under a path of `slashes` extra slashes, with ?c= and a run of
// `A` characters, so that its path and query are `length` characters long.
function hostUrl(target, slashes, length) {
  const url = new URL(target);
  const head = `${url.pathname}${'/'.repeat(slashes)}index.html?c=`;
  return `${url.origin}${head}${'A'.repeat(length - head.length)}`;
}

test('H1: on a cache miss the deployed host refuses one character past HOST_AT, and answers HOST_AT', async ({ request }) => {
  const target = process.env.FORM_TARGET?.trim();
  test.skip(!target, 'the host is measured only when FORM_TARGET names the deployed page');
  // A run of 40 to 1,039 slashes, new on each run.
  const slashes = 40 + Math.floor(Math.random() * 1_000);
  for (const [length, ok] of [[HOST_AT + 1, false], [HOST_AT, true]]) {
    const href = hostUrl(target, slashes, length);
    expect(href.slice(new URL(href).origin.length), `the path and query of ${length}`).toHaveLength(length);
    const response = await request.get(href, { maxRedirects: 0 });
    const cache = response.headers()['x-cache'];
    expect(cache, `the cache's answer at ${length}`).not.toBe('HIT');
    if (ok) {
      expect(response.status(), `the host's answer to ${length} characters`).toBe(200);
    } else {
      expect([400, 414], `the host's answer to ${length} characters`).toContain(response.status());
    }
  }
});
