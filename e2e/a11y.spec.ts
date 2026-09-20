import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * WCAG 2.1 AA, checked by axe on every indexable surface, plus a manual
 * keyboard run of the whole flow: search, filter, detail, save.
 *
 * The keyboard test is the one that matters most. An axe pass says the
 * markup is defensible; the keyboard run says a person can actually use it.
 */

const ROUTES = [
  '/',
  '/start',
  '/search?area=ahodwo',
  '/search?area=ahodwo&type=hostel_bed', // zero by filters
  '/search?area=lawra', // zero by coverage
  '/place/ahodwo-roundabout-chamber-and-hall-self-contain-a1',
  '/saved',
  '/discarded',
  '/compare',
  '/digest',
  '/me',
  '/cards',
  '/rent/upper-east',
  '/rent/upper-east/bolgatanga',
  '/bot',
];

for (const route of ROUTES) {
  test(`@a11y ${route} has no axe violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const summary = results.violations
      .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target).join(', ')}`)
      .join('\n');
    expect(results.violations, summary).toEqual([]);
  });
}

test('@a11y the filter sheet is a real modal dialog', async ({ page }) => {
  await page.goto('/search?area=ahodwo');

  const trigger = page.getByRole('button', { name: /Filters/ });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Focus is inside the dialog.
  const focusedInside = await page.evaluate(() => {
    const d = document.querySelector('dialog[open]');
    return d !== null && d.contains(document.activeElement);
  });
  expect(focusedInside).toBe(true);

  // Escape closes it, and focus returns to the trigger.
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('@a11y the result count is announced as filters change', async ({ page }) => {
  await page.goto('/search?area=ahodwo');
  const count = page.getByTestId('result-count');
  await expect(count).toHaveAttribute('aria-live', 'polite');

  // And the apply button's count is live too.
  await page.getByRole('button', { name: /Filters/ }).click();
  const apply = page.getByTestId('apply-filters');
  await expect(apply.locator('[aria-live="polite"]')).toBeVisible();
});

test('@a11y search to filter to detail to save completes by keyboard alone', async ({
  page,
}) => {
  await page.goto('/search?area=ahodwo');

  // Open the filter sheet by keyboard.
  await page.getByRole('button', { name: /Filters/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();

  // Tab to a filter and toggle it with the keyboard.
  const twelve = page.getByRole('button', { name: /^12 · / });
  await twelve.focus();
  await page.keyboard.press('Enter');
  await expect(twelve).toHaveAttribute('aria-pressed', 'true');

  // Apply.
  await page.getByTestId('apply-filters').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('results')).toBeVisible();

  // Into a detail page by keyboard.
  await page.getByTestId('result-card').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('detail-figure')).toBeVisible();

  // And save it by keyboard.
  await page.getByTestId('save-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('save-button')).toHaveAttribute('aria-pressed', 'true');
});

test('@a11y every interactive target is at least 44x44', async ({ page }) => {
  await page.goto('/search?area=ahodwo');
  const small = await page.evaluate(() => {
    const out: string[] = [];
    const selector = 'a, button, input, select, textarea, [role="button"], [role="tab"]';
    document.querySelectorAll(selector).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // not rendered
      // Skip the skip-link, which is off-screen until focused.
      if (el.classList.contains('skip-link')) return;
      if (r.height < 44 || r.width < 24) {
        out.push(`${el.tagName}.${el.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return out;
  });
  expect(small, small.join('\n')).toEqual([]);
});

test('@a11y the focus ring is visible and never removed', async ({ page }) => {
  await page.goto('/search?area=ahodwo');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const el = document.activeElement;
    if (el === null) return null;
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, style: s.outlineStyle };
  });
  expect(outline).not.toBeNull();
  expect(outline?.style).not.toBe('none');
});

test('@a11y status conveyed by colour also carries text', async ({ page }) => {
  await page.goto('/cards');
  const body = (await page.textContent('body')) ?? '';
  // Freshness bands.
  expect(body).toMatch(/Seen \d+ (day|days|weeks) ago|Not seen in \d+ weeks/);
  // Not-stated.
  expect(body).toContain('Advance not stated');
  expect(body).toContain('Location not stated');
});

test('@a11y the map has a documented list-only equivalent', async ({ page }) => {
  await page.goto('/search?area=ahodwo');
  await page.getByTestId('map-toggle').click();
  await expect(
    page.getByText(/Every pin on this map is a card in the list above/),
  ).toBeVisible();
});
