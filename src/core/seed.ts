/**
 * The authored seed - a direct port of HomeGuy Web.dc.html:1095-1170.
 *
 * Every awkward case in here is deliberate and must survive:
 *   a1, e1  three agents disagreeing on price, one of them with no advance
 *   a5, b3  advance not stated, no agent fee, no attributes at all
 *   a3      two agents, both stale
 *   t3      no landmark and no photo
 *   a7, a8  near-misses reached through a hub town
 *   n1      a near-miss 28km away
 *
 * If this seed ever looks tidy, something has been quietly filled in.
 */

import { cedis } from './money';
import type { ClusterAttributes, Listing, Source, UnitType } from './types';

/* ---- sources --------------------------------------------------------- */

export const SOURCES: Source[] = [
  {
    id: 'jiji',
    name: 'Jiji',
    kind: 'crawl',
    enabled: true,
    robotsCheckedAt: null,
    // Tier 3. Act 843: no contact details may be stored from this route.
    mayStoreContact: false,
  },
  {
    id: 'tonaton',
    name: 'Tonaton',
    kind: 'crawl',
    enabled: true,
    robotsCheckedAt: null,
    mayStoreContact: false,
  },
  {
    id: 'facebook-group',
    name: 'Facebook group',
    kind: 'user_paste',
    enabled: true,
    robotsCheckedAt: null,
    // Tier 2. Arrives because a person pasted it; the consent path applies.
    mayStoreContact: true,
  },
  {
    id: 'whatsapp-broadcast',
    name: 'WhatsApp broadcast',
    kind: 'agent_direct',
    enabled: true,
    robotsCheckedAt: null,
    mayStoreContact: true,
  },
  {
    id: 'agent-form',
    name: 'Agent posted on HomeGuy',
    kind: 'agent_direct',
    enabled: true,
    robotsCheckedAt: null,
    mayStoreContact: true,
  },
];

export const SOURCE_BY_ID: ReadonlyMap<string, Source> = new Map(SOURCES.map((s) => [s.id, s]));

const LAWFUL_BASIS: Record<string, string> = {
  jiji: 'Public listing page, crawled with robots.txt permission. No personal data retained; contact is by link-out to the source.',
  tonaton:
    'Public listing page, crawled with robots.txt permission. No personal data retained; contact is by link-out to the source.',
  'facebook-group':
    'Submitted by a HomeGuy user who pasted the post. Agent contact retained on the consent path, deletable on request (Act 843 s.33).',
  'whatsapp-broadcast':
    'Forwarded by the agent to HomeGuy. Consent given at submission; deletable on request (Act 843 s.33).',
  'agent-form':
    'Posted by the agent through the HomeGuy form. Consent given at submission; deletable on request (Act 843 s.33).',
};

/* ---- the authored clusters ------------------------------------------- */

interface AuthoredListing {
  agentName: string;
  sourceId: string;
  /** Whole days before the reference date this listing was first seen. */
  firstSeenDaysAgo: number;
  /** true when we checked the REAC register and found a licence. */
  reacLicensed: boolean | null;
  rent: number;
  advanceMonths: number | null;
  /** Agent fee in cedis. null means not stated - never 0-as-unknown. */
  agentFee: number | null;
  phone: string | null;
}

export interface AuthoredCluster {
  id: string;
  slug: string;
  townSlug: string;
  unitType: UnitType;
  landmarkName: string | null;
  approxDistanceM: number | null;
  photoCount: number;
  /** Whole days before the reference date this cluster was last verified. */
  seenDaysAgo: number;
  mapX: number;
  mapY: number;
  attributes: ClusterAttributes;
  directions: string | null;
  listings: AuthoredListing[];
}

