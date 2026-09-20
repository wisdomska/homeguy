/**
 * Filtering. Ported from HomeGuy Web.dc.html:1227-1239 (inTowns, pass,
 * matching) and widened to the five filter sections the mobile spine
 * specifies (Pass 1 - Search and Results.dc.html:1140-1291), which the
 * brief makes the authority on states.
 *
 * THIS FILE IS IN THE ADVANCE PATH (the includeNotStated branch).
 * No defaults. See src/core/money.ts for the rule.
 */

import type { ClusterView, MeterArrangement, UnitType, WaterSource } from './types';
import type { Pesewas } from './types';

export type Freshness7or30 = '7' | '30' | 'any';

export interface Filters {
  /** Town slugs. Empty means anywhere in Ghana. */
  towns: string[];
  /** Max total cash to move in. null means no maximum. */
  lumpMax: Pesewas | null;
  /** Max monthly rent. null means no maximum. */
  monthlyMax: Pesewas | null;
  types: UnitType[];
  /** Exact advance terms in months. Empty means any stated term. */
  advances: number[];
  /**
   * Clusters whose advance is not stated are excluded from a strict match
   * unless this is on. Research Dossier §12 contract B: never silently
   * hidden, always offered as a labelled group.
   */
  includeNotStated: boolean;
  seen: Freshness7or30;
  /** "What has to work" - attribute requirements. */
  water: WaterSource[];
  polytank: boolean;
  meter: MeterArrangement[];
  privateToilet: boolean;
  gated: boolean;
}

export const EMPTY_FILTERS: Filters = {
  towns: [],
  lumpMax: null,
  monthlyMax: null,
  types: [],
  advances: [],
  includeNotStated: false,
  seen: 'any',
  water: [],
  polytank: false,
  meter: [],
  privateToilet: false,
  gated: false,
};

/**
 * Web.dc.html:1227
 * A cluster is "in" the town set when it is in one of the chosen towns, or
 * its town hangs off one of them as a hub. The hub fallback is how a
 * Bantama result reaches an Ahodwo search.
 */
export function inTowns(c: ClusterView, townSlugs: string[]): boolean {
  if (townSlugs.length === 0) return true;
  if (townSlugs.includes(c.town.slug)) return true;
  const hub = c.town.hubTownId;
  if (hub === null) return false;
  return townSlugs.includes(hub);
}

/** Web.dc.html:1229-1238, extended with the attribute sections. */
export function passes(c: ClusterView, f: Filters): boolean {
  if (!inTowns(c, f.towns)) return false;
  if (f.types.length > 0 && !f.types.includes(c.unitType)) return false;

  // --- advance path ---
  if (c.advanceMonthsMin === null) {
    if (!f.includeNotStated) return false;
  } else if (f.advances.length > 0) {
    const stated = c.listings
      .map((l) => l.advanceMonths)
      .filter((m): m is number => m !== null);
    if (!stated.some((m) => f.advances.includes(m))) return false;
  }
  // --- end advance path ---

  if (f.monthlyMax !== null) {
    if (c.rentMin === null) return false;
    if (c.rentMin > f.monthlyMax) return false;
  }
  if (f.seen === '7' && c.seenDaysAgo > 7) return false;
  if (f.seen === '30' && c.seenDaysAgo > 30) return false;

  if (f.water.length > 0) {
    const w = c.attributes.water;
    if (w === null) return false;
    if (!f.water.includes(w)) return false;
  }
  if (f.polytank && c.attributes.polytank !== true) return false;
  if (f.meter.length > 0) {
    const m = c.attributes.meter;
    if (m === null) return false;
    if (!f.meter.includes(m)) return false;
  }
  if (f.privateToilet) {
    const t = c.attributes.toilet;
    if (t === null) return false;
    if (!t.toLowerCase().includes('private')) return false;
  }
  if (f.gated && c.attributes.gated !== true) return false;

  return true;
}

export function matching(all: ClusterView[], f: Filters): ClusterView[] {
  return all.filter((c) => passes(c, f));
}

/**
 * Web.dc.html:1294 - a cluster with no computable total is never removed by
 * a budget. You cannot price it out on a number nobody stated.
 */
export function withinBudget(c: ClusterView, lumpMax: Pesewas | null): boolean {
  if (lumpMax === null) return true;
  if (c.totalToMoveInMin === null) return true;
  return c.totalToMoveInMin <= lumpMax;
}

export function splitByBudget(
  matched: ClusterView[],
  lumpMax: Pesewas | null,
): { affordable: ClusterView[]; over: ClusterView[] } {
  const affordable: ClusterView[] = [];
  const over: ClusterView[] = [];
  for (const c of matched) {
    if (withinBudget(c, lumpMax)) affordable.push(c);
    else over.push(c);
  }
  return { affordable, over };
}

export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.types.length > 0) n += f.types.length;
  if (f.advances.length > 0) n += f.advances.length;
  if (f.seen !== 'any') n += 1;
  if (f.monthlyMax !== null) n += 1;
  if (f.water.length > 0) n += f.water.length;
  if (f.polytank) n += 1;
  if (f.meter.length > 0) n += f.meter.length;
  if (f.privateToilet) n += 1;
  if (f.gated) n += 1;
  return n;
}
