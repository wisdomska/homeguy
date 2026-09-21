/*
 * HomeGuy service worker.
 *
 * Offline is real here, not a message. Research Dossier C6: 4,289 fibre
 * cuts in H1 2026, and outages spike cell-site failures up to 30%.
 *
 * Strategy:
 *   - shell and font: cache first, they never change within a deploy
 *   - any page navigation: network first, fall back to the last copy we hold
 *   - everything else: network, no caching
 *
 * Writes never come through here. Saving, noting, rating and discarding go
 * to IndexedDB and a sync queue (src/lib/shortlist.ts) so they succeed with
 * the radio off.
 */

const VERSION = 'hg-v5';
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;

const SHELL_ASSETS = ['/', '/fonts/space-grotesk-latin.woff2', '/homeguy-logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/*
 * Any same-origin page navigation is network-first with a cache fallback.
 *
 * The shortlist, the discard bucket and the last results are all things a
 * person has been working on for weeks; losing signal should show them what
 * we hold, not an error page.
 */
function isPage(url, request) {
  if (request !== undefined && request.mode === 'navigate') return true;
  return url.pathname === '/search' || url.pathname.startsWith('/place/');
}

/*
 * Cache the page the user is on right now.
 *
 * Without this, the first visit to a page is never cached — the worker
 * installs during that very load and so never intercepts it — and the user
 * has to come back a second time before the page survives losing signal.
 * On a connection that drops mid-visit, the second time may not happen.
 * The client asks for this as soon as the worker is in control.
 */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data === null || typeof data !== 'object' || data.type !== 'cache-page') return;
  const url = data.url;
  if (typeof url !== 'string') return;
  event.waitUntil(cachePageWithAssets(url).catch(() => undefined));
});

/*
 * Cache a page AND the build assets it needs to hydrate.
 *
 * Without the assets, an offline reload paints the server-rendered HTML and
 * stops: React never boots, so the shortlist, the note and the rating the
 * person just wrote are not read back out of IndexedDB and the page appears
 * to have forgotten them. The HTML alone is not the promise we made.
 */
async function cachePageWithAssets(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) return;

  const copy = res.clone();
  const html = await res.text();

  const assets = new Set();
  for (const m of html.matchAll(/["'(](\/_next\/static\/[^"')\s]+)["')]/g)) {
    if (m[1] !== undefined) assets.add(m[1]);
  }

  const shell = await caches.open(SHELL);
  await Promise.all(
    [...assets].map(async (path) => {
      const req = new Request(path, { credentials: 'same-origin' });
      const hit = await shell.match(req);
      if (hit !== undefined) return;
      try {
        const asset = await fetch(req);
        if (asset.ok) await shell.put(req, asset);
      } catch {
        // One missing chunk is not worth failing the rest.
      }
    }),
  );

  // The page goes in last, on purpose: its presence in this cache is the
  // signal that it can actually be served, and serving a page we cannot
  // hydrate would be worse than serving nothing.
  const pages = await caches.open(PAGES);
  await pages.put(new Request(url, { credentials: 'same-origin' }), copy);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache an analytics beacon or an API write.
  if (url.pathname.startsWith('/api/')) return;

  // Hashed build output is immutable, and a cached page is useless without
  // it: the HTML arrives, React never hydrates, and the saved state the user
  // came back for does not render.
  if (
    SHELL_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit !== undefined) return hit;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(req, copy));
          }
          return res;
        });
      }),
    );
    return;
  }

  if (isPage(url, req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreVary: true }).then((hit) => {
            if (hit !== undefined) return hit;
            return caches.match('/', { ignoreVary: true }).then((shell) => {
              if (shell !== undefined) return shell;
              return new Response('Offline', { status: 503 });
            });
          }),
        ),
    );
  }
});
