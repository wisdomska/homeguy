/**
 * Labelled near-misses.
 *
 * Pass 1 - Search and Results.dc.html:870 "Low results" is the authority
 * here: when a search returns 1-5 results, the design does not pad the list
 * with silent almost-matches. It shows them under "Nothing else matched.
 * These are close:" and labels each one with the single reason it missed -
 * "GH¢150 over budget", "12-month advance, you set 6", "Adenta, not East
 * Legon".
 *
 * The Web file's over-budget section (Web.dc.html:1556-1564) is one case of
 * this. This module generalises it.
 */

import { formatMoney } from './money';
import { inTowns, passes, type Filters } from './filters';
import type { ClusterView } from './types';

export interface NearMiss {
  cluster: ClusterView;
  /** The one reason it missed, rendered verbatim on the card. */
  reason: string;
  kind: 'budget' | 'advance' | 'town' | 'type' | 'freshness' | 'attribute';
}

/**
 * Show near-misses only when the strict set is small enough that the user
 * has run out of real options. Pass 1:870 shows 3 matches then 3 near-misses.
 */
export const NEAR_MISS_TRIGGER = 6;
export const NEAR_MISS_LIMIT = 6;

export function nearMisses(
  all: ClusterView[],
  f: Filters,
  matched: ClusterView[],
  typeLabel: (t: string) => string,
): NearMiss[] {
  if (matched.length === 0) return [];
  if (matched.length >= NEAR_MISS_TRIGGER) return [];

  const matchedIds = new Set(matched.map((c) => c.id));
  const out: NearMiss[] = [];

  for (const c of all) {
    if (matchedIds.has(c.id)) continue;
    const miss = classify(c, f, typeLabel);
    if (miss !== null) out.push({ cluster: c, ...miss });
  }

  // Cheapest misses first - a GH¢150 overshoot is more useful than a 9km one.
  const rank: Record<NearMiss['kind'], number> = {
    budget: 0,
    advance: 1,
    town: 2,
    attribute: 3,
    type: 4,
    freshness: 5,
  };
  out.sort((a, b) => rank[a.kind] - rank[b.kind]);
  return out.slice(0, NEAR_MISS_LIMIT);
}

/**
 * A near-miss is a cluster that fails on exactly one axis. Anything failing
 * on two is not close, it is a different search.
 */
function classify(
  c: ClusterView,
  f: Filters,
  typeLabel: (t: string) => string,
): Omit<NearMiss, 'cluster'> | null {
  const reasons: Array<Omit<NearMiss, 'cluster'>> = [];

  // Budget: passes every filter but costs more than the lump sum.
  if (f.lumpMax !== null && passes(c, f) && c.totalToMoveInMin !== null) {
    if (c.totalToMoveInMin > f.lumpMax) {
      reasons.push({
        kind: 'budget',
        reason: `${formatMoney(c.totalToMoveInMin - f.lumpMax)} over budget`,
      });
    }
  }

  if (!inTowns(c, f.towns)) {
    const km = c.town.hubDistanceM === null ? null : Math.round(c.town.hubDistanceM / 100) / 10;
    reasons.push({
      kind: 'town',
      reason: km === null ? `${c.town.name}, not your area` : `${c.town.name}, ${km}km away`,
    });
  }

  if (f.advances.length > 0 && c.advanceMonthsMin !== null) {
    const stated = c.listings.map((l) => l.advanceMonths).filter((m): m is number => m !== null);
    if (!stated.some((m) => f.advances.includes(m))) {
      const theirs = stated[0];
      if (theirs !== undefined) {
        reasons.push({
          kind: 'advance',
          reason: `${theirs}-month advance, you set ${f.advances.join('/')}`,
        });
      }
    }
  }

  if (f.types.length > 0 && !f.types.includes(c.unitType)) {
    reasons.push({ kind: 'type', reason: `${typeLabel(c.unitType)}, not what you picked` });
  }

  if (f.seen === '7' && c.seenDaysAgo > 7) {
    reasons.push({ kind: 'freshness', reason: `Seen ${c.seenDaysAgo} days ago, you set 7` });
  }

  if (reasons.length !== 1) return null;
  return reasons[0] ?? null;
}
