'use client';

import { useEffect, useState } from 'react';
import type { CardModel } from '@/core/cardModel';

export interface CompareRow {
  name: string;
  cashToMoveIn: string | null;
  monthly: string;
  advance: string | null;
  type: string;
  water: string | null;
  meter: string | null;
  toilet: string | null;
}

export interface ClusterPayload {
  card: CardModel;
  compare: CompareRow;
}

const cache = new Map<string, ClusterPayload>();

/**
 * Hydrate cluster detail for ids the browser already holds.
 *
 * Results are cached in memory and, once fetched, the service worker's page
 * cache keeps the shortlist readable offline too - which is the whole point
 * of a shortlist on a months-long search.
 */
export function useClusters(ids: string[]): {
  clusters: ClusterPayload[];
  loading: boolean;
  offline: boolean;
} {
  const key = ids.join(',');
  const [clusters, setClusters] = useState<ClusterPayload[]>([]);
  const [loading, setLoading] = useState(ids.length > 0);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (ids.length === 0) {
      setClusters([]);
      setLoading(false);
      return;
    }

    const cached = ids.map((id) => cache.get(id)).filter((c): c is ClusterPayload => c !== undefined);
    if (cached.length === ids.length) {
      setClusters(cached);
      setLoading(false);
      return;
    }

    let live = true;
    setLoading(true);
    fetch(`/api/clusters?ids=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: { clusters: ClusterPayload[] }) => {
        if (!live) return;
        for (const c of d.clusters) cache.set(c.card.id, c);
        setClusters(d.clusters);
        setOffline(false);
      })
      .catch(() => {
        if (!live) return;
        // Offline: show whatever we already hold rather than an error page.
        setClusters(cached);
        setOffline(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { clusters, loading, offline };
}
