// The page walk: pages of 15, and no advancing past an unanswered item.
//
//   W1: every page but the last shows 15 items, and the last shows the
//       remainder (fewer than 15 when the item count is not a multiple of 15)
//   W2: on a full page, with the first, a middle and the last item left blank
//       in turn, pressing Next refuses each time, naming the blank item's
//       position on the page, and the page does not advance; once the item is
//       answered, Next advances
//   W3: on the last page, with one item left blank, Finish refuses naming it;
//       once answered, Finish reaches the done screen
//
// Walked for the full HiTOP-BR (45 items, three full pages) and the shuffled
// module fixture (21 items: one full page and a last page of six).

import { test, expect } from '@playwright/test';
import {
  useTarget, openForm, begin, answerPage, readItems, nextButton, currentPage,
  fetchExport, readDescriptor, PAGE_SIZE,
} from './helpers.mjs';

const base = useTarget();

function refusal(k) {
  return `Please answer item ${k} on this page before continuing.`;
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
      for (const k of probes) {
        await nextButton(page).click();
        await expect(page.locator('[role=alert]')).toHaveText(refusal(k));
        expect(await currentPage(page), 'did not advance').toEqual({ page: 1, of: pages });
        await answerOne(page, k);
      }
    } else if (p === pages) {
      // W3: one item of the last page.
      const k = lastCount;
      await answerPage(page, { skip: [k] });
      await nextButton(page).click();
      await expect(page.locator('[role=alert]')).toHaveText(refusal(k));
      expect(await currentPage(page), 'did not advance').toEqual({ page: p, of: pages });
      await answerOne(page, k);
    } else {
      await answerPage(page);
    }

    await expect(nextButton(page)).toHaveText(p === pages ? 'Finish' : 'Next');
    await nextButton(page).click();
    if (p < pages) {
      await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${pages}`);
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
