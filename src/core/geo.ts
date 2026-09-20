/**
 * Regions, towns and landmarks.
 *
 * All sixteen regions of Ghana are present. Coverage is deliberately and
 * visibly uneven: nine regions carry the counts the design seeds
 * (HomeGuy Web.dc.html:1183-1187), North East carries the 19 the start flow
 * quotes (Pass 1 - Search and Results.dc.html:2142), and six carry zero.
 *
 * `clusterCount` is not a decoration. It is the exact number of cluster rows
 * the dataset holds for that town - the generator in ./generate.ts produces
 * precisely this many, and every count rendered anywhere in the product is
 * read from the data, never from this table's intent.
 */

import type { Landmark, Region, Town } from './types';

interface TownSeed {
  name: string;
  slug: string;
  sub: string;
  clusterCount: number;
  hubTownSlug?: string;
  hubDistanceM?: number;
  lat?: number;
  lng?: number;
}

interface RegionSeed {
  name: string;
  slug: string;
  towns: TownSeed[];
}

const REGION_SEEDS: RegionSeed[] = [
  {
    name: 'Greater Accra',
    slug: 'greater-accra',
    towns: [
      { name: 'Spintex', slug: 'spintex', sub: 'Accra · area, Greater Accra', clusterCount: 512 },
      { name: 'East Legon', slug: 'east-legon', sub: 'Accra · area, Greater Accra', clusterCount: 486, lat: 5.6363, lng: -0.1626 },
      { name: 'Madina', slug: 'madina', sub: 'Accra · area, Greater Accra', clusterCount: 390 },
      { name: 'Tema', slug: 'tema', sub: 'town, Greater Accra', clusterCount: 398 },
      { name: 'Kasoa', slug: 'kasoa', sub: 'town, Greater Accra', clusterCount: 352 },
      { name: 'Adenta', slug: 'adenta', sub: 'Accra · area, Greater Accra', clusterCount: 301, hubTownSlug: 'east-legon', hubDistanceM: 9000 },
      { name: 'Lapaz', slug: 'lapaz', sub: 'Accra · area, Greater Accra', clusterCount: 289 },
      { name: 'Dansoman', slug: 'dansoman', sub: 'Accra · area, Greater Accra', clusterCount: 268 },
      { name: 'Haatso', slug: 'haatso', sub: 'Accra · area, Greater Accra', clusterCount: 241 },
      { name: 'Achimota', slug: 'achimota', sub: 'Accra · area, Greater Accra', clusterCount: 233 },
      { name: 'Osu', slug: 'osu', sub: 'Accra · area, Greater Accra', clusterCount: 214 },
      { name: 'Nungua', slug: 'nungua', sub: 'Accra · area, Greater Accra', clusterCount: 180 },
      { name: 'Teshie', slug: 'teshie', sub: 'Accra · area, Greater Accra', clusterCount: 177 },
      { name: 'Ashaiman', slug: 'ashaiman', sub: 'town, Greater Accra', clusterCount: 141 },
    ],
  },
  {
    name: 'Ashanti',
    slug: 'ashanti',
    towns: [
      { name: 'Bantama', slug: 'bantama', sub: 'Kumasi · area, Ashanti', clusterCount: 268, hubTownSlug: 'ahodwo', hubDistanceM: 4200 },
      { name: 'Suame', slug: 'suame', sub: 'Kumasi · area, Ashanti', clusterCount: 241 },
      { name: 'Ahodwo', slug: 'ahodwo', sub: 'Kumasi · area, Ashanti', clusterCount: 214, lat: 6.6666, lng: -1.6163 },
      { name: 'Asokwa', slug: 'asokwa', sub: 'Kumasi · area, Ashanti', clusterCount: 203 },
      { name: 'Oforikrom', slug: 'oforikrom', sub: 'Kumasi · area, Ashanti', clusterCount: 189 },
      { name: 'Obuasi', slug: 'obuasi', sub: 'town, Ashanti', clusterCount: 180 },
      { name: 'Nhyiaeso', slug: 'nhyiaeso', sub: 'Kumasi · area, Ashanti', clusterCount: 176, hubTownSlug: 'ahodwo', hubDistanceM: 1600 },
      { name: 'Kwadaso', slug: 'kwadaso', sub: 'Kumasi · area, Ashanti', clusterCount: 166 },
      { name: 'Tafo', slug: 'tafo', sub: 'Kumasi · area, Ashanti', clusterCount: 158 },
      { name: 'Ejisu', slug: 'ejisu', sub: 'town, Ashanti', clusterCount: 145 },
    ],
  },
  {
    name: 'Western',
    slug: 'western',
    towns: [
      { name: 'Takoradi', slug: 'takoradi', sub: 'town, Western', clusterCount: 268 },
      { name: 'Sekondi', slug: 'sekondi', sub: 'town, Western', clusterCount: 174, hubTownSlug: 'takoradi', hubDistanceM: 9500 },
      { name: 'Tarkwa', slug: 'tarkwa', sub: 'town, Western', clusterCount: 106 },
      { name: 'Axim', slug: 'axim', sub: 'town, Western', clusterCount: 64 },
    ],
  },
  {
    name: 'Central',
    slug: 'central',
    towns: [
      { name: 'Cape Coast', slug: 'cape-coast', sub: 'town, Central', clusterCount: 196 },
      { name: 'Winneba', slug: 'winneba', sub: 'town, Central', clusterCount: 118 },
      { name: 'Mankessim', slug: 'mankessim', sub: 'town, Central', clusterCount: 96 },
      { name: 'Elmina', slug: 'elmina', sub: 'town, Central', clusterCount: 78, hubTownSlug: 'cape-coast', hubDistanceM: 12000 },
    ],
  },
  {
    name: 'Eastern',
    slug: 'eastern',
    towns: [
      { name: 'Koforidua', slug: 'koforidua', sub: 'town, Eastern', clusterCount: 184 },
      { name: 'Nkawkaw', slug: 'nkawkaw', sub: 'town, Eastern', clusterCount: 92 },
      { name: 'Akosombo', slug: 'akosombo', sub: 'town, Eastern', clusterCount: 71 },
      { name: 'Suhum', slug: 'suhum', sub: 'town, Eastern', clusterCount: 55 },
    ],
  },
  {
    name: 'Northern',
    slug: 'northern',
    towns: [
      { name: 'Tamale', slug: 'tamale', sub: 'town, Northern', clusterCount: 168, lat: 9.4008, lng: -0.8393 },
      { name: 'Savelugu', slug: 'savelugu', sub: 'town, Northern', clusterCount: 28, hubTownSlug: 'tamale', hubDistanceM: 24000 },
      { name: 'Yendi', slug: 'yendi', sub: 'town, Northern', clusterCount: 18 },
    ],
  },
  {
    name: 'Volta',
    slug: 'volta',
    towns: [
      { name: 'Ho', slug: 'ho', sub: 'town, Volta', clusterCount: 104 },
      { name: 'Hohoe', slug: 'hohoe', sub: 'town, Volta', clusterCount: 48 },
      { name: 'Keta', slug: 'keta', sub: 'town, Volta', clusterCount: 34 },
    ],
  },
  {
    name: 'Upper West',
    slug: 'upper-west',
    towns: [
      { name: 'Wa', slug: 'wa', sub: 'town, Upper West', clusterCount: 31 },
      { name: 'Lawra', slug: 'lawra', sub: 'town, Upper West', clusterCount: 0, hubTownSlug: 'wa', hubDistanceM: 78000 },
      { name: 'Tumu', slug: 'tumu', sub: 'town, Upper West', clusterCount: 0 },
    ],
  },
  {
    name: 'Upper East',
    slug: 'upper-east',
    towns: [
      { name: 'Bolgatanga', slug: 'bolgatanga', sub: 'town, Upper East', clusterCount: 14, lat: 10.7856, lng: -0.8514 },
      { name: 'Navrongo', slug: 'navrongo', sub: 'town, Upper East', clusterCount: 6, hubTownSlug: 'bolgatanga', hubDistanceM: 28000 },
      { name: 'Bawku', slug: 'bawku', sub: 'town, Upper East', clusterCount: 3 },
    ],
  },
  {
    name: 'North East',
    slug: 'north-east',
    towns: [
      { name: 'Nalerigu', slug: 'nalerigu', sub: 'town, North East', clusterCount: 12 },
      { name: 'Walewale', slug: 'walewale', sub: 'town, North East', clusterCount: 7 },
    ],
  },
  // --- the six regions we track nothing in. Present on purpose. ---
  { name: 'Bono', slug: 'bono', towns: [{ name: 'Sunyani', slug: 'sunyani', sub: 'town, Bono', clusterCount: 0 }] },
  { name: 'Bono East', slug: 'bono-east', towns: [{ name: 'Techiman', slug: 'techiman', sub: 'town, Bono East', clusterCount: 0 }] },
  { name: 'Ahafo', slug: 'ahafo', towns: [{ name: 'Goaso', slug: 'goaso', sub: 'town, Ahafo', clusterCount: 0 }] },
  { name: 'Western North', slug: 'western-north', towns: [{ name: 'Sefwi Wiawso', slug: 'sefwi-wiawso', sub: 'town, Western North', clusterCount: 0 }] },
  { name: 'Oti', slug: 'oti', towns: [{ name: 'Dambai', slug: 'dambai', sub: 'town, Oti', clusterCount: 0 }] },
  { name: 'Savannah', slug: 'savannah', towns: [{ name: 'Damongo', slug: 'damongo', sub: 'town, Savannah', clusterCount: 0 }] },
];

