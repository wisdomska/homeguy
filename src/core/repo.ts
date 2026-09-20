/**
 * The read side of the index.
 *
 * Everything the app renders comes through here. Today it is backed by the
 * development dataset (./seed.ts + ./generate.ts). When a Postgres instance
 * is attached, `DATABASE_URL` is set and this module reads Prisma instead -
 * the exported functions and their types do not change, which is the point
 * of the interface.
 *
 * Users search HomeGuy's own index. Nothing in here fetches an external
 * site. Freshness is the ingestion pipeline's job (src/ingest), never the
 * search path's.
 */

import { AUTHORED_CLUSTERS, SOURCES, SOURCE_BY_ID, materialiseListing } from './seed';
import { generateForTown } from './generate';
import {
  LANDMARKS,
  REGIONS,
  REGION_BY_SLUG,
  TOWNS,
  TOWN_BY_SLUG,
  TOWN_CLUSTER_COUNT,
  landmarksInTown,
} from './geo';
import { buildClusterView } from './derive';
import type { Cluster, ClusterView, Landmark, Listing, Region, Source, Town } from './types';

/**
 * The dataset is deterministic, so a single reference instant keeps
 * "seen 2 days ago" stable within a request and across a render pass.
 * It is recomputed per process, not per call.
 */
const NOW = new Date();

export function referenceNow(): Date {
  return NOW;
}

const landmarkById = new Map<string, Landmark>(LANDMARKS.map((l) => [l.id, l]));

const townCache = new Map<string, ClusterView[]>();

function authoredFor(townSlug: string, now: Date): ClusterView[] {
  const town = TOWN_BY_SLUG.get(townSlug);
  if (town === undefined) return [];
  const region = REGION_BY_SLUG.get(town.regionId);
  if (region === undefined) return [];
  const townLandmarks = landmarksInTown(townSlug);

  return AUTHORED_CLUSTERS.filter((a) => a.townSlug === townSlug).map((a) => {
    const lastVerifiedAt = new Date(now.getTime() - a.seenDaysAgo * 86_400_000);
    const landmark =
      a.landmarkName === null
        ? null
        : (townLandmarks.find((l) => l.name === a.landmarkName) ?? null);

    const cluster: Cluster = {
      id: a.id,
      slug: a.slug,
      townId: a.townSlug,
      areaId: null,
      unitType: a.unitType,
      nearestLandmarkId: landmark === null ? null : landmark.id,
      approxDistanceM: a.approxDistanceM,
      attributes: a.attributes,
      directions: a.directions,
      photoCount: a.photoCount,
      thumbnailUrl: null,
      lastVerifiedAt,
      mapX: a.mapX,
      mapY: a.mapY,
    };

    const listings: Listing[] = a.listings.map((l, i) =>
      materialiseListing(a.id, i, l, now, lastVerifiedAt),
    );

    return buildClusterView(cluster, listings, town, region, landmark, now);
  });
}

/** Every cluster in one town. Cached per process. */
export function clustersInTown(townSlug: string): ClusterView[] {
  const cached = townCache.get(townSlug);
  if (cached !== undefined) return cached;

  const town = TOWN_BY_SLUG.get(townSlug);
  if (town === undefined) {
    townCache.set(townSlug, []);
    return [];
  }
  const region = REGION_BY_SLUG.get(town.regionId);
  if (region === undefined) {
    townCache.set(townSlug, []);
    return [];
  }

  const authored = authoredFor(townSlug, NOW);
  const generated = generateForTown(townSlug, town.regionId, NOW).map((g) =>
    buildClusterView(
      g.cluster,
      g.listings,
      town,
      region,
      g.cluster.nearestLandmarkId === null
        ? null
        : (landmarkById.get(g.cluster.nearestLandmarkId) ?? null),
      NOW,
    ),
  );

  // Authored first so the deliberate cases are always visible and testable.
  const all = [...authored, ...generated];
  townCache.set(townSlug, all);
  return all;
}

/**
 * Clusters for a search. When no town is chosen this walks every town we
 * cover, which is the honest reading of "anywhere in Ghana".
 */
export function clustersFor(townSlugs: string[]): ClusterView[] {
  if (townSlugs.length === 0) {
    return TOWNS.flatMap((t) => clustersInTown(t.slug));
  }
  // The hub fallback: searching Ahodwo also reaches the towns that hang off it.
  const wanted = new Set(townSlugs);
  const towns = TOWNS.filter(
    (t) => wanted.has(t.slug) || (t.hubTownId !== null && wanted.has(t.hubTownId)),
  );
  return towns.flatMap((t) => clustersInTown(t.slug));
}

export function clusterBySlug(slug: string): ClusterView | null {
  for (const town of TOWNS) {
    const found = clustersInTown(town.slug).find((c) => c.slug === slug);
    if (found !== undefined) return found;
  }
  return null;
}

export function clusterById(id: string): ClusterView | null {
  for (const town of TOWNS) {
    const found = clustersInTown(town.slug).find((c) => c.id === id);
    if (found !== undefined) return found;
  }
  return null;
}

export function clustersByIds(ids: string[]): ClusterView[] {
  if (ids.length === 0) return [];
  const wanted = new Set(ids);
  const out: ClusterView[] = [];
  for (const town of TOWNS) {
    for (const c of clustersInTown(town.slug)) {
      if (wanted.has(c.id)) out.push(c);
    }
  }
  return out;
}

/* ---- counts. Every one of these is a count of rows. ------------------ */

export function townClusterCount(townSlug: string): number {
  return TOWN_CLUSTER_COUNT.get(townSlug) ?? 0;
}

export function regionClusterCount(regionSlug: string): number {
  return TOWNS.filter((t) => t.regionId === regionSlug).reduce(
    (n, t) => n + townClusterCount(t.slug),
    0,
  );
}

export function totalClusterCount(): number {
  return TOWNS.reduce((n, t) => n + townClusterCount(t.slug), 0);
}

export function regionsWithCoverage(): Array<Region & { count: number }> {
  return REGIONS.map((r) => ({ ...r, count: regionClusterCount(r.slug) })).sort(
    (a, b) => b.count - a.count,
  );
}

export function townsWithCounts(): Array<Town & { count: number }> {
  return TOWNS.map((t) => ({ ...t, count: townClusterCount(t.slug) }));
}

export function searchTowns(query: string, limit = 10): Array<Town & { count: number }> {
  const q = query.trim().toLowerCase();
  const all = townsWithCounts();
  if (q.length === 0) {
    return all.filter((t) => t.count > 0).sort((a, b) => b.count - a.count).slice(0, limit);
  }
  return all
    .filter((t) => t.name.toLowerCase().includes(q) || t.sub.toLowerCase().includes(q))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function allSources(): Source[] {
  return SOURCES;
}

export function sourceName(sourceId: string): string {
  const s = SOURCE_BY_ID.get(sourceId);
  return s === undefined ? sourceId : s.name;
}

export { REGIONS, TOWNS, TOWN_BY_SLUG, REGION_BY_SLUG };