export const AUTHORED_CLUSTERS: AuthoredCluster[] = [
  {
    id: 'a1',
    slug: 'ahodwo-roundabout-chamber-and-hall-self-contain-a1',
    townSlug: 'ahodwo',
    unitType: 'chamber_and_hall_self_contain',
    landmarkName: 'Ahodwo Roundabout',
    approxDistanceM: 300,
    photoCount: 14,
    seenDaysAgo: 2,
    mapX: 42,
    mapY: 58,
    attributes: {
      water: 'gwcl',
      waterDays: 4,
      polytank: true,
      meter: null,
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: null,
      gated: true,
    },
    directions:
      'From Ahodwo Roundabout, take the road beside the pharmacy, about 300m. The compound is the second gate after the blue kiosk.',
    listings: [
      { agentName: 'Agent A', sourceId: 'jiji', firstSeenDaysAgo: 16, reacLicensed: true, rent: 700, advanceMonths: 12, agentFee: 420, phone: null },
      { agentName: 'Agent B', sourceId: 'facebook-group', firstSeenDaysAgo: 22, reacLicensed: null, rent: 800, advanceMonths: null, agentFee: null, phone: '+233 24 000 0002' },
      { agentName: 'Agent C', sourceId: 'whatsapp-broadcast', firstSeenDaysAgo: 8, reacLicensed: true, rent: 900, advanceMonths: 6, agentFee: null, phone: '+233 24 000 0003' },
    ],
  },
  {
    id: 'a2',
    slug: 'ahodwo-sda-church-single-room-self-contain-a2',
    townSlug: 'ahodwo',
    unitType: 'single_room_self_contain',
    landmarkName: 'Ahodwo SDA Church',
    approxDistanceM: 150,
    photoCount: 4,
    seenDaysAgo: 16,
    mapX: 55,
    mapY: 44,
    attributes: {
      water: 'borehole',
      waterDays: 7,
      polytank: true,
      meter: 'self',
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: 'Shared',
      gated: null,
    },
    directions: 'Behind the SDA church, first turning left, about 150m.',
    listings: [
      { agentName: 'Agent D', sourceId: 'jiji', firstSeenDaysAgo: 17, reacLicensed: null, rent: 450, advanceMonths: 12, agentFee: 270, phone: null },
    ],
  },
  {
    id: 'a3',
    slug: 'nhyiaeso-police-station-chamber-and-hall-a3',
    townSlug: 'ahodwo',
    unitType: 'chamber_and_hall',
    landmarkName: 'Nhyiaeso Police Station',
    approxDistanceM: 250,
    photoCount: 7,
    seenDaysAgo: 44,
    mapX: 33,
    mapY: 70,
    attributes: {
      water: 'gwcl',
      waterDays: 2,
      polytank: null,
      meter: 'shared',
      toilet: 'Shared',
      bathroom: 'Shared',
      kitchen: null,
      gated: true,
    },
    directions: 'Opposite the police station, down the untarred road, about 250m.',
    listings: [
      { agentName: 'Agent E', sourceId: 'tonaton', firstSeenDaysAgo: 46, reacLicensed: null, rent: 750, advanceMonths: 12, agentFee: 450, phone: null },
      { agentName: 'Agent F', sourceId: 'facebook-group', firstSeenDaysAgo: 38, reacLicensed: null, rent: 980, advanceMonths: 12, agentFee: null, phone: '+233 24 000 0006' },
    ],
  },
  {
    id: 'a4',
    slug: 'ahodwo-total-single-room-self-contain-a4',
    townSlug: 'ahodwo',
    unitType: 'single_room_self_contain',
    landmarkName: 'Ahodwo Total',
    approxDistanceM: 600,
    photoCount: 9,
    seenDaysAgo: 5,
    mapX: 62,
    mapY: 64,
    attributes: {
      water: 'gwcl',
      waterDays: 3,
      polytank: true,
      meter: 'prepaid',
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: 'Inside',
      gated: true,
    },
    directions: 'From Ahodwo Total, walk towards the school, about 600m on the right.',
    listings: [
      { agentName: 'Agent G', sourceId: 'whatsapp-broadcast', firstSeenDaysAgo: 5, reacLicensed: true, rent: 540, advanceMonths: 12, agentFee: 324, phone: '+233 24 000 0007' },
    ],
  },
  {
    // The hard one. No advance, no fee, no photo, no attributes.
    id: 'a5',
    slug: 'aboabo-station-single-room-a5',
    townSlug: 'ahodwo',
    unitType: 'single_room',
    landmarkName: 'Aboabo Station',
    approxDistanceM: 350,
    photoCount: 0,
    seenDaysAgo: 6,
    mapX: 48,
    mapY: 76,
    attributes: {
      water: null,
      waterDays: null,
      polytank: null,
      meter: null,
      toilet: 'Shared',
      bathroom: null,
      kitchen: null,
      gated: null,
    },
    directions: 'Agent has not given directions beyond the station.',
    listings: [
      { agentName: 'Agent H', sourceId: 'facebook-group', firstSeenDaysAgo: 6, reacLicensed: null, rent: 500, advanceMonths: null, agentFee: null, phone: '+233 24 000 0008' },
    ],
  },
  {
    id: 'a6',
    slug: 'ahodwo-total-chamber-and-hall-self-contain-a6',
    townSlug: 'ahodwo',
    unitType: 'chamber_and_hall_self_contain',
    landmarkName: 'Ahodwo Total',
    approxDistanceM: 400,
    photoCount: 5,
    seenDaysAgo: 12,
    mapX: 70,
    mapY: 50,
    attributes: {
      water: 'gwcl',
      waterDays: 5,
      polytank: true,
      meter: 'self',
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: 'Inside',
      gated: true,
    },
    directions: 'From the filling station, first right, about 400m.',
    listings: [
      { agentName: 'Agent I', sourceId: 'jiji', firstSeenDaysAgo: 12, reacLicensed: null, rent: 900, advanceMonths: 12, agentFee: 540, phone: null },
    ],
  },
  {
    id: 'a7',
    slug: 'bantama-total-chamber-and-hall-a7',
    townSlug: 'bantama',
    unitType: 'chamber_and_hall',
    landmarkName: 'Bantama Total',
    approxDistanceM: 300,
    photoCount: 6,
    seenDaysAgo: 1,
    mapX: 24,
    mapY: 30,
    attributes: {
      water: 'gwcl',
      waterDays: 4,
      polytank: true,
      meter: 'self',
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: null,
      gated: null,
    },
    directions: 'From Bantama Total, towards the market, about 300m.',
    listings: [
      { agentName: 'Agent J', sourceId: 'jiji', firstSeenDaysAgo: 1, reacLicensed: true, rent: 650, advanceMonths: 12, agentFee: 390, phone: null },
    ],
  },
  {
    id: 'a8',
    slug: 'nhyiaeso-clinic-single-room-self-contain-a8',
    townSlug: 'nhyiaeso',
    unitType: 'single_room_self_contain',
    landmarkName: 'Nhyiaeso Clinic',
    approxDistanceM: 200,
    photoCount: 3,
    seenDaysAgo: 8,
    mapX: 38,
    mapY: 40,
    attributes: {
      water: 'borehole',
      waterDays: 7,
      polytank: true,
      meter: null,
      toilet: 'Shared',
      bathroom: 'Shared',
      kitchen: 'Shared',
      gated: true,
    },
    directions: 'Beside the clinic, second compound, about 200m.',
    listings: [
      { agentName: 'Agent K', sourceId: 'whatsapp-broadcast', firstSeenDaysAgo: 8, reacLicensed: null, rent: 400, advanceMonths: 6, agentFee: 240, phone: '+233 24 000 0011' },
    ],
  },
  {
    // The other three-way disagreement. GH¢600/mo apart.
    id: 'e1',
    slug: 'shiashie-total-chamber-and-hall-self-contain-e1',
    townSlug: 'east-legon',
    unitType: 'chamber_and_hall_self_contain',
    landmarkName: 'Shiashie Total',
    approxDistanceM: 300,
    photoCount: 11,
    seenDaysAgo: 2,
    mapX: 44,
    mapY: 52,
    attributes: {
      water: 'gwcl',
      waterDays: 4,
      polytank: true,
      meter: null,
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: null,
      gated: true,
    },
    directions:
      'From Shiashie Total, the road beside the pharmacy, about 300m — second gate after the blue kiosk.',
    listings: [
      { agentName: 'Agent L', sourceId: 'jiji', firstSeenDaysAgo: 18, reacLicensed: true, rent: 1200, advanceMonths: 12, agentFee: 720, phone: null },
      { agentName: 'Agent M', sourceId: 'facebook-group', firstSeenDaysAgo: 14, reacLicensed: null, rent: 1500, advanceMonths: null, agentFee: null, phone: '+233 24 000 0013' },
      { agentName: 'Agent N', sourceId: 'whatsapp-broadcast', firstSeenDaysAgo: 10, reacLicensed: true, rent: 1800, advanceMonths: 6, agentFee: null, phone: '+233 24 000 0014' },
    ],
  },
  {
    id: 'e2',
    slug: 'ac-mall-chamber-and-hall-e2',
    townSlug: 'east-legon',
    unitType: 'chamber_and_hall',
    landmarkName: 'A&C Mall',
    approxDistanceM: 600,
    photoCount: 8,
    seenDaysAgo: 5,
    mapX: 60,
    mapY: 38,
    attributes: {
      water: 'gwcl',
      waterDays: 3,
      polytank: true,
      meter: 'prepaid',
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: 'Inside',
      gated: true,
    },
    directions: 'Behind A&C Mall, towards the school, about 600m.',
    listings: [
      { agentName: 'Agent O', sourceId: 'jiji', firstSeenDaysAgo: 9, reacLicensed: null, rent: 900, advanceMonths: 6, agentFee: 540, phone: null },
    ],
  },
  {
    id: 't1',
    slug: 'vitting-junction-chamber-and-hall-t1',
    townSlug: 'tamale',
    unitType: 'chamber_and_hall',
    landmarkName: 'Vitting Junction',
    approxDistanceM: 200,
    photoCount: 5,
    seenDaysAgo: 4,
    mapX: 40,
    mapY: 46,
    attributes: {
      water: 'borehole',
      waterDays: 7,
      polytank: true,
      meter: 'self',
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: null,
      gated: null,
    },
    directions: 'From Vitting Junction, towards the water tank, about 200m.',
    listings: [
      { agentName: 'Agent P', sourceId: 'facebook-group', firstSeenDaysAgo: 7, reacLicensed: null, rent: 450, advanceMonths: 12, agentFee: 270, phone: '+233 24 000 0016' },
    ],
  },
  {
    id: 't2',
    slug: 'lamashegu-market-single-room-t2',
    townSlug: 'tamale',
    unitType: 'single_room',
    landmarkName: 'Lamashegu Market',
    approxDistanceM: 400,
    photoCount: 3,
    seenDaysAgo: 12,
    mapX: 56,
    mapY: 60,
    attributes: {
      water: 'tanker',
      waterDays: 2,
      polytank: true,
      meter: 'shared',
      toilet: 'Shared',
      bathroom: 'Shared',
      kitchen: null,
      gated: null,
    },
    directions: 'From Lamashegu Market, past the mosque, about 400m.',
    listings: [
      { agentName: 'Agent Q', sourceId: 'jiji', firstSeenDaysAgo: 17, reacLicensed: null, rent: 360, advanceMonths: 12, agentFee: 216, phone: null },
      { agentName: 'Agent R', sourceId: 'whatsapp-broadcast', firstSeenDaysAgo: 13, reacLicensed: null, rent: 420, advanceMonths: 12, agentFee: null, phone: '+233 24 000 0018' },
    ],
  },
  {
    // No landmark at all, and no photo.
    id: 't3',
    slug: 'tamale-chamber-and-hall-self-contain-t3',
    townSlug: 'tamale',
    unitType: 'chamber_and_hall_self_contain',
    landmarkName: null,
    approxDistanceM: null,
    photoCount: 0,
    seenDaysAgo: 19,
    mapX: 30,
    mapY: 66,
    attributes: {
      water: null,
      waterDays: null,
      polytank: null,
      meter: null,
      toilet: null,
      bathroom: null,
      kitchen: null,
      gated: null,
    },
    directions: 'No directions given. Ask the agent for a landmark before travelling.',
    listings: [
      { agentName: 'Agent S', sourceId: 'facebook-group', firstSeenDaysAgo: 20, reacLicensed: null, rent: 600, advanceMonths: 12, agentFee: 360, phone: '+233 24 000 0019' },
    ],
  },
  {
    id: 'b1',
    slug: 'bolga-ssnit-flats-single-room-b1',
    townSlug: 'bolgatanga',
    unitType: 'single_room',
    landmarkName: 'Bolga SSNIT Flats',
    approxDistanceM: 500,
    photoCount: 0,
    seenDaysAgo: 3,
    mapX: 45,
    mapY: 50,
    attributes: {
      water: 'borehole',
      waterDays: 7,
      polytank: null,
      meter: null,
      toilet: 'Shared',
      bathroom: 'Shared',
      kitchen: null,
      gated: null,
    },
    directions: 'Behind the SSNIT flats, about 500m.',
    listings: [
      { agentName: 'Agent T', sourceId: 'whatsapp-broadcast', firstSeenDaysAgo: 4, reacLicensed: null, rent: 300, advanceMonths: 12, agentFee: 180, phone: '+233 24 000 0020' },
    ],
  },
  {
    id: 'b2',
    slug: 'zaare-junction-chamber-and-hall-b2',
    townSlug: 'bolgatanga',
    unitType: 'chamber_and_hall',
    landmarkName: 'Zaare Junction',
    approxDistanceM: 300,
    photoCount: 2,
    seenDaysAgo: 9,
    mapX: 58,
    mapY: 56,
    attributes: {
      water: 'gwcl',
      waterDays: 2,
      polytank: true,
      meter: 'shared',
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: null,
      gated: true,
    },
    directions: 'From Zaare Junction, towards the clinic, about 300m.',
    listings: [
      { agentName: 'Agent U', sourceId: 'facebook-group', firstSeenDaysAgo: 11, reacLicensed: null, rent: 400, advanceMonths: 12, agentFee: 240, phone: '+233 24 000 0021' },
    ],
  },
  {
    id: 'b3',
    slug: 'bolga-market-single-room-self-contain-b3',
    townSlug: 'bolgatanga',
    unitType: 'single_room_self_contain',
    landmarkName: 'Bolga Market',
    approxDistanceM: 700,
    photoCount: 1,
    seenDaysAgo: 21,
    mapX: 36,
    mapY: 62,
    attributes: {
      water: null,
      waterDays: null,
      polytank: null,
      meter: null,
      toilet: null,
      bathroom: null,
      kitchen: null,
      gated: null,
    },
    directions: 'Near the market, agent will meet you at the entrance.',
    listings: [
      { agentName: 'Agent V', sourceId: 'jiji', firstSeenDaysAgo: 25, reacLicensed: null, rent: 350, advanceMonths: null, agentFee: null, phone: null },
    ],
  },
  {
    id: 'n1',
    slug: 'navrongo-health-centre-single-room-self-contain-n1',
    townSlug: 'navrongo',
    unitType: 'single_room_self_contain',
    landmarkName: 'Navrongo Health Centre',
    approxDistanceM: 200,
    photoCount: 6,
    seenDaysAgo: 4,
    mapX: 22,
    mapY: 36,
    attributes: {
      water: 'borehole',
      waterDays: 7,
      polytank: true,
      meter: 'self',
      toilet: 'Inside, private',
      bathroom: 'Inside, private',
      kitchen: 'Shared',
      gated: null,
    },
    directions: 'Beside the health centre, about 200m.',
    listings: [
      { agentName: 'Agent W', sourceId: 'whatsapp-broadcast', firstSeenDaysAgo: 5, reacLicensed: null, rent: 250, advanceMonths: 12, agentFee: 150, phone: '+233 24 000 0023' },
    ],
  },
];