export const REGIONS: Region[] = REGION_SEEDS.map((r) => ({
  id: r.slug,
  name: r.name,
  slug: r.slug,
}));

export const TOWNS: Town[] = REGION_SEEDS.flatMap((r) =>
  r.towns.map((t) => ({
    id: t.slug,
    regionId: r.slug,
    name: t.name,
    slug: t.slug,
    hubTownId: t.hubTownSlug === undefined ? null : t.hubTownSlug,
    hubDistanceM: t.hubDistanceM === undefined ? null : t.hubDistanceM,
    lat: t.lat === undefined ? null : t.lat,
    lng: t.lng === undefined ? null : t.lng,
    sub: t.sub,
  })),
);

/** How many cluster rows the dataset holds per town. Used by ./generate.ts. */
export const TOWN_CLUSTER_COUNT: ReadonlyMap<string, number> = new Map(
  REGION_SEEDS.flatMap((r) => r.towns.map((t) => [t.slug, t.clusterCount] as const)),
);

export const TOWN_BY_SLUG: ReadonlyMap<string, Town> = new Map(TOWNS.map((t) => [t.slug, t]));
export const REGION_BY_SLUG: ReadonlyMap<string, Region> = new Map(
  REGIONS.map((r) => [r.slug, r]),
);

export function townsInRegion(regionSlug: string): Town[] {
  return TOWNS.filter((t) => t.regionId === regionSlug);
}

