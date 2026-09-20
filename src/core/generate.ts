/**
 * The rest of the development dataset.
 *
 * The seventeen authored clusters in ./seed.ts are the ones that carry the
 * awkward cases. This file produces the remainder, deterministically, so
 * that every count the product renders is a real count of rows the dataset
 * holds - `TOWN_CLUSTER_COUNT` says Ahodwo holds 214 clusters, and this
 * generator produces exactly 214 of them, every time, in the same order.
 *
 * It is a development dataset, and the product says so on the landing page.
 * It is not scraped data and it is not pretending to be. When real
 * ingestion is switched on, this generator is removed and the repository in
 * ./repo.ts reads Postgres instead - nothing else changes.
 *
 * The distributions below are set so the states the design specifies stay
 * reachable: roughly one cluster in eight states no advance, one in six has
 * no photo, one in twelve has no landmark, one in five is clustered across
 * two or three sources, and freshness spans all three bands.
 */

import { AUTHORED_CLUSTERS, SOURCES } from './seed';
import { TOWN_CLUSTER_COUNT, landmarksInTown } from './geo';
import { cedis } from './money';
import type { Cluster, ClusterAttributes, Listing, MeterArrangement, UnitType, WaterSource } from './types';

/** A tiny deterministic PRNG. Same slug in, same dataset out, forever. */
function makeRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick from empty list');
  return item;
}

const GENERATED_TYPES: UnitType[] = [
  'chamber_and_hall_self_contain',
  'chamber_and_hall',
  'chamber_and_hall',
  'single_room_self_contain',
  'single_room_self_contain',
  'single_room',
  'self_contain_studio',
  'bedroom_1',
  'bedroom_2',
];

const WATERS: WaterSource[] = ['gwcl', 'borehole', 'tanker'];
const METERS: MeterArrangement[] = ['self', 'shared', 'prepaid'];
const TOILETS = ['Inside, private', 'Shared', 'Outside, shared'];
const KITCHENS = ['Inside', 'Shared', 'Outside'];

/** Rough monthly rent bands by region, in cedis. */
const RENT_BASE: Record<string, [number, number]> = {
  'greater-accra': [600, 2400],
  ashanti: [350, 1400],
  western: [300, 1100],
  central: [280, 900],
  eastern: [250, 850],
  northern: [220, 700],
  volta: [220, 750],
  'upper-west': [180, 520],
  'upper-east': [180, 520],
  'north-east': [160, 460],
};

const SOURCE_IDS = SOURCES.map((s) => s.id);

const AUTHORED_BY_TOWN = new Map<string, number>();
for (const c of AUTHORED_CLUSTERS) {
  AUTHORED_BY_TOWN.set(c.townSlug, (AUTHORED_BY_TOWN.get(c.townSlug) ?? 0) + 1);
}

export interface GeneratedCluster {
  cluster: Cluster;
  listings: Listing[];
}

/**
 * Produce the generated portion of a town's dataset: its declared cluster
 * count minus however many authored clusters already live there.
 */
export function generateForTown(
  townSlug: string,
  regionSlug: string,
  now: Date,
): GeneratedCluster[] {
  const target = TOWN_CLUSTER_COUNT.get(townSlug);
  if (target === undefined) return [];
  const authored = AUTHORED_BY_TOWN.get(townSlug) ?? 0;
  const toMake = target - authored;
  if (toMake <= 0) return [];

  const rng = makeRng(`homeguy:${townSlug}`);
  const landmarks = landmarksInTown(townSlug);
  const band = RENT_BASE[regionSlug];
  const [lo, hi] = band === undefined ? [250, 900] : band;

  const out: GeneratedCluster[] = [];

  for (let i = 0; i < toMake; i += 1) {
    const id = `${townSlug}-g${i}`;
    const unitType = pick(rng, GENERATED_TYPES);

    // --- freshness: spread across all three bands ---
    const freshRoll = rng();
    const seenDaysAgo =
      freshRoll < 0.55
        ? Math.floor(rng() * 8)
        : freshRoll < 0.85
          ? 8 + Math.floor(rng() * 23)
          : 31 + Math.floor(rng() * 40);

    // --- location: one in twelve has no landmark at all ---
    const hasLandmark = landmarks.length > 0 && rng() > 1 / 12;
    const landmark = hasLandmark ? pick(rng, landmarks) : null;

    // --- photos: one in six has none ---
    const photoCount = rng() < 1 / 6 ? 0 : 1 + Math.floor(rng() * 14);

    const attributes = generateAttributes(rng);

    const cluster: Cluster = {
      id,
      slug: `${townSlug}-${unitType.replace(/_/g, '-')}-${i}`,
      townId: townSlug,
      areaId: null,
      unitType,
      nearestLandmarkId: landmark === null ? null : landmark.id,
      approxDistanceM: landmark === null ? null : 100 + Math.floor(rng() * 9) * 100,
      attributes,
      directions:
        landmark === null
          ? null
          : `From ${landmark.name}, about ${100 + Math.floor(rng() * 9) * 100}m. Ask for the compound at the junction.`,
      photoCount,
      // No image ingestion is enabled, so nothing is rehosted.
      thumbnailUrl: null,
      lastVerifiedAt: new Date(now.getTime() - seenDaysAgo * 86_400_000),
      mapX: 8 + Math.floor(rng() * 84),
      mapY: 8 + Math.floor(rng() * 84),
    };

    out.push({ cluster, listings: generateListings(rng, id, lo, hi, now, seenDaysAgo) });
  }

  return out;
}

