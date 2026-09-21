'use client';

import { useEffect } from 'react';
import { drainQueue } from '@/lib/shortlist';

/**
 * Registers the service worker that caches the shell and the last result
 * set, and drains the sync queue whenever the connection comes back.
 * Research Dossier C6: the network genuinely fails here.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          // Cache the page we are on now, rather than waiting for a second
          // visit that a dropped connection may never allow.
          const tell = () => {
            const active = navigator.serviceWorker.controller;
            if (active !== null) {
              active.postMessage({ type: 'cache-page', url: window.location.href });
            }
          };
          tell();
          // On a first visit the worker only takes control after claim(),
          // which can land after ready resolves.
          navigator.serviceWorker.addEventListener('controllerchange', tell, {
            once: true,
          });
        })
        .catch(() => {
          // A failed registration is not an error the user needs to see.
        });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);

    const onOnline = () => void drainQueue();
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('load', onLoad);
      window.removeEventListener('online', onOnline);
    };
  }, []);
  return null;
}
