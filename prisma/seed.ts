/**
 * Seed the things that do not come from ingestion.
 *
 * Geography and sources are ours: the sixteen regions, their towns, the
 * landmarks a renter actually navigates by, and the source registry with
 * its kill switches. Listings are NOT seeded — those arrive through the
 * pipeline, or they do not exist.
 *
 * Idempotent, so it is safe to run on every deploy.
 */

import { PrismaClient } from '@prisma/client';
import { LANDMARKS, REGIONS, TOWNS } from '../src/core/geo';
import { SOURCE_CONFIG } from '../src/ingest/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding geography and sources.');

  for (const r of REGIONS) {
    await prisma.region.upsert({
      where: { id: r.id },
      create: { id: r.id, name: r.name, slug: r.slug },
      update: { name: r.name, slug: r.slug },
    });
  }
  console.log(`  regions: ${REGIONS.length}`);

  // Two passes: every town first, then the hub links, because a hub is
  // itself a town and may not exist yet on the first pass.
  for (const t of TOWNS) {
    await prisma.town.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        regionId: t.regionId,
        name: t.name,
        slug: t.slug,
        sub: t.sub,
        lat: t.lat,
        lng: t.lng,
        hubDistanceM: t.hubDistanceM,
      },
      update: { name: t.name, sub: t.sub, regionId: t.regionId },
    });
  }
  for (const t of TOWNS) {
    if (t.hubTownId === null) continue;
    await prisma.town.update({
      where: { id: t.id },
      data: { hubTownId: t.hubTownId, hubDistanceM: t.hubDistanceM },
    });
  }
  console.log(`  towns: ${TOWNS.length}`);

  for (const l of LANDMARKS) {
    await prisma.landmark.upsert({
      where: { townId_name: { townId: l.townId, name: l.name } },
      create: { id: l.id, townId: l.townId, name: l.name, lat: l.lat, lng: l.lng },
      update: {},
    });
  }
  console.log(`  landmarks: ${LANDMARKS.length}`);

  for (const s of SOURCE_CONFIG) {
    await prisma.source.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        name: s.name,
        kind: s.kind,
        enabled: s.enabled,
        mayStoreContact: s.mayStoreContact,
      },
      // enabled is deliberately updated from config: the kill switch lives
      // in code and in version control, not in a row somebody edited once.
      update: {
        name: s.name,
        kind: s.kind,
        enabled: s.enabled,
        mayStoreContact: s.mayStoreContact,
      },
    });
  }
  const on = SOURCE_CONFIG.filter((s) => s.enabled).map((s) => s.id);
  console.log(`  sources: ${SOURCE_CONFIG.length} (enabled: ${on.join(', ')})`);

  const clusters = await prisma.cluster.count();
  console.log(`\nClusters in the index: ${clusters}`);
  if (clusters === 0) {
    console.log('None yet. Listings arrive through the pipeline, not through this script.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