/** Real landmarks, used for the landmark-relative location primitive (Dossier C10). */
const LANDMARK_SEEDS: Array<[townSlug: string, names: string[]]> = [
  ['ahodwo', ['Ahodwo Roundabout', 'Ahodwo SDA Church', 'Ahodwo Total', 'Aboabo Station', 'Nhyiaeso Police Station']],
  ['bantama', ['Bantama Total', 'Bantama Market', 'Komfo Anokye Gate']],
  ['nhyiaeso', ['Nhyiaeso Clinic', 'Nhyiaeso Police Station']],
  ['east-legon', ['Shiashie Total', 'A&C Mall', 'American House', 'Boundary Road']],
  ['adenta', ['Adenta Barrier', 'Adenta Housing Down']],
  ['tamale', ['Vitting Junction', 'Lamashegu Market', 'Tamale Central Mosque']],
  ['bolgatanga', ['Bolga SSNIT Flats', 'Zaare Junction', 'Bolga Market']],
  ['navrongo', ['Navrongo Health Centre', 'Navrongo Cathedral']],
  ['wa', ['Wa Polytechnic Junction', 'Wa Central Market']],
  ['bawku', ['Bawku Market']],
  ['takoradi', ['Market Circle', 'Takoradi Harbour Road']],
  ['cape-coast', ['Kotokuraba Market', 'UCC North Gate']],
  ['koforidua', ['Koforidua Jackson Park', 'Effiduase Junction']],
  ['ho', ['Ho Bankoe Junction', 'Ho Polytechnic Gate']],
  ['tema', ['Tema Community 1 Market', 'Tema Station']],
  ['spintex', ['Spintex Palace Mall', 'Coca-Cola Roundabout']],
  ['madina', ['Madina Zongo Junction', 'Madina Market']],
  ['nalerigu', ['Nalerigu Hospital Junction']],
  ['walewale', ['Walewale Market']],
];

export const LANDMARKS: Landmark[] = LANDMARK_SEEDS.flatMap(([townSlug, names]) =>
  names.map((name, i) => ({
    id: `${townSlug}-lm-${i}`,
    townId: townSlug,
    name,
    lat: null,
    lng: null,
  })),
);

export const LANDMARK_BY_ID: ReadonlyMap<string, Landmark> = new Map(
  LANDMARKS.map((l) => [l.id, l]),
);

export function landmarksInTown(townSlug: string): Landmark[] {
  return LANDMARKS.filter((l) => l.townId === townSlug);
}
