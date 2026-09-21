/**
 * The single read entry point the app uses.
 *
 * Postgres when there is a database, the generated dataset when there is
 * not. No page needs to know which, and no page renders a different number
 * depending on the answer — both sides return counts of rows they actually
 * hold.
 *
 * The generated dataset survives only so unit tests and a fresh checkout
 * work without a database. It is never what a deployed site shows.
 */

import {
  dbClusterBySlug,
  dbClustersByIds,
  dbClustersFor,
  dbRegionsWithCoverage,
  dbSourceNames,
  dbTotalClusterCount,
  dbTownCounts,
  dbTownsWithCounts,
  hasDatabase,
} from './db';
import {
  REGIONS,
  TOWNS,
  clusterBySlug as seedClusterBySlug,
  clustersByIds as seedClustersByIds,
  clustersFor as seedClustersFor,
  regionsWithCoverage as seedRegionsWithCoverage,
  sourceName as seedSourceName,
  totalClusterCount as seedTotalClusterCount,
  townClusterCount as seedTownClusterCount,
  townsWithCounts as seedTownsWithCounts,
} from './repo';
import type { ClusterView, Region, Town } from './types';

export async function clustersFor(townSlugs: string[]): Promise<ClusterView[]> {
  if (!hasDatabase()) return seedClustersFor(townSlugs);
  return dbClustersFor(townSlugs);
}

export async function clusterBySlug(slug: string): Promise<ClusterView | null> {
  if (!hasDatabase()) return seedClusterBySlug(slug);
  return dbClusterBySlug(slug);
}

export async function clustersByIds(ids: string[]): Promise<ClusterView[]> {
  if (!hasDatabase()) return seedClustersByIds(ids);
  return dbClustersByIds(ids);
}

export async function townsWithCounts(): Promise<Array<Town & { count: number }>> {
  if (!hasDatabase()) return seedTownsWithCounts();
  return dbTownsWithCounts();
}

export async function regionsWithCoverage(): Promise<Array<Region & { count: number }>> {
  if (!hasDatabase()) return seedRegionsWithCoverage();
  return dbRegionsWithCoverage();
}

export async function totalClusterCount(): Promise<number> {
  if (!hasDatabase()) return seedTotalClusterCount();
  return dbTotalClusterCount();
}

export async function townCountMap(): Promise<Map<string, number>> {
  if (!hasDatabase()) {
    return new Map(TOWNS.map((t) => [t.slug, seedTownClusterCount(t.slug)]));
  }
  return dbTownCounts();
}

export async function sourceNameMap(): Promise<Map<string, string>> {
  if (!hasDatabase()) {
    return new Map(
      ['jiji', 'tonaton', 'facebook-group', 'whatsapp-broadcast', 'agent-form'].map((id) => [
        id,
        seedSourceName(id),
      ]),
    );
  }
  return dbSourceNames();
}

/** Look a source name up without another round trip, for render paths. */
export function nameFrom(map: Map<string, string>): (id: string) => string {
  return (id: string) => map.get(id) ?? id;
}

export { REGIONS, TOWNS };
export { TOWN_BY_SLUG, REGION_BY_SLUG } from './geo';
