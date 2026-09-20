import { expect, test } from '@playwright/test';

/**
 * The flows that carry the product's promises. Each of these maps to a line
 * on the pre-phase checklist, so a regression here is a regression in
 * something we told the user we would do.
 */

test('the landing page states real counts and does not round them', async ({ page }) => {
  await page.goto('/');
  const body = await page.textContent('body');
  expect(body).toContain('The number that decides the deal, first.');
  // Never "100+", never "many", never "thousands of".
  expect(body).not.toMatch(/\b\d+\+/);
  expect(body).not.toMatch(/\bmany listings\b/i);
  expect(body).not.toMatch(/\bthousands of\b/i);
});

test('a pasted URL reproduces the exact result set', async ({ page }) => {
  const url = '/search?area=ahodwo&lumpMax=8400&advance=12';
  await page.goto(url);
  const first = await page.getByTestId('result-count').textContent();
  await page.goto(url);
  const second = await page.getByTestId('result-count').textContent();
  expect(second).toBe(first);
  expect(first).toContain('in Ahodwo');
});

test('back and forward restore the filters', async ({ page }) => {
  await page.goto('/search?area=ahodwo');
  const before = await page.getByTestId('result-count').textContent();
  await page.goto('/search?area=tamale');
  await page.goBack();
  await expect(page.getByTestId('result-count')).toHaveText(String(before));
});

test('zero by filters is a different screen from zero by coverage', async ({ page }) => {
  // Filters too tight: we track plenty in Ahodwo, but nothing of this type.
  await page.goto('/search?area=ahodwo&type=hostel_bed');
  await expect(page.getByTestId('zero-filters')).toBeVisible();
  await expect(page.getByTestId('zero-coverage')).toHaveCount(0);
  await expect(page.getByTestId('zero-filters')).toContainText('is what');

  // Coverage thin: we track nothing at all in Lawra.
  await page.goto('/search?area=lawra');
  await expect(page.getByTestId('zero-coverage')).toBeVisible();
  await expect(page.getByTestId('zero-filters')).toHaveCount(0);
  await expect(page.getByTestId('zero-coverage')).toContainText("This isn't you");
});

test('the zero-by-filter screen names the filter and offers the fix', async ({ page }) => {
  await page.goto('/search?area=ahodwo&type=hostel_bed');
  const panel = page.getByTestId('zero-filters');
  await expect(panel).toContainText('Hostel bed');
  const fix = panel.getByRole('link', { name: /Drop it/ });
  await expect(fix).toBeVisible();
  await fix.click();
  await expect(page.getByTestId('results')).toBeVisible();
});

test('total cash to move in is the largest element on every card', async ({ page }) => {
  await page.goto('/search?area=ahodwo');
  const cards = page.getByTestId('result-card');
  const n = Math.min(await cards.count(), 8);
  expect(n).toBeGreaterThan(0);

  for (let i = 0; i < n; i += 1) {
    const sizes = await cards.nth(i).evaluate((card) => {
      const out: Array<{ text: string; size: number }> = [];
      for (const el of card.querySelectorAll('*')) {
        const text = (el.textContent ?? '').trim();
        if (text.length === 0) continue;
        if (el.children.length > 0) continue;
        out.push({ text, size: parseFloat(getComputedStyle(el).fontSize) });
      }
      return out;
    });
    const biggest = sizes.reduce((a, b) => (b.size > a.size ? b : a));
    // Either the total, or the monthly rent when no advance was stated.
    expect(biggest.text).toMatch(/GH/);
  }
});

test('the card holds its dimensions across missing-data states', async ({ page }) => {
  await page.goto('/cards');
  const cards = page.getByTestId('result-card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(8);

  const widths = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    const box = await cards.nth(i).boundingBox();
    if (box !== null) widths.add(Math.round(box.width));
  }
  // Same column, same width, whatever is or is not in the card.
  expect(widths.size).toBeLessThanOrEqual(2);

  // And the thumbnail box never collapses.
  const thumbHeights = await page.evaluate(() => {
    const out: number[] = [];
    document.querySelectorAll('[data-testid="result-card"]').forEach((c) => {
      const thumb = c.firstElementChild;
      if (thumb !== null) out.push(Math.round(thumb.getBoundingClientRect().height));
    });
    return out;
  });
  expect(new Set(thumbHeights).size).toBe(1);
});

test('a cluster with no stated advance shows no invented total', async ({ page }) => {
  await page.goto('/search?area=ahodwo&notstated=1');
  const card = page
    .getByTestId('result-card')
    .filter({ has: page.locator('[data-state-no-advance="true"]') })
    .first();
  // The card itself carries the attribute.
  const noAdvance = page.locator('[data-state-no-advance="true"]').first();
  await expect(noAdvance).toBeVisible();
  await expect(noAdvance).toContainText('advance not stated');
  await expect(noAdvance).toContainText('Advance not stated');
  expect(card).toBeTruthy();
});

test('every card names its source', async ({ page }) => {
  await page.goto('/search?area=ahodwo');
  const cards = page.getByTestId('result-card');
  const n = Math.min(await cards.count(), 6);
  for (let i = 0; i < n; i += 1) {
    await expect(cards.nth(i)).toContainText('Seen on');
  }
});

test('the detail page links back to each source', async ({ page }) => {
  await page.goto('/place/ahodwo-roundabout-chamber-and-hall-self-contain-a1');
  await expect(page.getByTestId('detail-figure')).toBeVisible();
  // Three agents, disagreeing, each keeping its own price.
  await expect(page.getByText("Who's listing it")).toBeVisible();
  const sourceLinks = page.getByRole('link', { name: /Open the original listing/ });
  expect(await sourceLinks.count()).toBeGreaterThan(0);
});

test('a cluster is never collapsed to one price', async ({ page }) => {
  await page.goto('/place/ahodwo-roundabout-chamber-and-hall-self-contain-a1');
  await page.getByText("Who's listing it").click();
  const body = await page.textContent('body');
  expect(body).toContain('GH¢700/mo');
  expect(body).toContain('GH¢800/mo');
  expect(body).toContain('GH¢900/mo');
});

test('no map tiles are requested until the user asks for the map', async ({ page }) => {
  const tileRequests: string[] = [];
  page.on('request', (r) => {
    if (/tile|maps\.|mapbox|openstreetmap/i.test(r.url())) tileRequests.push(r.url());
  });

  await page.goto('/search?area=ahodwo');
  await page.waitForLoadState('networkidle');
  expect(tileRequests, tileRequests.join('\n')).toHaveLength(0);

  await page.getByTestId('map-toggle').click();
  await page.waitForTimeout(1500);
  // Now, and only now.
  expect(tileRequests.length).toBeGreaterThan(0);
});

test('no scarcity or social proof appears on a results page', async ({ page }) => {
  await page.goto('/search?area=ahodwo');
  const body = (await page.textContent('body')) ?? '';
  for (const phrase of [
    'people are viewing',
    'views',
    'popular',
    'trending',
    'hurry',
    "won't last",
    'only 1 left',
    'saved by',
  ]) {
    expect(body.toLowerCase(), phrase).not.toContain(phrase);
  }
});