/** Turn an authored listing into a real Listing row. */
export function materialiseListing(
  clusterId: string,
  index: number,
  a: AuthoredListing,
  now: Date,
  lastVerifiedAt: Date,
): Listing {
  const source = SOURCE_BY_ID.get(a.sourceId);
  const sourceName = source === undefined ? a.sourceId : source.name;
  const mayStoreContact = source === undefined ? false : source.mayStoreContact;
  const basis = LAWFUL_BASIS[a.sourceId];
  return {
    id: `${clusterId}-l${index}`,
    clusterId,
    sourceId: a.sourceId,
    sourceUrl: `https://example.invalid/${a.sourceId}/${clusterId}-${index}`,
    monthlyRent: cedis(a.rent),
    advanceMonths: a.advanceMonths,
    agentFee: a.agentFee === null ? null : cedis(a.agentFee),
    agentName: a.agentName,
    // Act 843, and the brief: a number crawled from a public page is never stored.
    agentPhone: mayStoreContact ? a.phone : null,
    reacLicensed: a.reacLicensed,
    firstSeenAt: new Date(now.getTime() - a.firstSeenDaysAgo * 86_400_000),
    lastVerifiedAt,
    goneAt: null,
    rawTitle: `${sourceName} listing ${clusterId}-${index}`,
    rawBody: '',
    lawfulBasisNote: basis === undefined ? 'Unclassified source - contact withheld.' : basis,
  };
}