function generateAttributes(rng: () => number): ClusterAttributes {
  // Ghanaian listings are written loosely and incompletely. Where the source
  // did not say, the value is null - never a guess.
  const stated = (p: number) => rng() < p;
  return {
    water: stated(0.62) ? pick(rng, WATERS) : null,
    waterDays: stated(0.45) ? 1 + Math.floor(rng() * 7) : null,
    polytank: stated(0.5) ? true : null,
    meter: stated(0.48) ? pick(rng, METERS) : null,
    toilet: stated(0.7) ? pick(rng, TOILETS) : null,
    bathroom: stated(0.55) ? pick(rng, TOILETS) : null,
    kitchen: stated(0.4) ? pick(rng, KITCHENS) : null,
    gated: stated(0.4) ? true : null,
  };
}

function generateListings(
  rng: () => number,
  clusterId: string,
  lo: number,
  hi: number,
  now: Date,
  seenDaysAgo: number,
): Listing[] {
  // One in five clusters is advertised by more than one agent. That is the
  // whole reason clustering exists (Dossier C11).
  const clusterRoll = rng();
  const count = clusterRoll < 0.8 ? 1 : clusterRoll < 0.95 ? 2 : 3;

  const baseRent = Math.round((lo + rng() * (hi - lo)) / 10) * 10;
  const listings: Listing[] = [];

  for (let i = 0; i < count; i += 1) {
    const sourceId = pick(rng, SOURCE_IDS);
    const source = SOURCES.find((s) => s.id === sourceId);
    const mayStoreContact = source === undefined ? false : source.mayStoreContact;

    // Agents disagree, and they disagree upward.
    const rent = i === 0 ? baseRent : Math.round((baseRent * (1 + rng() * 0.45)) / 10) * 10;

    // One listing in eight states no advance at all. Never inferred.
    const advanceMonths = rng() < 1 / 8 ? null : pick(rng, [1, 3, 6, 12, 12, 12, 24]);
    const agentFee =
      advanceMonths === null || rng() < 0.3 ? null : Math.round(rent * 0.6);

    const firstSeenDaysAgo = seenDaysAgo + Math.floor(rng() * 30);

    listings.push({
      id: `${clusterId}-l${i}`,
      clusterId,
      sourceId,
      sourceUrl: `https://example.invalid/${sourceId}/${clusterId}-${i}`,
      monthlyRent: cedis(rent),
      advanceMonths,
      agentFee: agentFee === null ? null : cedis(agentFee),
      agentName: `Agent ${String.fromCharCode(65 + Math.floor(rng() * 26))}${Math.floor(rng() * 90) + 10}`,
      agentPhone: mayStoreContact ? `+233 24 ${String(Math.floor(rng() * 9000000) + 1000000)}` : null,
      // null means we have not checked the REAC register. Never false-as-unknown.
      reacLicensed: rng() < 0.18 ? true : null,
      firstSeenAt: new Date(now.getTime() - firstSeenDaysAgo * 86_400_000),
      lastVerifiedAt: new Date(now.getTime() - seenDaysAgo * 86_400_000),
      goneAt: null,
      rawTitle: '',
      rawBody: '',
      lawfulBasisNote: mayStoreContact
        ? 'Consent given at submission; deletable on request (Act 843 s.33).'
        : 'Public listing page. No personal data retained; contact is by link-out to the source.',
    });
  }

  return listings;
}
