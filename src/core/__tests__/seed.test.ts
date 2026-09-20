import { describe, expect, it } from 'vitest';
import { AUTHORED_CLUSTERS } from '../seed';
import { REGIONS, TOWNS, TOWN_CLUSTER_COUNT } from '../geo';
import {
  clusterById,
  clustersInTown,
  regionClusterCount,
  totalClusterCount,
  townClusterCount,
} from '../repo';

/**
 * If the seed is tidy, the product will break for most of Ghana. These
 * tests exist to keep it untidy in exactly the ways it needs to be.
 */

describe('the awkward cases survive', () => {
  it('has a cluster where three agents disagree on price', () => {
    const a1 = AUTHORED_CLUSTERS.find((c) => c.id === 'a1');
    expect(a1).toBeDefined();
    const rents = a1?.listings.map((l) => l.rent) ?? [];
    expect(rents).toEqual([700, 800, 900]);
    expect(new Set(rents).size).toBe(3);
  });

  it('has a cluster where one of three agents states no advance', () => {
    const e1 = AUTHORED_CLUSTERS.find((c) => c.id === 'e1');
    expect(e1?.listings.some((l) => l.advanceMonths === null)).toBe(true);
    expect(e1?.listings.some((l) => l.advanceMonths === 12)).toBe(true);
    expect(e1?.listings.some((l) => l.advanceMonths === 6)).toBe(true);
  });

  it('has clusters with no advance at all', () => {
    const noAdvance = AUTHORED_CLUSTERS.filter((c) =>
      c.listings.every((l) => l.advanceMonths === null),
    );
    expect(noAdvance.map((c) => c.id)).toContain('a5');
    expect(noAdvance.map((c) => c.id)).toContain('b3');
  });

  it('has listings with no photo', () => {
    expect(AUTHORED_CLUSTERS.filter((c) => c.photoCount === 0).length).toBeGreaterThanOrEqual(3);
  });

  it('has a cluster with no landmark', () => {
    const t3 = AUTHORED_CLUSTERS.find((c) => c.id === 't3');
    expect(t3?.landmarkName).toBeNull();
    expect(t3?.approxDistanceM).toBeNull();
  });

  it('has a stale cluster past the 30-day band', () => {
    expect(AUTHORED_CLUSTERS.some((c) => c.seenDaysAgo > 30)).toBe(true);
  });

  it('never stores a zero agent fee as if it were a stated one', () => {
    for (const c of AUTHORED_CLUSTERS) {
      for (const l of c.listings) {
        expect(l.agentFee).not.toBe(0);
      }
    }
  });

  it('holds no contact number for a crawled source', () => {
    const crawled = new Set(['jiji', 'tonaton']);
    for (const c of AUTHORED_CLUSTERS) {
      for (const l of c.listings) {
        if (crawled.has(l.sourceId)) expect(l.phone).toBeNull();
      }
    }
  });

  it('uses null, not false, for an unchecked REAC licence', () => {
    const unchecked = AUTHORED_CLUSTERS.flatMap((c) => c.listings).filter(
      (l) => l.reacLicensed === null,
    );
    expect(unchecked.length).toBeGreaterThan(0);
    const anyFalse = AUTHORED_CLUSTERS.flatMap((c) => c.listings).some(
      (l) => l.reacLicensed === false,
    );
    expect(anyFalse).toBe(false);
  });
});

describe('coverage is uneven and real', () => {
  it('covers all sixteen regions', () => {
    expect(REGIONS).toHaveLength(16);
  });

  it('has regions we track nothing in, on purpose', () => {
    const empty = REGIONS.filter((r) => regionClusterCount(r.slug) === 0);
    expect(empty.length).toBeGreaterThan(0);
  });

  it('has at least one town with zero clusters, so zero-by-coverage is reachable', () => {
    const empty = TOWNS.filter((t) => townClusterCount(t.slug) === 0);
    expect(empty.length).toBeGreaterThan(0);
  });

  it('has at least one town under the thin threshold', () => {
    const thin = TOWNS.filter((t) => {
      const n = townClusterCount(t.slug);
      return n > 0 && n < 5;
    });
    expect(thin.length).toBeGreaterThan(0);
  });

  it('keeps the region counts the design fixed', () => {
    expect(regionClusterCount('greater-accra')).toBe(4182);
    expect(regionClusterCount('ashanti')).toBe(1940);
    expect(regionClusterCount('western')).toBe(612);
    expect(regionClusterCount('central')).toBe(488);
    expect(regionClusterCount('eastern')).toBe(402);
    expect(regionClusterCount('northern')).toBe(214);
    expect(regionClusterCount('volta')).toBe(186);
    expect(regionClusterCount('upper-west')).toBe(31);
    expect(regionClusterCount('upper-east')).toBe(23);
    // From the start flow: "Also search Upper West · 31 and North East · 19".
    expect(regionClusterCount('north-east')).toBe(19);
  });

  it('EVERY rendered count is a real count of rows', () => {
    // The generator produces exactly what the table declares. If these ever
    // diverge, a number on a screen somewhere is a claim rather than a fact.
    for (const town of TOWNS) {
      const declared = TOWN_CLUSTER_COUNT.get(town.slug) ?? 0;
      expect(clustersInTown(town.slug).length, `${town.slug}`).toBe(declared);
    }
  });

  it('the total is the sum of the towns', () => {
    const sum = TOWNS.reduce((n, t) => n + townClusterCount(t.slug), 0);
    expect(totalClusterCount()).toBe(sum);
  });
});

describe('the dataset is deterministic', () => {
  it('returns the same clusters for a town every time', () => {
    const a = clustersInTown('bolgatanga').map((c) => c.id);
    const b = clustersInTown('bolgatanga').map((c) => c.id);
    expect(a).toEqual(b);
  });

  it('puts the authored clusters first so they are always reachable', () => {
    const ids = clustersInTown('ahodwo').slice(0, 6).map((c) => c.id);
    expect(ids).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6']);
  });

  it('derives no total for the no-advance cluster', () => {
    const a5 = clusterById('a5');
    expect(a5).not.toBeNull();
    expect(a5?.totalToMoveInMin).toBeNull();
    expect(a5?.advanceMonthsMin).toBeNull();
    // But the rent is known and is still shown.
    expect(a5?.rentMin).not.toBeNull();
  });
});
