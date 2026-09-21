/**
 * normalise -> place -> cluster -> index.
 *
 * Everything a parser produces comes through here on its way into Postgres.
 * Three jobs, in order:
 *
 *   1. Place it. The sources name a region and an area ("Greater Accra,
 *      Weija"). Areas we have never seen become towns in the right region,
 *      because coverage should reflect what we actually hold rather than a
 *      list someone typed once. A listing we cannot place is dropped, not
 *      guessed at.
 *
 *   2. Cluster it. Contract C: the searchable object is a canonical
 *      property, not a listing. A listing that looks like one we already
 *      hold joins it and keeps its own price, advance, source and dates.
 *      Rent is allowed to differ — that disagreement is the product.
 *
 *   3. Derive. rentMin/Max, advanceMonths min/max and totalToMoveIn are
 *      recomputed from the cluster's live listings every time, never
 *      written by hand.
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { totalToMoveIn } from '@/core/money';
import { REGIONS } from '@/core/geo';
import { sourceConfig } from './config';
import { parseNeighbourhood } from './normalise';
import type { RawListing } from './adapters/types';

export interface PersistResult {
  seen: number;
  /** Listings written for the first time. */
  created: number;
  /** Listings we already held and refreshed. */
  updated: number;
  /** Joined an existing cluster rather than starting one. */
  clustered: number;
  /** Dropped because we could not place or price them. */
  droppedUnplaceable: number;
  droppedNoPrice: number;
  /** How many carried an advance term at all. */
  withAdvance: number;
  withPhoto: number;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const REGION_BY_NAME = new Map(REGIONS.map((r) => [r.name.toLowerCase(), r]));

/** Match the region a source named to one of Ghana's sixteen. */
function resolveRegionId(hint: string | null): string | null {
  if (hint === null) return null;
  const h = hint.toLowerCase().replace(/\s+region$/, '').trim();
  const direct = REGION_BY_NAME.get(h);
  if (direct !== undefined) return direct.id;
  for (const [name, r] of REGION_BY_NAME) {
    if (h.includes(name) || name.includes(h)) return r.id;
  }
  return null;
}

/**
 * Find or create the town. A new area under a known region becomes a town;
 * an area we cannot put in a region does not, because a listing filed under
 * the wrong region is worse than one we skipped.
 */
async function resolveTownId(
  db: PrismaClient,
  raw: RawListing,
): Promise<string | null> {
  const townName = raw.townHint;
  if (townName === null) return null;

  const slug = slugify(townName);
  if (slug.length === 0) return null;

  const existing = await db.town.findUnique({ where: { slug } });
  if (existing !== null) return existing.id;

  const regionId = resolveRegionId(raw.regionHint);
  if (regionId === null) return null;

  const region = REGIONS.find((r) => r.id === regionId);
  const created = await db.town.create({
    data: {
      id: slug,
      slug,
      name: townName,
      regionId,
      sub: region === undefined ? 'Ghana' : `area, ${region.name}`,
    },
  });
  return created.id;
}

/**
 * Does this listing belong to a cluster we already hold?
 *
 * Same town and same unit type is the floor. Beyond that we look for a
 * strong signal that it is the same building: the same landmark, or a title
 * close enough that two agents are plainly describing one place.
 *
 * Rent is deliberately NOT part of the test. Two agents quoting different
 * prices for one room is the case this product exists to show.
 */
async function findClusterFor(
  db: PrismaClient,
  raw: RawListing,
  townId: string,
): Promise<string | null> {
  if (raw.unitType === null) return null;

  const town = await db.town.findUnique({ where: { id: townId }, select: { name: true } });
  const townName = town === null ? '' : town.name;

  const mine = titleKey(raw.rawTitle, townName);
  // A title with nothing distinctive left cannot be matched on. Starting a
  // new cluster is the safe answer: showing one room twice is a smaller
  // error than merging two rooms and inventing a price range between them.
  if (mine.length < 3) return null;

  const candidates = await db.cluster.findMany({
    where: { townId, unitType: raw.unitType },
    select: {
      id: true,
      rentMin: true,
      rentMax: true,
      listings: { select: { rawTitle: true } },
    },
    take: 300,
  });

  for (const c of candidates) {
    // A fourfold price gap is a different building, not a negotiation.
    if (raw.monthlyRent !== null && c.rentMin !== null && c.rentMax !== null) {
      const lo = Math.min(raw.monthlyRent, c.rentMin);
      const hi = Math.max(raw.monthlyRent, c.rentMax);
      if (lo > 0 && hi / lo > MAX_RENT_RATIO) continue;
    }
    for (const l of c.listings) {
      const theirs = titleKey(l.rawTitle, townName);
      if (theirs.length < 3) continue;
      const shared = mine.filter((w) => theirs.includes(w)).length;
      // Both a strong proportion AND enough distinctive words in common, so
      // one shared name can never merge two unrelated houses.
      if (shared >= 3 && overlap(mine, theirs) >= 0.6) return c.id;
    }
  }
  return null;
}

