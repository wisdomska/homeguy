/**
 * Verification. This is what makes "Seen 2 days ago" honest rather than
 * decorative.
 *
 * Two mechanisms, both of them narrow:
 *   1. a rolling background job that re-checks each listing's source URL on
 *      a schedule and updates lastVerifiedAt or marks it gone
 *   2. "Check these now", which re-verifies only the listings currently on
 *      the user's screen
 *
 * Neither is a crawl. Both use conditional GETs against URLs we already
 * hold, one host at a time, through the same polite fetcher as everything
 * else - so robots.txt, the 2s interval, the backoff and the 403 hard stop
 * all still apply.
 */

import { fetchPolitely } from './fetcher';
import { sourceConfig } from './config';
import type { ClusterView } from '@/core/types';

export type VerifyStatus = 'live' | 'gone' | 'skipped' | 'error';

export interface VerifyResult {
  clusterId: string;
  listingId: string;
  status: VerifyStatus;
  checkedAt: Date;
  reason: string | null;
}

/** Markers that a listing page is still there but the place is taken. */
const GONE_MARKERS = ['this advert has been removed', 'listing not found', 'no longer available', 'advert expired'];

export async function reverify(
  clusters: ClusterView[],
  options: { fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<VerifyResult[]> {
  const now = options.now ?? new Date();
  const out: VerifyResult[] = [];

  for (const c of clusters) {
    for (const l of c.listings) {
      const cfg = sourceConfig(l.sourceId);

      // A source that is switched off is not contacted at all, and neither
      // is one that never had a fetchable URL (an agent's own submission).
      if (cfg === null || !cfg.enabled || !l.sourceUrl.startsWith('http')) {
        out.push({
          clusterId: c.id,
          listingId: l.id,
          status: 'skipped',
          checkedAt: now,
          reason: cfg === null ? 'unknown_source' : cfg.enabled ? 'no_fetchable_url' : 'source_disabled',
        });
        continue;
      }

      const res = await fetchPolitely(l.sourceUrl, {
        fetchImpl: options.fetchImpl,
        ifModifiedSince: l.lastVerifiedAt.toUTCString(),
        maxRetries: 1,
      });

      if (res.status === 304) {
        out.push({ clusterId: c.id, listingId: l.id, status: 'live', checkedAt: now, reason: 'not_modified' });
        continue;
      }
      if (res.status === 404 || res.status === 410) {
        out.push({ clusterId: c.id, listingId: l.id, status: 'gone', checkedAt: now, reason: `http_${res.status}` });
        continue;
      }
      if (!res.ok || res.body === null) {
        out.push({
          clusterId: c.id,
          listingId: l.id,
          status: res.refusedReason === null ? 'error' : 'skipped',
          checkedAt: now,
          reason: res.refusedReason,
        });
        continue;
      }

      const lower = res.body.toLowerCase();
      const gone = GONE_MARKERS.some((m) => lower.includes(m));
      out.push({
        clusterId: c.id,
        listingId: l.id,
        status: gone ? 'gone' : 'live',
        checkedAt: now,
        reason: gone ? 'gone_marker' : null,
      });
    }
  }

  return out;
}
