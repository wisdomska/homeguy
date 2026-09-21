/**
 * The Postgres-backed read layer.
 *
 * Same shape as src/core/repo.ts, but async and reading real rows. When
 * DATABASE_URL is absent — a unit test, a checkout with no database — the
 * callers fall back to the generated dataset, so nothing has to special-case
 * its absence.
 *
 * Every count returned here is a COUNT(*) over rows we actually hold. There
 * is no target table any more and no number that means "what we intend to
 * cover": if the index holds 41 rooms in Weija, the page says 41.
 */

import { PrismaClient } from '@prisma/client';
import { buildClusterView } from './derive';
import { REGIONS, TOWNS } from './geo';
import type { Cluster, ClusterView, Landmark, Listing, Region, Town } from './types';

declare global {
  var __homeguyPrisma: PrismaClient | undefined;
}

export function hasDatabase(): boolean {
  const url = process.env.DATABASE_URL;
  return typeof url === 'string' && url.length > 0;
}

/** One client per process. Next reloads modules in dev; this survives it. */
export function db(): PrismaClient {
  const existing = globalThis.__homeguyPrisma;
  if (existing !== undefined) return existing;
  const client = new PrismaClient();
  globalThis.__homeguyPrisma = client;
  return client;
}

/* ---- row -> domain ---------------------------------------------------- */

type ClusterRow = Awaited<ReturnType<typeof loadClusters>>[number];

function toView(row: ClusterRow, now: Date): ClusterView {
  const town: Town = {
    id: row.town.id,
    regionId: row.town.regionId,
    name: row.town.name,
    slug: row.town.slug,
    hubTownId: row.town.hubTownId,
    hubDistanceM: row.town.hubDistanceM,
    lat: row.town.lat,
    lng: row.town.lng,
    sub: row.town.sub,
  };
  const region: Region = {
    id: row.town.region.id,
    name: row.town.region.name,
    slug: row.town.region.slug,
  };
  const landmark: Landmark | null =
    row.nearestLandmark === null
      ? null
      : {
          id: row.nearestLandmark.id,
          townId: row.nearestLandmark.townId,
          name: row.nearestLandmark.name,
          lat: row.nearestLandmark.lat,
          lng: row.nearestLandmark.lng,
        };

  const cluster: Cluster = {
    id: row.id,
    slug: row.slug,
    townId: row.townId,
    areaId: row.areaId,
    unitType: row.unitType,
    nearestLandmarkId: row.nearestLandmarkId,
    approxDistanceM: row.approxDistanceM,
    attributes: {
      water: row.water,
      waterDays: row.waterDays,
      polytank: row.polytank,
      meter: row.meter,
      toilet: row.toilet,
      bathroom: row.bathroom,
      kitchen: row.kitchen,
      gated: row.gated,
    },
    directions: row.directions,
    photoCount: row.photoCount,
    thumbnailUrl: row.thumbnailUrl,
    lastVerifiedAt: row.lastVerifiedAt,
    mapX: row.mapX,
    mapY: row.mapY,
  };

  const listings: Listing[] = row.listings.map((l) => ({
    id: l.id,
    clusterId: l.clusterId,
    sourceId: l.sourceId,
    sourceUrl: l.sourceUrl,
    monthlyRent: l.monthlyRent,
    advanceMonths: l.advanceMonths,
    agentFee: l.agentFee,
    agentName: l.agentName,
    agentPhone: l.agentPhone,
    reacLicensed: l.reacLicensed,
    firstSeenAt: l.firstSeenAt,
    lastVerifiedAt: l.lastVerifiedAt,
    goneAt: l.goneAt,
    rawTitle: l.rawTitle,
    rawBody: l.rawBody,
    lawfulBasisNote: l.lawfulBasisNote,
  }));

  return buildClusterView(cluster, listings, town, region, landmark, now);
}

