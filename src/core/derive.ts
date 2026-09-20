/**
 * Cluster-level derived values.
 *
 * Research Dossier §12 contract C: the searchable object is a canonical
 * property, and every source listing keeps its own price, advance term,
 * first-seen and last-verified date. Nothing here collapses a cluster to a
 * single price. Where the listings disagree, the disagreement is the output.
 *
 * THIS FILE IS IN THE ADVANCE PATH. It is scanned by
 * src/core/__tests__/no-defaults.test.ts. No `??`, no `||` fallback, no
 * inferred advance term.
 */

import { totalToMoveIn } from './money';
import type {
  Cluster,
  ClusterDerived,
  ClusterView,
  Landmark,
  Listing,
  Region,
  Town,
} from './types';
import { daysSince } from './freshness';

function minOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.min(...values);
}

function maxOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.max(...values);
}

/**
 * Every money figure here is null unless a listing actually stated the
 * inputs for it. A cluster where one agent gave an advance and two did not
 * reports a range built only from the one that did - and the detail view
 * still shows all three rows.
 */
export function deriveCluster(listings: Listing[]): ClusterDerived {
  const live = listings.filter((l) => l.goneAt === null);

  const rents = live.map((l) => l.monthlyRent).filter((r): r is number => r !== null);
  const advances = live
    .map((l) => l.advanceMonths)
    .filter((m): m is number => m !== null);

  const totals = live
    .map((l) => totalToMoveIn(l.monthlyRent, l.advanceMonths, l.agentFee))
    .filter((t): t is number => t !== null);

  return {
    rentMin: minOf(rents),
    rentMax: maxOf(rents),
    advanceMonthsMin: minOf(advances),
    advanceMonthsMax: maxOf(advances),
    totalToMoveInMin: minOf(totals),
    totalToMoveInMax: maxOf(totals),
    sourceCount: new Set(live.map((l) => l.sourceId)).size,
  };
}

export function buildClusterView(
  cluster: Cluster,
  listings: Listing[],
  town: Town,
  region: Region,
  landmark: Landmark | null,
  now: Date,
): ClusterView {
  return {
    ...cluster,
    ...deriveCluster(listings),
    listings,
    town,
    region,
    landmark,
    seenDaysAgo: daysSince(cluster.lastVerifiedAt, now),
  };
}

/** The monthly spread across a cluster's listings, or null when there is none. */
export function rentSpread(view: ClusterView): number | null {
  if (view.rentMin === null) return null;
  if (view.rentMax === null) return null;
  if (view.rentMax === view.rentMin) return null;
  return view.rentMax - view.rentMin;
}

/**
 * The cheapest listing with a computable total, for the headline figure.
 * Falls back to the cheapest rent when no listing states an advance - which
 * is what makes the card render "per month · advance not stated" rather than
 * inventing a total.
 */
export function headlineListing(view: ClusterView): Listing | null {
  const live = view.listings.filter((l) => l.goneAt === null);
  const withTotal = live
    .map((l) => ({ l, t: totalToMoveIn(l.monthlyRent, l.advanceMonths, l.agentFee) }))
    .filter((x): x is { l: Listing; t: number } => x.t !== null)
    .sort((a, b) => a.t - b.t);
  const cheapestWithTotal = withTotal[0];
  if (cheapestWithTotal !== undefined) return cheapestWithTotal.l;

  const byRent = live
    .filter((l) => l.monthlyRent !== null)
    .sort((a, b) => (a.monthlyRent as number) - (b.monthlyRent as number));
  const cheapest = byRent[0];
  if (cheapest !== undefined) return cheapest;
  return null;
}

/** Attributes nobody has answered. Web.dc.html:1345-1353 */
export function gapsFor(view: ClusterView): string[] {
  const gaps: string[] = [];
  const a = view.attributes;
  if (a.meter === null) gaps.push('Meter arrangement');
  if (a.kitchen === null) gaps.push('Kitchen');
  if (a.water === null) gaps.push('Water source');
  if (a.toilet === null) gaps.push('Toilet');
  if (a.bathroom === null) gaps.push('Bathroom');
  if (view.advanceMonthsMin === null) gaps.push('Advance months');
  // These two are never stated by any Ghanaian source, so they are always asked.
  gaps.push('Viewing fee');
  gaps.push('Caution deposit');
  return gaps;
}