/**
 * The distinctive words in a title, minus everything that appears in every
 * advert from the same town.
 *
 * This list is longer than it looks like it needs to be, and that is the
 * point. Jiji titles are formulaic — "2bdrm Apartment in Born To Pray
 * Estate, Ejisu-Juaben Municipal for rent" — so once the property nouns and
 * the place name are gone, what remains is the only thing that actually
 * identifies a building. An earlier version kept "estate", "kumasi" and
 * "metropolitan" as signal and merged 31 unrelated houses, priced from
 * GH¢2,200 to GH¢25,000 a month, into a single cluster.
 */
const TITLE_STOPWORDS = new Set([
  // grammar
  'for','rent','in','the','a','an','and','to','at','with','of','is','on','by',
  // property nouns
  'apartment','apartments','house','houses','room','rooms','flat','flats',
  'bedroom','bedrooms','bdrm','bdrms','self','contain','contained','studio',
  'chamber','hall','mansion','duplex','townhouse','villa','compound','unit',
  // marketing
  'new','newly','built','modern','luxury','luxurious','executive','spacious',
  'nice','beautiful','lovely','affordable','cheap','quality','standard',
  'furnished','unfurnished','serviced','available','now','clean','neat',
  // trade words that name the seller, not the place
  'estate','estates','agency','agencies','properties','property','realty',
  'real','ltd','limited','company','enterprise','ventures','homes','group',
]);

function titleKey(title: string, townName: string): string[] {
  // Words from the town's own name are in every title from that town.
  const townWords = new Set(
    townName.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/s+/).filter(Boolean),
  );
  return [
    ...new Set(
      title
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, ' ')
        .split(/s+/)
        .filter(
          (w) =>
            w.length > 2 &&
            !TITLE_STOPWORDS.has(w) &&
            !townWords.has(w) &&
            !/^d+$/.test(w),
        ),
    ),
  ];
}

