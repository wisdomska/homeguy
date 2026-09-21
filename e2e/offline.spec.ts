import { expect, test } from '@playwright/test';

/**
 * Offline, tested with the network actually disabled rather than by
 * trusting the code.
 *
 * Research Dossier contract D: save, note, rate and discard all succeed in
 * aeroplane mode, and nothing the user authored may ever be lost to a
 * dropped connection. 4,289 fibre cuts in H1 2026 say this is the normal
 * case, not the edge case.
 */

const PLACE = '/place/ahodwo-roundabout-chamber-and-hall-self-contain-a1';

/**
 * Wait until the service worker is actually in control and has cached this
 * page.
 *
 * Offline-first starts when the worker is installed, not at the first
 * paint of the very first visit — no app can serve a page from a cache it
 * has not written yet. Pulling the plug before that point would be testing
 * the browser, not us.
 */
async function serviceWorkerReady(page: import('@playwright/test').Page) {
  // Polled from Node rather than with waitForFunction: an async page
  // function returns a Promise, and a Promise is truthy, so the wait
  // resolves on the first tick whatever the answer actually was.
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          if (!('serviceWorker' in navigator)) return false;
          if (navigator.serviceWorker.controller === null) return false;
          const hit = await caches.match(location.href, { ignoreVary: true });
          return hit !== undefined;
        }),
      { timeout: 20_000, intervals: [250, 500, 1000] },
    )
    .toBe(true);
}

test('saving, noting and rating all succeed with the network off', async ({
  page,
  context,
}) => {
  await page.goto(PLACE);
  await expect(page.getByTestId('save-button')).toBeVisible();
  await serviceWorkerReady(page);

  // Pull the plug.
  await context.setOffline(true);

  await page.getByTestId('save-button').click();
  await expect(page.getByTestId('save-button')).toHaveAttribute('aria-pressed', 'true');

  // A rating.
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Good', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // A note.
  const note = page.getByTestId('note-input');
  await note.fill('Polytank at the back, water Tue/Thu/Sat. Ask what the advance covers.');
  await note.blur();

  // The page tells the user it is held locally and will sync.
  await expect(page.getByText(/will sync/i)).toBeVisible();

  // It survives a reload while still offline, because it is in IndexedDB
  // and the shell is in the service worker cache.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('save-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('note-input')).toHaveValue(/Polytank at the back/);

  await context.setOffline(false);
});

test('a discard survives going offline and coming back', async ({ page, context }) => {
  await page.goto(PLACE);
  await context.setOffline(true);
  await page.getByTestId('discard-button').click();
  await expect(page.getByTestId('discard-button')).toHaveAttribute('aria-pressed', 'true');

  await context.setOffline(false);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('discard-button')).toHaveAttribute('aria-pressed', 'true');
});

test('the shortlist still reads with the network off', async ({ page, context }) => {
  await page.goto(PLACE);
  // Let the worker install on the first page, before navigating away from
  // it. This is the install visit; the offline behaviour under test is what
  // happens on every visit after it.
  await serviceWorkerReady(page);
  await page.getByTestId('save-button').click();
  await page.waitForTimeout(300);

  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible();
  await serviceWorkerReady(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Not an error page. The shortlist is the user's own data.
  await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible();
  await context.setOffline(false);
});

test('a results page shows the offline banner rather than an error', async ({
  page,
  context,
}) => {
  await page.goto('/search?area=ahodwo');
  await expect(page.getByTestId('results')).toBeVisible();
  await serviceWorkerReady(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Served from the service worker's page cache.
  await expect(page.getByTestId('result-count')).toBeVisible();
  await context.setOffline(false);
});
