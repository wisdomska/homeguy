'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/**
 * The metrics this product lives or dies by.
 *
 * zero_results with its cause is the single most important number in the
 * app: a rising coverage-zero rate in a region is an ingestion problem, and
 * nothing else will tell us.
 *
 * None of this is ever rendered back to a user. No view counts, no save
 * counts, no "popular". Internal only.
 */
export function SearchTelemetry({
  townSlugs,
  filterCount,
  resultCount,
  zeroCause,
  nearMissCount,
  advanceNotStatedShown,
  shownCount,
  clusterSizes,
}: {
  townSlugs: string[];
  filterCount: number;
  resultCount: number;
  zeroCause: 'filters' | 'coverage' | null;
  nearMissCount: number;
  advanceNotStatedShown: number;
  shownCount: number;
  clusterSizes: number[];
}) {
  useEffect(() => {
    track('search_performed', {
      towns: townSlugs.join(',') || 'anywhere',
      filters: filterCount,
      results: resultCount,
    });

    if (resultCount === 0 && zeroCause !== null) {
      track('zero_results', { cause: zeroCause, towns: townSlugs.join(',') || 'anywhere' });
    }

    if (resultCount > 0 && resultCount <= 5) {
      track('low_results', { results: resultCount, nearMissShown: nearMissCount });
    }

    if (shownCount > 0) {
      track('advance_not_stated_rate', {
        shown: shownCount,
        notStated: advanceNotStatedShown,
      });
      const histogram: Record<string, number> = {};
      for (const n of clusterSizes) {
        const key = n >= 3 ? '3+' : String(n);
        histogram[key] = (histogram[key] ?? 0) + 1;
      }
      track('cluster_size_distribution', {
        single: histogram['1'] ?? 0,
        double: histogram['2'] ?? 0,
        triplePlus: histogram['3+'] ?? 0,
      });
    }
    // Fire once per rendered result set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultCount, zeroCause, townSlugs.join(',')]);

  return null;
}