const INCLUDE = {
  town: { include: { region: true } },
  nearestLandmark: true,
  listings: { where: { goneAt: null }, orderBy: { monthlyRent: 'asc' } },
} as const;

function loadClusters(where: object, take: number) {
  return db().cluster.findMany({
    where,
    include: INCLUDE,
    orderBy: { lastVerifiedAt: 'desc' },
    take,
  });
}

/* ---- queries ---------------------------------------------------------- */

export async function dbClustersFor(townSlugs: string[], take = 400): Promise<ClusterView[]> {
  const now = new Date();
  const where =
    townSlugs.length === 0
      ? { listings: { some: { goneAt: null } } }
      : {
          listings: { some: { goneAt: null } },
          OR: [
            { town: { slug: { in: townSlugs } } },
            { town: { hubTown: { slug: { in: townSlugs } } } },
          ],
        };
  const rows = await loadClusters(where, take);
  return rows.map((r) => toView(r, now));
}

/**
 * Clusters whose neighbourhood or title mentions the query.
 *
 * The sources file every Kumasi advert under the district, so "Ahodwo" and
 * "Danyame" live in the landmark we extracted from the title rather than in
 * any town name. Without this, a search for the neighbourhood someone
 * actually wants returns nothing while the index holds the listing.
 */
export async function dbClustersMatchingPlace(
  query: string,
  take = 400,
): Promise<ClusterView[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const rows = await db().cluster.findMany({
    where: {
      listings: { some: { goneAt: null } },
      OR: [
        { nearestLandmark: { name: { contains: q, mode: 'insensitive' } } },
        { listings: { some: { rawTitle: { contains: q, mode: 'insensitive' } } } },
      ],
    },
    include: INCLUDE,
    orderBy: { lastVerifiedAt: 'desc' },
    take,
  });
  const now = new Date();
  return rows.map((r) => toView(r, now));
}

export async function dbClusterBySlug(slug: string): Promise<ClusterView | null> {
  const row = await db().cluster.findUnique({ where: { slug }, include: INCLUDE });
  return row === null ? null : toView(row, new Date());
}

export async function dbClustersByIds(ids: string[]): Promise<ClusterView[]> {
  if (ids.length === 0) return [];
  const rows = await db().cluster.findMany({ where: { id: { in: ids } }, include: INCLUDE });
  const now = new Date();
  return rows.map((r) => toView(r, now));
}

export async function dbTownCounts(): Promise<Map<string, number>> {
  const grouped = await db().cluster.groupBy({
    by: ['townId'],
    _count: { _all: true },
    where: { listings: { some: { goneAt: null } } },
  });
  return new Map(grouped.map((g) => [g.townId, g._count._all]));
}

export async function dbTownsWithCounts(): Promise<Array<Town & { count: number }>> {
  const counts = await dbTownCounts();
  const rows = await db().town.findMany({ include: { region: true } });
  return rows.map((t) => ({
    id: t.id,
    regionId: t.regionId,
    name: t.name,
    slug: t.slug,
    hubTownId: t.hubTownId,
    hubDistanceM: t.hubDistanceM,
    lat: t.lat,
    lng: t.lng,
    sub: t.sub,
    count: counts.get(t.id) ?? 0,
  }));
}

export async function dbRegionsWithCoverage(): Promise<Array<Region & { count: number }>> {
  const towns = await dbTownsWithCounts();
  return REGIONS.map((r) => ({
    ...r,
    count: towns.filter((t) => t.regionId === r.id).reduce((n, t) => n + t.count, 0),
  })).sort((a, b) => b.count - a.count);
}

export async function dbTotalClusterCount(): Promise<number> {
  return db().cluster.count({ where: { listings: { some: { goneAt: null } } } });
}

export async function dbSourceNames(): Promise<Map<string, string>> {
  const rows = await db().source.findMany({ select: { id: true, name: true } });
  return new Map(rows.map((s) => [s.id, s.name]));
}

export { REGIONS, TOWNS };
