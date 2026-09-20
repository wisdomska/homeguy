'use client';

import { useEffect, useState } from 'react';
import { RESULTS } from '@/core/copy';
import { pendingCount } from '@/lib/shortlist';
import ui from './ui.module.css';
import styles from './OfflineBanner.module.css';

/**
 * Offline is a list, not an error page. Pass 1 - Search and
 * Results.dc.html:1023.
 *
 * The banner also says how many of the user's own changes are still queued,
 * because the promise being kept is that nothing they wrote is lost.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const sync = () => {
      setOffline(!navigator.onLine);
      void pendingCount().then(setQueued);
    };
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={styles.banner} role="status" data-testid="offline-banner">
      <OfflineIcon />
      <div>
        <div className={styles.head}>{RESULTS.offlineHead}</div>
        <div className={ui.caption}>{RESULTS.offlineBody}</div>
        {queued > 0 ? <div className={ui.caption}>{RESULTS.offlinePending(queued)}</div> : null}
      </div>
    </div>
  );
}

function OfflineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M5 12.5a11 11 0 015-2.8M2 8.8A16 16 0 018.5 5.6M15 10a11 11 0 014 2.5M12 18.5h.01"
        stroke="var(--dust-700)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
