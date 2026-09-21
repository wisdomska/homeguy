/**
 * Normalisation: free Ghanaian listing text to our enums.
 *
 * Listings here are written loosely - "chamber n hall s/c", "2 bdrm s/c",
 * "chamba and hall selfcontain" - so this keeps a synonym table rather than
 * a regex someone will quietly widen.
 *
 * The rule that matters, and the one the tests enforce: when confidence is
 * low, return null. Never a guess. This is Contract B at the data layer -
 * "not stated" is a complete, respectable answer, and a wrong unit type or
 * an invented advance term is worse than an empty field.
 */

import type { MeterArrangement, UnitType, WaterSource } from '@/core/types';

function squash(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* ---- unit type ------------------------------------------------------- */

const UNIT_SYNONYMS: Array<[UnitType, string[]]> = [
  [
    'chamber_and_hall_self_contain',
    [
      'chamber and hall self contain',
      'chamber and hall selfcontain',
      'chamber n hall s c',
      'chamber hall s c',
      'ch and hall self contained',
      'chamber and hall self contained',
      'cnh self contain',
      'chamba and hall self contain',
    ],
  ],
  [
    'chamber_and_hall',
    ['chamber and hall', 'chamber n hall', 'chamber hall', 'cnh', 'chamba and hall'],
  ],
  [
    'single_room_self_contain',
    [
      'single room self contain',
      'single room selfcontain',
      'single room s c',
      'one room self contain',
      'single room self contained',
      'sr s c',
    ],
  ],
  ['single_room', ['single room', 'one room', 'a room', 'single rooms']],
  [
    'self_contain_studio',
    ['self contain studio', 'studio', 'studio apartment', 'self contained studio'],
  ],
  ['boys_quarters', ['boys quarters', 'boys quarter', 'bq', 'boy quarters']],
  ['hostel_bed', ['hostel bed', 'hostel space', 'bed space', 'hostel']],
  ['bedroom_1', ['1 bedroom', 'one bedroom', '1 bdrm', '1br', 'single bedroom apartment']],
  ['bedroom_2', ['2 bedroom', 'two bedroom', '2 bdrm', '2br']],
  ['bedroom_3', ['3 bedroom', 'three bedroom', '3 bdrm', '3br']],
  [
    'bedroom_4_plus',
    ['4 bedroom', 'four bedroom', '4 bdrm', '4br', '5 bedroom', 'five bedroom'],
  ],
];

/**
 * Longest synonym wins, so "chamber and hall self contain" is never
 * mistaken for "chamber and hall".
 */
export function normaliseUnitType(text: string): UnitType | null {
  const s = squash(text);
  let best: { type: UnitType; length: number } | null = null;
  for (const [type, synonyms] of UNIT_SYNONYMS) {
    for (const syn of synonyms) {
      if (s.includes(syn) && (best === null || syn.length > best.length)) {
        best = { type, length: syn.length };
      }
    }
  }
  return best === null ? null : best.type;
}

/* ---- water ----------------------------------------------------------- */

const WATER_SYNONYMS: Array<[WaterSource, string[]]> = [
  ['gwcl', ['gwcl', 'ghana water', 'pipe borne', 'pipe water', 'water company', 'town water']],
  ['borehole', ['borehole', 'bore hole', 'mechanised borehole', 'well water']],
  ['tanker', ['tanker', 'water tanker', 'tanker supply', 'we buy water']],
];

export function normaliseWater(text: string): WaterSource | null {
  const s = squash(text);
  for (const [value, synonyms] of WATER_SYNONYMS) {
    if (synonyms.some((syn) => s.includes(syn))) return value;
  }
  return null;
}

/* ---- meter ----------------------------------------------------------- */

const METER_SYNONYMS: Array<[MeterArrangement, string[]]> = [
  ['prepaid', ['prepaid', 'pre paid', 'prepaid meter', 'pre paid meter']],
  ['self', ['self meter', 'own meter', 'separate meter', 'individual meter', 'personal meter']],
  ['shared', ['shared meter', 'share meter', 'one meter for all', 'common meter']],
];

export function normaliseMeter(text: string): MeterArrangement | null {
  const s = squash(text);
  for (const [value, synonyms] of METER_SYNONYMS) {
    if (synonyms.some((syn) => s.includes(syn))) return value;
  }
  return null;
}

/* ---- money and advance ----------------------------------------------- */

/**
 * Parse a cedi amount out of listing text. Returns minor units, or null.
 *
 * Refuses anything ambiguous: a bare "500" with no currency marker could be
 * a rent, a plot size or a phone fragment, so it is not a price.
 */
export function parseCedis(text: string): number | null {
  const m = /(?:gh[c¢₵s]?|ghs|cedis?)\s*([0-9][0-9,\s]*(?:\.[0-9]{1,2})?)/i.exec(text);
  if (m === null) return null;
  const raw = m[1];
  if (raw === undefined) return null;
  const digits = raw.replace(/[,\s]/g, '');
  if (digits.length === 0) return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return Math.round(n * 100);
}

/**
 * Parse an advance term in months.
 *
 * THIS IS IN THE ADVANCE PATH. It returns null far more often than it
 * returns a number, and that is correct. There is no fallback here, no
 * "most landlords ask 12", no inference from the price. A listing that does
 * not state its advance has no advance, and the product says so.
 */
export function parseAdvanceMonths(text: string): number | null {
  const s = text.toLowerCase();

  const numeric = /(\d{1,2})\s*(?:months?|mths?|mos?)\s*(?:advance|adv|upfront|up front|deposit)/.exec(s);
  if (numeric !== null) return clampMonths(Number(numeric[1]));

  const reversed = /(?:advance|adv|upfront|up front)\s*(?:of|:)?\s*(\d{1,2})\s*(?:months?|mths?|mos?)?/.exec(s);
  if (reversed !== null) return clampMonths(Number(reversed[1]));

  const words: Array<[string, number]> = [
    ['one year advance', 12],
    ['1 year advance', 12],
    ['two years advance', 24],
    ['2 years advance', 24],
    ['six months advance', 6],
    ['twelve months advance', 12],
  ];
  for (const [phrase, months] of words) {
    if (s.includes(phrase)) return months;
  }

  return null;
}

function clampMonths(n: number): number | null {
  if (!Number.isInteger(n)) return null;
  if (n < 1) return null;
  if (n > 48) return null;
  return n;
}

/* ---- landmark -------------------------------------------------------- */

/** "~300m from Shiashie Total" out of free text, or null. */
export function parseLandmark(
  text: string,
  known: string[],
): { name: string; distanceM: number | null } | null {
  const s = text.toLowerCase();
  const hit = known.find((k) => s.includes(k.toLowerCase()));
  if (hit === undefined) return null;

  const m = /(\d{1,4})\s*(m|metres?|meters?|km)\b/.exec(s);
  if (m === null) return { name: hit, distanceM: null };
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return { name: hit, distanceM: null };
  const unitMatch = m[2];
  const unit = unitMatch === undefined ? 'm' : unitMatch;
  return { name: hit, distanceM: unit === 'km' ? value * 1000 : value };
}

/* ---- phone ----------------------------------------------------------- */

/**
 * Extract a Ghanaian mobile number. Only ever called for sources whose
 * config sets mayStoreContact - a crawled page's number is never passed
 * here at all.
 */
export function parseGhanaPhone(text: string): string | null {
  const m = /(?:\+233|0)\s?(\d{2})\s?(\d{3})\s?(\d{4})/.exec(text.replace(/[-().]/g, ''));
  if (m === null) return null;
  return `+233 ${m[1]} ${m[2]} ${m[3]}`;
}

/* ---- neighbourhood ---------------------------------------------------- */

/**
 * The place named inside a listing title.
 *
 * Jiji and Tonaton file every Kumasi advert under the district — "Ashanti,
 * Kumasi Metropolitan" — so the neighbourhood a renter actually navigates
 * by exists only in the title:
 *
 *   "5bdrm Apartment in Ahodwo Melcom, Kumasi Metropolitan for rent"
 *
 * Without this, searching Ahodwo returned nothing while the index held the
 * listing, and every card read "Location not stated".
 *
 * Returns null rather than a guess when the fragment is obviously a seller
 * rather than a place — "Alex Otuo Properties", "Free Will Agency". Those
 * are the advertiser's name, and treating them as a location would put a
 * company where a neighbourhood should be.
 */
const SELLER_MARKERS =
  /\b(agency|agencies|properties|property|realty|real\s*estate|ltd|limited|company|enterprise|ventures|consult|investments?)\b/i;

export function parseNeighbourhood(title: string, townName: string): string | null {
  const m = /\bin\s+([^,]{3,40}),/i.exec(title);
  if (m === null) return null;
  const raw = m[1];
  if (raw === undefined) return null;

  const place = raw.trim().replace(/\s+/g, ' ');
  if (place.length < 3) return null;

  // The district repeated is not a neighbourhood.
  if (place.toLowerCase() === townName.toLowerCase()) return null;

  // A trailing preposition means the title was cut mid-phrase:
  // "Mark Estate At", "Trimude Agency And".
  if (/\b(at|and|near|by|off|for|with)$/i.test(place)) return null;

  if (SELLER_MARKERS.test(place)) return null;

  return place;
}
