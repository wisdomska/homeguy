/*
 * HomeGuy service worker.
 *
 * Offline is real here, not a message. Research Dossier C6: 4,289 fibre
 * cuts in H1 2026, and outages spike cell-site failures up to 30%.
 *
 * Strategy:
 *   - shell and font: cache first, they never change within a deploy
 *   - /search and /place: network first, fall back to the last copy we hold
 *   - everything else: network, no caching
 *
 * Writes never come through here. Saving, noting, rating and discarding go
 * to IndexedDB and a sync queue (src/lib/shortlist.ts) so they succeed with
 * the radio off.
 */

const VERSION = 'hg-v1';
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

function isPage(url) {
  return url.pathname === '/search' || url.pathname.startsWith('/place/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache an analytics beacon or an API write.
  if (url.pathname.startsWith('/api/')) return;

  if (SHELL_ASSETS.includes(url.pathname) || url.pathname.startsWith('/fonts/')) {
    event.respondWith(
      caches.match(req).then((hit) => (hit === undefined ? fetch(req) : hit)),
    );
    return;
  }

  if (isPage(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => {
            if (hit !== undefined) return hit;
            return caches.match('/').then((shell) => {
              if (shell !== undefined) return shell;
              return new Response('Offline', { status: 503 });
            });
          }),
        ),
    );
  }
});
