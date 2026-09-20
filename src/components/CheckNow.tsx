'use client';

import { useState } from 'react';
import { RESULTS } from '@/core/copy';
import { track } from '@/lib/analytics';
import ui from './ui.module.css';

/**
 * "Check these now" - the one place real-time verification legitimately
 * lives.
 *
 * This re-checks only the listings already on screen: twenty conditional
 * requests against pages we already hold URLs for, not a crawl of the
 * internet. Fast, cheap, lawful, and it gives the user the live freshness
 * they actually want without turning search into a fan-out scraper.
 *
 * Rate-limited per user on the server.
 */
export function CheckNow({ clusterIds }: { clusterIds: string[] }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'limited'>('idle');
  const [checked, setChecked] = useState(0);

  if (clusterIds.length === 0) return null;

  const run = async () => {
    setState('busy');
    track('check_now_used', { count: clusterIds.length });
    try {
      const res = await fetch('/api/check-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterIds }),
      });
      if (res.status === 429) {
        setState('limited');
        return;
      }
      const data: { checked: number } = await res.json();
      setChecked(data.checked);
      setState('done');
    } catch {
      setState('idle');
    }
  };

  return (
    <span>
      <button
        className={ui.btnTertiary}
        type="button"
        onClick={run}
        disabled={state === 'busy'}
        data-testid="check-now"
      >
        {state === 'busy' ? RESULTS.checkNowBusy : RESULTS.checkNow}
      </button>
      <span className={ui.caption} role="status">
        {state === 'done' ? ` ${RESULTS.checkNowDone(checked)}` : null}
        {state === 'limited' ? ` ${RESULTS.checkNowLimited}` : null}
      </span>
    </span>
  );
}
