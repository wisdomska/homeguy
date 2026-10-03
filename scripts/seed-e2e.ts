/**
 * Seed a TEST database with the deterministic fixture dataset, so the E2E
 * suite has listings to look at.
 *
 * The app never invents listings: with no database it shows none, and the
 * production seed (prisma/seed.ts) writes geography and sources only. That
 * left the E2E suite, which was written against the fixture dataset in
 * src/core/seed.ts + generate.ts, with nothing to test against. CI now
 * runs it against a throwaway Postgres filled by this script.
 *
 * Refuses to run against anything but a local database. These rows are
 * fixtures; they must never reach a deployment people use.
 */

import { PrismaClient } from '@prisma/client';
import { clustersFor } from '../src/core/repo';
import { SOURCES } from '../src/core/seed';

const url = process.env.DATABASE_URL ?? '';
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  console.error('seed-e2e only runs against a local database (localhost / 127.0.0.1).');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  for (const s of SOURCES) {
    await prisma.source.upsert({
      where: { id: s.id },
      create: { id: s.id, name: s.name, kind: s.kind, enabled: s.enabled, mayStoreContact: s.mayStoreContact },
      update: {},
    });
  }

  const landmarkIds = new Set((await prisma.landmark.findMany({ select: { id: true } })).map((l) => l.id));
  const views = clustersFor([]);

  await prisma.listing.deleteMany({});
  await prisma.cluster.deleteMany({});

  const BATCH = 500;
  for (let i = 0; i < views.length; i += BATCH) {
    const slice = views.slice(i, i + BATCH);
    await prisma.cluster.createMany({
      data: slice.map((v) => ({
        id: v.id,
        slug: v.slug,
        townId: v.townId,
        areaId: null,
        unitType: v.unitType,
        nearestLandmarkId:
          v.nearestLandmarkId !== null && landmarkIds.has(v.nearestLandmarkId) ? v.nearestLandmarkId : null,
        approxDistanceM: v.approxDistanceM,
        ...v.attributes,
        directions: v.directions,
        photoCount: v.photoCount,
        thumbnailUrl: v.thumbnailUrl,
        lastVerifiedAt: v.lastVerifiedAt,
        rentMin: v.rentMin,
        rentMax: v.rentMax,
        advanceMonthsMin: v.advanceMonthsMin,
        advanceMonthsMax: v.advanceMonthsMax,
        totalToMoveInMin: v.totalToMoveInMin,
        totalToMoveInMax: v.totalToMoveInMax,
        sourceCount: new Set(v.listings.map((l) => l.sourceId)).size,
        mapX: v.mapX,
        mapY: v.mapY,
      })),
    });
    await prisma.listing.createMany({
      data: slice.flatMap((v) =>
        v.listings.map((l) => ({
          id: l.id,
          clusterId: v.id,
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
        })),
      ),
    });
  }

  console.log(`E2E fixtures: ${views.length} clusters.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
