// The item card's layout: a wrapped item's text stays inside its card.
//
// A legend is drawn in a fieldset's border notch, with the border at the
// legend's vertical middle. Before this spec, an item whose text wrapped had
// the border line running between its lines and the text spilling past the
// card's right edge. The page now floats the legend at full width, so it
// renders as a block inside the card under an unbroken border.
//
//   Y1: on every page of the HiTOP-SR and of the PID-5, at 320 px, 375 px
//       and Playwright's default width, each item's legend box lies inside
//       its fieldset's padding box on all four sides (within 0.5 px), and
//       the legend's text does not overflow its own box (scrollWidth at most
//       clientWidth); at least one legend per walk is taller than one line,
//       so the wrapped case is what is measured
//   Y2: every item on the first page of each of the five forms is found by
//       its accessible name, "<position>. <text>", as an exact match
//   Y3: after Next is refused on a page with a blank item, that item's
//       fieldset has the error colour on all four borders and its legend
//       still meets Y1, so the highlight is one unbroken box

import { test, expect } from '@playwright/test';
import { useTarget, openForm, begin, answerPage, nextButton, currentPage, fetchExport } from './helpers.mjs';

const base = useTarget();

const WIDTHS = [
  { name: '320 px', size: { width: 320, height: 800 } },
  { name: '375 px', size: { width: 375, height: 812 } },
  { name: 'the default width', size: null },
];

// The geometry of every item on the current page, read in one evaluation.
function measureItems(page) {
  return page.$$eval('fieldset.item', (nodes) =>
    nodes.map((fs) => {
      const legend = fs.querySelector('legend');
      const f = fs.getBoundingClientRect();
      const l = legend.getBoundingClientRect();
      const cs = getComputedStyle(fs);
      const px = (v) => parseFloat(cs.getPropertyValue(v));
      return {
        number: fs.dataset.number,
        position: fs.dataset.position,
        inner: {
          top: f.top + px('border-top-width') + px('padding-top'),
          left: f.left + px('border-left-width') + px('padding-left'),
          right: f.right - px('border-right-width') - px('padding-right'),
          bottom: f.bottom - px('border-bottom-width') - px('padding-bottom'),
        },
        legend: { top: l.top, left: l.left, right: l.right, bottom: l.bottom, height: l.height },
        overflow: legend.scrollWidth > legend.clientWidth,
        lineHeight: parseFloat(getComputedStyle(legend).lineHeight),
        borders: [
          cs.getPropertyValue('border-top-color'),
          cs.getPropertyValue('border-right-color'),
          cs.getPropertyValue('border-bottom-color'),
          cs.getPropertyValue('border-left-color'),
        ],
      };
    }),
  );
}

const TOLERANCE = 0.5;

function expectInside(m, label) {
  expect(m.legend.top, `${label}: legend top`).toBeGreaterThanOrEqual(m.inner.top - TOLERANCE);
  expect(m.legend.left, `${label}: legend left`).toBeGreaterThanOrEqual(m.inner.left - TOLERANCE);
  expect(m.legend.right, `${label}: legend right`).toBeLessThanOrEqual(m.inner.right + TOLERANCE);
  expect(m.legend.bottom, `${label}: legend bottom`).toBeLessThanOrEqual(m.inner.bottom + TOLERANCE);
  expect(m.overflow, `${label}: legend text overflows its box`).toBe(false);
}

// Y1
for (const instrument of ['hitopsr', 'pid5']) {
  for (const width of WIDTHS) {
    test(`${instrument}: every legend sits inside its card at ${width.name}`, async ({ page }) => {
      if (width.size) await page.setViewportSize(width.size);
      await openForm(page, base(), { instrument, study: 'layout', participant: 'y1' });
      await begin(page);
      let wrapped = 0;
      for (;;) {
        const { page: p, of } = await currentPage(page);
        const measured = await measureItems(page);
        expect(measured.length, `items on page ${p}`).toBeGreaterThan(0);
        for (const m of measured) {
          expectInside(m, `${instrument} item ${m.number} (position ${m.position}) on page ${p}`);
          if (m.legend.height > m.lineHeight * 1.5) wrapped += 1;
        }
        if (p === of) break;
        await answerPage(page);
        await nextButton(page).click();
        await expect(page.locator('.progress')).toHaveText(`Page ${p + 1} of ${of}`);
      }
      expect(wrapped, 'legends taller than one line').toBeGreaterThan(0);
    });
  }
}

// Y2
for (const instrument of ['hitopsr', 'hitopbr', 'pid5', 'pid5sf', 'pid5bf']) {
  test(`${instrument}: each item on the first page is a group named by its position and text`, async ({ page }) => {
    const exp = await fetchExport(instrument);
    await openForm(page, base(), { instrument, study: 'layout', participant: 'y2' });
    await begin(page);
    const count = await page.locator('fieldset.item').count();
    expect(count, 'items on the first page').toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const it = exp.items[i];
      const group = page.getByRole('group', { name: `${i + 1}. ${it.text}`, exact: true });
      await expect(group, `item ${it.number}`).toHaveCount(1);
      await expect(group).toHaveAttribute('data-number', String(it.number));
    }
  });
}

// Y3
test('a refused blank item is highlighted as one unbroken box', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openForm(page, base(), { instrument: 'hitopsr', study: 'layout', participant: 'y3' });
  await begin(page);
  const blank = 3;
  await answerPage(page, { skip: [blank] });
  await nextButton(page).click();
  await expect(page.locator('[role=alert]')).toContainText(`item ${blank} on this page`);
  const measured = await measureItems(page);
  const m = measured[blank - 1];
  const errorColour = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--error)';
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  expect(m.borders, 'the four border colours').toEqual([errorColour, errorColour, errorColour, errorColour]);
  expectInside(m, 'the refused item');
  // A control: an answered item on the same page keeps the ordinary border.
  expect(measured[0].borders[0], 'an answered item\'s top border').not.toBe(errorColour);
});
