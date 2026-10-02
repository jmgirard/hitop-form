// The page walk: pages of 15, and no advancing past an unanswered item.
//
//   W1: every page but the last shows 15 items, and the last shows the
//       remainder (fewer than 15 when the item count is not a multiple of 15)
//   W2: on a full page, with the first, a middle and the last item left
//       blank and then answered in turn, pressing Next refuses each time,
//       marking the items still blank and no other and counting them, and
//       the page does not advance; once all are answered, Next advances
//   W3: on the last page, with one item left blank, Finish refuses marking
//       it; once answered, Finish reaches the done screen
//
// Walked for the full HiTOP-BR (45 items, three full pages) and the shuffled
// module fixture (21 items: one full page and a last page of six).

import {
  test, expect, useTarget, openForm, begin, answerPage, readItems, nextButton, currentPage,
  fetchExport, readDescriptor, PAGE_SIZE,
} from './helpers.mjs';

const base = useTarget();

// A refusal of the blank items at places `ks` on the page: the count's
// text, and the mark inside each of them and no other item.
async function expectRefused(page, ks) {
  await expect(page.locator('[role=alert]')).toHaveText(
    ks.length === 1 ? '1 item on this page has no answer yet.' : `${ks.length} items on this page have no answer yet.`,
  );
  const marked = await page.$$eval('fieldset.item', (nodes) => nodes.map((n, i) => (n.querySelector('.missed') ? i + 1 : null)).filter((i) => i !== null));
  expect(marked, 'the items marked').toEqual(ks);
  for (const k of ks) await expect(page.locator('fieldset.item').nth(k - 1).locator('.missed')).toHaveText('Please answer this item');
}

async function answerOne(page, k) {
  const item = page.locator('fieldset.item').nth(k - 1);
  await item.locator('input[type=radio]').first().check();
}

async function walk(page, itemCount) {
  const pages = Math.ceil(itemCount / PAGE_SIZE);
  const lastCount = itemCount - PAGE_SIZE * (pages - 1);
  expect(lastCount, 'the last page is partial or full, never empty').toBeGreaterThan(0);

  for (let p = 1; p <= pages; p++) {
    expect(await currentPage(page)).toEqual({ page: p, of: pages });
    const items = await readItems(page);
    // W1
    expect(items.length, `items on page ${p}`).toBe(p < pages ? PAGE_SIZE : lastCount);
    expect(items.map((it) => it.position)).toEqual(items.map((_, i) => PAGE_SIZE * (p - 1) + i + 1));

    if (p === 1) {
      // W2: first, middle and last of a full page, blank in turn.
      const probes = [1, 8, PAGE_SIZE];
      await answerPage(page, { skip: probes });
      for (const [i, k] of probes.entries()) {
        await nextButton(page).click();
        await expectRefused(page, probes.slice(i));
        expect(await currentPage(page), 'did not advance').toEqual({ page: 1, of: pages });
        // The named item's first option holds focus after a refusal.
        await expect(page.locator('fieldset.item').nth(k - 1).locator('input[type=radio]').first()).toBeFocused();
        await answerOne(page, k);
      }
    } else if (p === pages) {
      // W3: one item of the last page.
      const k = lastCount;
      await answerPage(page, { skip: [k] });
      await nextButton(page).click();
      await expectRefused(page, [k]);
      expect(await currentPage(page), 'did not advance').toEqual({ page: p, of: pages });
      await answerOne(page, k);
    } else {
      await answerPage(page);
    }

    await expect(nextButton(page)).toHaveText(p === pages ? 'Finish' : 'Next');
    await nextButton(page).click();
    if (p < pages) {
      await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${pages}`);
      // Each new page starts with focus on its heading, not on the document.
      await expect(page.locator('h1')).toBeFocused();
    }
  }
  await expect(page.locator('h1')).toHaveText('Thank you');
  await expect(page.locator('.filename')).toBeVisible();
}

test('HiTOP-BR: pages of 15 and a refusal on every blank item probed', async ({ page }) => {
  const exp = await fetchExport('hitopbr');
  expect(exp.items.length % PAGE_SIZE, 'three full pages').toBe(0);
  await openForm(page, base(), { instrument: 'hitopbr', study: 'walk', participant: 'w1' });
  await begin(page);
  await walk(page, exp.items.length);
});

test('shuffled module: a partial last page and a refusal on every blank item probed', async ({ page }) => {
  const module = await readDescriptor('module-shuffled.json');
  const n = module.itemOrder.length;
  expect(n % PAGE_SIZE, 'not a multiple of 15').not.toBe(0);
  expect(n, 'more than one page').toBeGreaterThan(PAGE_SIZE);
  await openForm(page, base(), { instrument: module.instrument, study: 'walk', module });
  await begin(page, 'w2');
  await walk(page, n);
});
