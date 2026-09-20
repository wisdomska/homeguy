/**
 * Coverage and the two zero states.
 *
 * Ported from HomeGuy Web.dc.html:1296 (trackedHere), 1298-1306 (the
 * blocking-filter search), 1331 (thin pill), 1565-1573 (thin / zeroFilter /
 * zeroCoverage).
 *
 * The distinction this module exists to make: a screen with no results
 * because the user's filters are too tight is a different screen, with
 * different copy and a different fix, from one with no results because
 * HomeGuy tracks nothing there. Conflating them blames the user for our
 * ingestion gap.
 */

import { EMPTY_FILTERS, type Filters, inTowns, matching } from './filters';
import type { ClusterView } from './types';

/** A town with fewer than this many clusters carries the "thin coverage" pill. Web.dc.html:1331 */
export const THIN_TOWN_THRESHOLD = 5;
/** A result set smaller than this shows the thin-coverage block. Web.dc.html:1565 */
export const THIN_RESULTS_THRESHOLD = 6;

export type ZeroCause = 'filters' | 'coverage';

export interface CoverageVerdict {
  /** Clusters in the chosen towns, ignoring every other filter. Web.dc.html:1296 */
  trackedHere: number;
  resultCount: number;
  zero: boolean;
  /** Only meaningful when `zero`. This is what analytics records. */
  cause: ZeroCause | null;
  thin: boolean;
}

export function assessCoverage(
  all: ClusterView[],
  f: Filters,
  matched: ClusterView[],
): CoverageVerdict {
  const trackedHere = all.filter((c) => inTowns(c, f.towns)).length;
  const resultCount = matched.length;
  const zero = resultCount === 0;
  return {
    trackedHere,
    resultCount,
    zero,
    cause: zero ? (trackedHere > 0 ? 'filters' : 'coverage') : null,
    thin: resultCount > 0 && resultCount < THIN_RESULTS_THRESHOLD,
  };
}

export interface BlockingFilter {
  /** Human name of the filter, used verbatim in copy. */
  name: string;
  /** How many results dropping it alone would find. */
  count: number;
  /** The filter set with that one filter dropped. */
  relaxed: Filters;
}

/**
 * Web.dc.html:1298-1306. Try dropping each active filter on its own; keep
 * whichever single relaxation yields the most results. Returns null when no
 * single filter unblocks anything.
 */
export function findBlockingFilter(
  all: ClusterView[],
  f: Filters,
  typeLabel: (t: string) => string,
): BlockingFilter | null {
  const trials: Array<{ name: string; relaxed: Filters }> = [];

  if (f.types.length > 0) {
    trials.push({ name: f.types.map(typeLabel).join(', '), relaxed: { ...f, types: [] } });
  }
  if (f.advances.length > 0) {
    trials.push({
      name: `${f.advances.join('/')}-month advance`,
      relaxed: { ...f, advances: [] },
    });
  }
  if (f.seen !== 'any') {
    trials.push({ name: 'the freshness filter', relaxed: { ...f, seen: 'any' } });
  }
  if (!f.includeNotStated) {
    trials.push({
      name: 'excluding not-stated advances',
      relaxed: { ...f, includeNotStated: true },
    });
  }
  if (f.monthlyMax !== null) {
    trials.push({ name: 'the monthly rent cap', relaxed: { ...f, monthlyMax: null } });
  }
  if (f.water.length > 0) {
    trials.push({ name: 'the water source filter', relaxed: { ...f, water: [] } });
  }
  if (f.meter.length > 0) {
    trials.push({ name: 'the meter filter', relaxed: { ...f, meter: [] } });
  }
  if (f.polytank) trials.push({ name: 'requiring a polytank', relaxed: { ...f, polytank: false } });
  if (f.privateToilet) {
    trials.push({ name: 'requiring a private toilet', relaxed: { ...f, privateToilet: false } });
  }
  if (f.gated) trials.push({ name: 'requiring a gated compound', relaxed: { ...f, gated: false } });

  let best: BlockingFilter | null = null;
  for (const t of trials) {
    const count = matching(all, t.relaxed).length;
    if (count > (best === null ? 0 : best.count)) {
      best = { name: t.name, count, relaxed: t.relaxed };
    }
  }
  return best;
}

/** Count of clusters in a town, ignoring all filters. Web.dc.html:1226 */
export function townCount(all: ClusterView[], townSlug: string): number {
  return all.filter((c) => c.town.slug === townSlug).length;
}

/** Clusters we track in nearby towns, for the zero-by-coverage table. Pass 1:820 */
export function nearbyCoverage(
  all: ClusterView[],
  townSlugs: string[],
  limit = 3,
): Array<{ townName: string; townSlug: string; count: number; distanceKm: number | null }> {
  const chosen = new Set(townSlugs);
  const byTown = new Map<string, { name: string; count: number; distanceM: number | null }>();
  for (const c of all) {
    if (chosen.has(c.town.slug)) continue;
    const row = byTown.get(c.town.slug);
    if (row === undefined) {
      byTown.set(c.town.slug, {
        name: c.town.name,
        count: 1,
        distanceM: c.town.hubDistanceM,
      });
    } else {
      row.count += 1;
    }
  }
  return [...byTown.entries()]
    .map(([slug, v]) => ({
      townSlug: slug,
      townName: v.name,
      count: v.count,
      distanceKm: v.distanceM === null ? null : Math.round(v.distanceM / 100) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export { EMPTY_FILTERS };
