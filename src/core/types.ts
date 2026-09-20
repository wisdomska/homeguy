/**
 * Domain types. Ported from the design export's implicit shape
 * (HomeGuy Web.dc.html:1095-1189) and the brief's schema.
 *
 * Contract B (Research Dossier §12): every attribute is nullable.
 * `null` means "not stated" and is a first-class, rendered state.
 * Nothing in this file may carry a default.
 */

/** Money is always integer minor units (pesewas). 1 GH¢ = 100 pesewas. */
export type Pesewas = number;

export const UNIT_TYPES = [
  'chamber_and_hall_self_contain',
  'chamber_and_hall',
  'single_room_self_contain',
  'single_room',
  'self_contain_studio',
  'boys_quarters',
  'hostel_bed',
  'bedroom_1',
  'bedroom_2',
  'bedroom_3',
  'bedroom_4_plus',
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const WATER_SOURCES = ['gwcl', 'borehole', 'tanker'] as const;
export type WaterSource = (typeof WATER_SOURCES)[number];

export const METER_ARRANGEMENTS = ['self', 'shared', 'prepaid'] as const;
export type MeterArrangement = (typeof METER_ARRANGEMENTS)[number];

export const SOURCE_KINDS = ['api', 'feed', 'crawl', 'user_paste', 'agent_direct'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface Region {
  id: string;
  name: string;
  slug: string;
}

export interface Town {
  id: string;
  regionId: string;
  name: string;
  slug: string;
  /** A larger town this one hangs off, for near-miss results. */
  hubTownId: string | null;
  /** Distance to the hub in metres. null when this town is itself a hub. */
  hubDistanceM: number | null;
  lat: number | null;
  lng: number | null;
  /** Free-text qualifier shown in the picker, e.g. "Kumasi · area, Ashanti". */
  sub: string;
}

export interface Area {
  id: string;
  townId: string;
  name: string;
  slug: string;
}

export interface Landmark {
  id: string;
  townId: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

export interface ClusterAttributes {
  water: WaterSource | null;
  /** Days a week water actually flows, 0-7. */
  waterDays: number | null;
  polytank: boolean | null;
  meter: MeterArrangement | null;
  toilet: string | null;
  bathroom: string | null;
  kitchen: string | null;
  gated: boolean | null;
}

export interface Cluster {
  id: string;
  slug: string;
  townId: string;
  areaId: string | null;
  unitType: UnitType;
  nearestLandmarkId: string | null;
  approxDistanceM: number | null;
  attributes: ClusterAttributes;
  directions: string | null;
  photoCount: number;
  /**
   * Set only once a thumbnail has been ingested into our own store. We do
   * not hot-link or rehost a source portal's imagery, so in a deployment
   * with no image ingestion this is null everywhere and every card renders
   * the plan glyph with an honest photo count beside it.
   */
  thumbnailUrl: string | null;
  lastVerifiedAt: Date;
  /** Map position, 0-100 percent of the viewport. Demo geometry only. */
  mapX: number;
  mapY: number;
}

export interface Listing {
  id: string;
  clusterId: string;
  sourceId: string;
  sourceUrl: string;
  monthlyRent: Pesewas | null;
  /** null is normal and must never be defaulted. */
  advanceMonths: number | null;
  agentFee: Pesewas | null;
  agentName: string | null;
  agentPhone: string | null;
  /** null = unchecked. NOT false. */
  reacLicensed: boolean | null;
  firstSeenAt: Date;
  lastVerifiedAt: Date;
  goneAt: Date | null;
  rawTitle: string;
  rawBody: string;
  /** Per-source note recording the lawful basis for holding this record. */
  lawfulBasisNote: string;
}

export interface Source {
  id: string;
  name: string;
  kind: SourceKind;
  enabled: boolean;
  robotsCheckedAt: Date | null;
  /** Only Tier 1 and Tier 2 sources may carry agent contact details. */
  mayStoreContact: boolean;
}

/**
 * Derived shape. Every number here is computed from the cluster's listings,
 * never hand-written. Any of the money fields is null when it cannot be
 * computed honestly.
 */
export interface ClusterDerived {
  rentMin: Pesewas | null;
  rentMax: Pesewas | null;
  advanceMonthsMin: number | null;
  advanceMonthsMax: number | null;
  totalToMoveInMin: Pesewas | null;
  totalToMoveInMax: Pesewas | null;
  sourceCount: number;
}

/** A cluster with its listings and everything derived from them. */
export interface ClusterView extends Cluster, ClusterDerived {
  listings: Listing[];
  town: Town;
  region: Region;
  landmark: Landmark | null;
  /** Whole days since lastVerifiedAt. */
  seenDaysAgo: number;
}