/** Jaccard. Using min() as the denominator let a two-word title match anything. */
function overlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const shared = a.filter((w) => setB.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

/**
 * Two rents this far apart are not two agents disagreeing about one room.
 * Contract C allows the price to differ, and it routinely does — but a
 * fourfold gap is a different building, not a negotiation.
 */
const MAX_RENT_RATIO = 3;

/**
 * The neighbourhood the advert names, stored as a landmark on the cluster.
 *
 * Both sources file every Kumasi listing under the district, so "Ahodwo",
 * "Danyame" and "Kwadaso Siloam" exist only inside the title. Without this
 * they were unsearchable and every card read "Location not stated".
 */
async function resolveLandmarkId(
  db: PrismaClient,
  raw: RawListing,
  townId: string,
  townName: string,
): Promise<string | null> {
  const place = parseNeighbourhood(raw.rawTitle, townName);
  if (place === null) return null;

  const existing = await db.landmark.findUnique({
    where: { townId_name: { townId, name: place } },
    select: { id: true },
  });
  if (existing !== null) return existing.id;

  const created = await db.landmark.create({ data: { townId, name: place } });
  return created.id;
}

/** Recompute every derived money field from the cluster's live listings. */
export async function recomputeCluster(db: PrismaClient, clusterId: string): Promise<void> {
  const listings = await db.listing.findMany({
    where: { clusterId, goneAt: null },
    select: { monthlyRent: true, advanceMonths: true, agentFee: true, sourceId: true },
  });

  const rents = listings.map((l) => l.monthlyRent).filter((r): r is number => r !== null);
  const advances = listings
    .map((l) => l.advanceMonths)
    .filter((m): m is number => m !== null);
  const totals = listings
    .map((l) => totalToMoveIn(l.monthlyRent, l.advanceMonths, l.agentFee))
    .filter((t): t is number => t !== null);

  await db.cluster.update({
    where: { id: clusterId },
    data: {
      rentMin: rents.length > 0 ? Math.min(...rents) : null,
      rentMax: rents.length > 0 ? Math.max(...rents) : null,
      advanceMonthsMin: advances.length > 0 ? Math.min(...advances) : null,
      advanceMonthsMax: advances.length > 0 ? Math.max(...advances) : null,
      // Null the moment no listing states an advance. No default, anywhere.
      totalToMoveInMin: totals.length > 0 ? Math.min(...totals) : null,
      totalToMoveInMax: totals.length > 0 ? Math.max(...totals) : null,
      sourceCount: new Set(listings.map((l) => l.sourceId)).size,
    },
  });
}

export async function persistListings(
  db: PrismaClient,
  raws: RawListing[],
  now = new Date(),
): Promise<PersistResult> {
  const result: PersistResult = {
    seen: raws.length,
    created: 0,
    updated: 0,
    clustered: 0,
    droppedUnplaceable: 0,
    droppedNoPrice: 0,
    withAdvance: 0,
    withPhoto: 0,
  };

  for (const raw of raws) {
    // A listing with no price is not a listing anyone can act on.
    if (raw.monthlyRent === null) {
      result.droppedNoPrice += 1;
      continue;
    }

    const townId = await resolveTownId(db, raw);
    if (townId === null) {
      result.droppedUnplaceable += 1;
      continue;
    }

    if (raw.advanceMonths !== null) result.withAdvance += 1;
    if (raw.thumbnailUrl !== null) result.withPhoto += 1;

    const cfg = sourceConfig(raw.sourceId);
    const mayStoreContact = cfg !== null && cfg.mayStoreContact;

    const existing = await db.listing.findUnique({
      where: { sourceId_sourceUrl: { sourceId: raw.sourceId, sourceUrl: raw.sourceUrl } },
      select: { id: true, clusterId: true, monthlyRent: true },
    });

    if (existing !== null) {
      // Record a price change before overwriting it: the digest reads this.
      if (existing.monthlyRent !== null && existing.monthlyRent !== raw.monthlyRent) {
        await db.listingEvent.create({
          data: {
            listingId: existing.id,
            clusterId: existing.clusterId,
            kind: 'price_changed',
            previousRent: existing.monthlyRent,
            newRent: raw.monthlyRent,
          },
        });
      }
      await db.listing.update({
        where: { id: existing.id },
        data: {
          monthlyRent: raw.monthlyRent,
          advanceMonths: raw.advanceMonths,
          agentFee: raw.agentFee,
          lastVerifiedAt: now,
          goneAt: null,
          rawTitle: raw.rawTitle,
          rawBody: raw.rawBody,
        },
      });
      await db.cluster.update({
        where: { id: existing.clusterId },
        data: { lastVerifiedAt: now },
      });
      await recomputeCluster(db, existing.clusterId);
      result.updated += 1;
      continue;
    }

    let clusterId = await findClusterFor(db, raw, townId);
    if (clusterId !== null) result.clustered += 1;

    if (clusterId === null) {
      const townRow = await db.town.findUnique({
        where: { id: townId },
        select: { name: true },
      });
      const landmarkId = await resolveLandmarkId(
        db,
        raw,
        townId,
        townRow === null ? '' : townRow.name,
      );
      const base = slugify(`${raw.townHint ?? townId}-${raw.rawTitle}`).slice(0, 70);
      const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
      const cluster = await db.cluster.create({
        data: {
          slug,
          townId,
          unitType: raw.unitType ?? 'single_room',
          nearestLandmarkId: landmarkId,
          water: raw.water,
          waterDays: raw.waterDays,
          polytank: raw.polytank,
          meter: raw.meter,
          toilet: raw.toilet,
          bathroom: raw.bathroom,
          kitchen: raw.kitchen,
          gated: raw.gated,
          directions: raw.directions,
          photoCount: raw.photoCount,
          thumbnailUrl: raw.thumbnailUrl,
          lastVerifiedAt: now,
          mapX: 10 + Math.floor(Math.random() * 80),
          mapY: 10 + Math.floor(Math.random() * 80),
        },
      });
      clusterId = cluster.id;
    } else if (raw.thumbnailUrl !== null) {
      // A cluster with no picture takes one from whichever member has it.
      await db.cluster.updateMany({
        where: { id: clusterId, thumbnailUrl: null },
        data: { thumbnailUrl: raw.thumbnailUrl, photoCount: raw.photoCount },
      });
    }

    const created = await db.listing.create({
      data: {
        clusterId,
        sourceId: raw.sourceId,
        sourceUrl: raw.sourceUrl,
        monthlyRent: raw.monthlyRent,
        advanceMonths: raw.advanceMonths,
        agentFee: raw.agentFee,
        agentName: mayStoreContact ? raw.agentName : null,
        agentPhone: mayStoreContact ? raw.agentPhone : null,
        reacLicensed: null,
        firstSeenAt: raw.firstSeenAt ?? now,
        lastVerifiedAt: now,
        rawTitle: raw.rawTitle,
        rawBody: raw.rawBody,
        lawfulBasisNote:
          cfg === null ? 'Unclassified source - contact withheld.' : cfg.lawfulBasisNote,
      },
    });

    await db.listingEvent.create({
      data: { listingId: created.id, clusterId, kind: 'new' },
    });

    await recomputeCluster(db, clusterId);
    result.created += 1;
  }

  return result;
}

export type { Prisma };
