/**
 * The single read entry point the app uses.
 *
 * There is exactly one source of listings: the index in Postgres.
 *
 * There used to be a fallback here that served a generated dataset when no
 * database was configured. That was a mistake, and a bad one: staging ran
 * without DATABASE_URL and therefore served 8,097 invented rentals to
 * anyone with the link, with nothing on the page saying they were not real.
 * A rental site that fabricates inventory when its database is missing is
 * worse than one that is down.
 *
 * So: no database means no listings, and every screen says so plainly. The
 * generated dataset still exists in ./repo.ts and ./generate.ts, but only
 * unit tests import it, and nothing in src/app may.
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
import { REGIONS, TOWNS } from './geo';
import type { ClusterView, Region, Town } from './types';

export { hasDatabase };

/** True when the index is reachable and the app can show real listings. */
export function indexAvailable(): boolean {
  return hasDatabase();
}

export async function clustersFor(townSlugs: string[]): Promise<ClusterView[]> {
  if (!hasDatabase()) return [];
  return dbClustersFor(townSlugs);
}

export async function clusterBySlug(slug: string): Promise<ClusterView | null> {
  if (!hasDatabase()) return null;
  return dbClusterBySlug(slug);
}

export async function clustersByIds(ids: string[]): Promise<ClusterView[]> {
  if (!hasDatabase()) return [];
  return dbClustersByIds(ids);
}

/**
 * Towns always come from the geography table, with a real count attached.
 * A town with no listings is not hidden — it is how someone finds out we
 * cover nothing there yet, which is a different and more useful answer than
 * the town being missing.
 */
export async function townsWithCounts(): Promise<Array<Town & { count: number }>> {
  if (!hasDatabase()) return TOWNS.map((t) => ({ ...t, count: 0 }));
  return dbTownsWithCounts();
}

export async function regionsWithCoverage(): Promise<Array<Region & { count: number }>> {
  if (!hasDatabase()) return REGIONS.map((r) => ({ ...r, count: 0 }));
  return dbRegionsWithCoverage();
}

export async function totalClusterCount(): Promise<number> {
  if (!hasDatabase()) return 0;
  return dbTotalClusterCount();
}

export async function townCountMap(): Promise<Map<string, number>> {
  if (!hasDatabase()) return new Map();
  return dbTownCounts();
}

export async function sourceNameMap(): Promise<Map<string, string>> {
  if (!hasDatabase()) return new Map();
  return dbSourceNames();
}

/** Look a source name up without another round trip, for render paths. */
export function nameFrom(map: Map<string, string>): (id: string) => string {
  return (id: string) => map.get(id) ?? id;
}

export { REGIONS, TOWNS };
export { TOWN_BY_SLUG, REGION_BY_SLUG } from './geo';
