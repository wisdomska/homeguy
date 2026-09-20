/**
 * Clustering — Contract C, and the heart of the product.
 *
 * Duplicates are the default state of this data (Research Dossier C11). Two
 * listings are the same place when landmark proximity, unit type and
 * attribute overlap agree within a threshold - with rent allowed to differ,
 * because it routinely does. Three agents quoting GH¢1,200, GH¢1,500 and
 * GH¢1,800 for one room is not three rooms and it is not an error; it is
 * the single most useful thing we can show a renter.
 *
 * Cluster members keep their own price, advance, agent, source, first-seen
 * and last-verified. Nothing here collapses a cluster to one price, ever.
 *
 * Every merge is scored and logged so /admin/clusters can review, split or
 * merge by hand.
 */

import type { ClusterAttributes, UnitType } from '@/core/types';

export interface Candidate {
  id: string;
  townSlug: string;
  unitType: UnitType | null;
  landmarkId: string | null;
  approxDistanceM: number | null;
  attributes: ClusterAttributes;
  /** Minor units. Allowed to differ wildly between members. */
  monthlyRent: number | null;
}

export interface MergeScore {
  total: number;
  landmark: number;
  unitType: number;
  attributes: number;
  reasons: string[];
}

/** Tunable. Raise it to split more, lower it to merge more. */
export const MERGE_THRESHOLD = 0.72;

/** Two landmarks this far apart are not the same place. */
export const MAX_LANDMARK_DELTA_M = 250;

export function scorePair(a: Candidate, b: Candidate): MergeScore {
  const reasons: string[] = [];

  if (a.townSlug !== b.townSlug) {
    return { total: 0, landmark: 0, unitType: 0, attributes: 0, reasons: ['different_town'] };
  }

  // ---- landmark proximity (weight 0.45) ----
  let landmark = 0;
  if (a.landmarkId !== null && a.landmarkId === b.landmarkId) {
    if (a.approxDistanceM === null || b.approxDistanceM === null) {
      landmark = 0.7;
      reasons.push('same_landmark_distance_unknown');
    } else {
      const delta = Math.abs(a.approxDistanceM - b.approxDistanceM);
      landmark = delta <= MAX_LANDMARK_DELTA_M ? 1 : Math.max(0, 1 - delta / 1000);
      reasons.push(`landmark_delta_${delta}m`);
    }
  } else if (a.landmarkId === null || b.landmarkId === null) {
    // One of them has no landmark at all. That is common and is not
    // evidence either way, so it scores neutral rather than zero.
    landmark = 0.4;
    reasons.push('landmark_missing');
  } else {
    landmark = 0;
    reasons.push('different_landmark');
  }

  // ---- unit type (weight 0.3) ----
  let unitType = 0;
  if (a.unitType !== null && a.unitType === b.unitType) {
    unitType = 1;
    reasons.push('same_unit_type');
  } else if (a.unitType === null || b.unitType === null) {
    unitType = 0.35;
    reasons.push('unit_type_unknown');
  } else {
    unitType = 0;
    reasons.push('different_unit_type');
  }

  // ---- attribute overlap (weight 0.25) ----
  const attributes = attributeOverlap(a.attributes, b.attributes, reasons);

  const total = landmark * 0.45 + unitType * 0.3 + attributes * 0.25;
  return { total, landmark, unitType, attributes, reasons };
}

function attributeOverlap(
  a: ClusterAttributes,
  b: ClusterAttributes,
  reasons: string[],
): number {
  const keys: Array<keyof ClusterAttributes> = [
    'water',
    'waterDays',
    'polytank',
    'meter',
    'toilet',
    'bathroom',
    'kitchen',
    'gated',
  ];
  let compared = 0;
  let agreed = 0;
  let contradicted = 0;

  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    // A null on either side is "not stated", which is neither agreement
    // nor disagreement. It must never count against a merge, or nothing in
    // this market would ever cluster.
    if (av === null || bv === null) continue;
    compared += 1;
    if (av === bv) agreed += 1;
    else contradicted += 1;
  }

  if (compared === 0) {
    reasons.push('no_shared_attributes');
    return 0.5;
  }
  if (contradicted > 0) reasons.push(`contradicted_${contradicted}`);
  reasons.push(`agreed_${agreed}_of_${compared}`);
  return agreed / compared;
}

export interface MergeLogEntry {
  a: string;
  b: string;
  score: MergeScore;
  merged: boolean;
  at: number;
}

const mergeLog: MergeLogEntry[] = [];

export function mergeLogEntries(limit = 200): MergeLogEntry[] {
  return mergeLog.slice(-limit);
}

/**
 * Group candidates into clusters. Single-pass union by best match, which is
 * enough at per-town scale and keeps the log readable.
 */
export function clusterCandidates(
  candidates: Candidate[],
  threshold = MERGE_THRESHOLD,
): string[][] {
  const parent = new Map<string, string>();
  for (const c of candidates) parent.set(c.id, c.id);

  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) {
      const next = parent.get(root);
      if (next === undefined) break;
      root = next;
    }
    return root;
  };

  const union = (x: string, y: string) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      if (a === undefined || b === undefined) continue;
      const score = scorePair(a, b);
      const merged = score.total >= threshold;
      mergeLog.push({ a: a.id, b: b.id, score, merged, at: Date.now() });
      if (mergeLog.length > 5000) mergeLog.splice(0, mergeLog.length - 5000);
      if (merged) union(a.id, b.id);
    }
  }

  const groups = new Map<string, string[]>();
  for (const c of candidates) {
    const root = find(c.id);
    const g = groups.get(root) ?? [];
    g.push(c.id);
    groups.set(root, g);
  }
  return [...groups.values()];
}
