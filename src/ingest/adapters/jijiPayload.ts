/**
 * Jiji, parsed from the page's own data payload rather than its markup.
 *
 * Jiji is a Nuxt app and ships every listing on the page inside a
 * `__NUXT_DATA__` script as devalue-serialised JSON. Parsing that instead
 * of the rendered HTML is better in every way that matters here: the fields
 * are named, the numbers are numbers, and a CSS class rename — the usual
 * cause of silent parser rot — does not touch it.
 *
 * What the payload actually carries, confirmed against a live page:
 *   url, title, short_description
 *   price_obj: { value, view, period }      period is always "per month"
 *   region_name, region_slug, region_parent_name
 *   images: [{ url, size }]                 300px WebP on their CDN
 *   attrs: [{ name, value, unit }]          Listing by, Bedrooms, Furnishing…
 *
 * The thing it does NOT carry is the advance term. Jiji publishes a monthly
 * rent and nothing else, so `advanceMonths` is null on essentially every
 * listing from this source, and total cash to move in is therefore null
 * too. That is not a parser limitation to work around — it is what the
 * market publishes, and the product says so rather than inventing a term.
 */

import { normaliseMeter, normaliseUnitType, normaliseWater, parseAdvanceMonths } from '../normalise';
import { emptyRawListing, type RawListing } from './types';

const SOURCE_ID = 'jiji';
const ORIGIN = 'https://jiji.com.gh';

/** A devalue payload: a flat array where objects hold key -> index. */
export type Payload = unknown[];

export function extractPayload(html: string): Payload | null {
  const m = /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (m === null) return null;
  const raw = m[1];
  if (raw === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Resolve one index into a plain value, following the index references. */
function hydrate(payload: Payload, index: unknown, depth = 0): unknown {
  if (typeof index !== 'number') return null;
  if (depth > 8) return null;
  const v = payload[index];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => hydrate(payload, x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, idx] of Object.entries(v as Record<string, unknown>)) {
    out[k] = hydrate(payload, idx, depth + 1);
  }
  return out;
}

/** Indices of the objects that look like an advert. */
export function findAdverts(payload: Payload): number[] {
  const out: number[] = [];
  payload.forEach((v, i) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return;
    const urlIdx = (v as Record<string, unknown>)['url'];
    if (typeof urlIdx !== 'number') return;
    const url = payload[urlIdx];
    if (typeof url === 'string' && url.endsWith('.html')) out.push(i);
  });
  return out;
}

interface Advert {
  url?: unknown;
  title?: unknown;
  short_description?: unknown;
  price_obj?: unknown;
  region_name?: unknown;
  region_parent_name?: unknown;
  region_slug?: unknown;
  images?: unknown;
  images_count?: unknown;
  attrs?: unknown;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

/** Every listing URL on the page, for the fetch stage to queue. */
export function listingUrls(html: string): string[] {
  const payload = extractPayload(html);
  if (payload === null) return [];
  const out: string[] = [];
  for (const i of findAdverts(payload)) {
    const a = hydrate(payload, i) as Advert | null;
    const u = a === null ? null : str(a.url);
    if (u !== null) out.push(u.startsWith('http') ? u : `${ORIGIN}${u}`);
  }
  return [...new Set(out)];
}

/**
 * Parse every advert on an index page.
 *
 * Index pages carry enough to build a real card — price, title, location,
 * a thumbnail — so a run does not need to fetch 27 detail pages to show
 * something useful. Detail pages are fetched later, one at a time, for the
 * attributes the index omits.
 */
export function parseIndex(html: string): RawListing[] {
  const payload = extractPayload(html);
  if (payload === null) return [];

  const out: RawListing[] = [];
  for (const i of findAdverts(payload)) {
    const a = hydrate(payload, i) as Advert | null;
    if (a === null) continue;
    const parsed = fromAdvert(a);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

export function fromAdvert(a: Advert): RawListing | null {
  const url = str(a.url);
  const title = str(a.title);
  if (url === null || title === null) return null;

  const listing = emptyRawListing(SOURCE_ID, url.startsWith('http') ? url : `${ORIGIN}${url}`);
  const description = str(a.short_description);
  listing.rawTitle = title;
  listing.rawBody = description === null ? '' : description;

  const haystack = `${title} ${listing.rawBody}`;
  listing.unitType = normaliseUnitType(haystack);
  listing.water = normaliseWater(haystack);
  listing.meter = normaliseMeter(haystack);
  listing.polytank = /polytank|poly tank/i.test(haystack) ? true : null;
  listing.gated = /gated|walled/i.test(haystack) ? true : null;

  // --- money ---
  const price = a.price_obj;
  if (price !== null && typeof price === 'object') {
    const p = price as { value?: unknown; period?: unknown };
    const period = str(p.period);
    // Only a monthly figure is a monthly rent. "per year" and "per day"
    // exist on this source and are not what we are showing.
    if (typeof p.value === 'number' && p.value > 0 && period === 'per month') {
      listing.monthlyRent = Math.round(p.value * 100);
    }
  }

  // --- the advance path ---
  // Jiji has no advance field. It is null unless the seller happened to
  // write the term into the title or description, which is rare. There is
  // no inference here and no fallback.
  listing.advanceMonths = parseAdvanceMonths(haystack);

  // --- where ---
  const area = str(a.region_name);
  const parent = str(a.region_parent_name);
  listing.townHint = area === null ? parent : area;
  if (area !== null && parent !== null) {
    listing.rawBody = `${listing.rawBody}\n${area}, ${parent}`.trim();
  }

  // --- photos ---
  // We reference the source's own image rather than copying it: no copy is
  // made by us, and the card links back to the listing it came from.
  const images = a.images;
  if (Array.isArray(images)) {
    const first = images.find(
      (im): im is { url: string } =>
        im !== null && typeof im === 'object' && typeof (im as { url?: unknown }).url === 'string',
    );
    if (first !== undefined) listing.thumbnailUrl = first.url;
  }
  const count = a.images_count;
  listing.photoCount =
    typeof count === 'number' && count >= 0
      ? count
      : Array.isArray(images)
        ? images.length
        : 0;

  // --- attributes the payload names explicitly ---
  const attrs = a.attrs;
  if (Array.isArray(attrs)) {
    for (const at of attrs) {
      if (at === null || typeof at !== 'object') continue;
      const name = str((at as { name?: unknown }).name);
      const value = (at as { value?: unknown }).value;
      if (name === null) continue;
      const lower = name.toLowerCase();
      if (lower === 'bedrooms' && typeof value === 'number') {
        listing.unitType =
          value === 1 ? 'bedroom_1' : value === 2 ? 'bedroom_2' : value === 3 ? 'bedroom_3' : 'bedroom_4_plus';
      }
      if (lower === 'furnishing') {
        const v = str(value);
        if (v !== null) listing.rawBody = `${listing.rawBody}\nFurnishing: ${v}`;
      }
      if (lower === 'toilets' || lower === 'bathrooms') {
        listing.bathroom = typeof value === 'number' && value > 0 ? 'Inside, private' : null;
      }
    }
  }

  // Tier 3. Never, whatever the page shows.
  listing.agentPhone = null;
  listing.agentName = null;

  return listing;
}
