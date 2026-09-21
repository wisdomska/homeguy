/**
 * Jiji and Tonaton, through the JSON listing endpoint their own front end
 * calls.
 *
 * Both sites are the same platform, and both expose
 *   /api_web/v1/listing?slug=…&sort=new&page=N
 * which returns named fields and real numbers. It is a far better target
 * than either the markup or the embedded payload: it paginates, it sorts by
 * newest — exactly what an hourly "what is new" pass wants — and a CSS
 * change cannot break it.
 *
 * robots.txt on both hosts disallows only /test/, /admin/, /crm/ and
 * /auth/facebook. This path is permitted, and every request still goes out
 * through src/ingest/fetcher.ts, so the 2s interval, the backoff and the
 * 403 hard stop all apply.
 *
 * Worth knowing when reading coverage numbers: Tonaton is Jiji's sibling
 * and carries largely the same inventory. Clustering is what stops that
 * showing up as two rooms instead of one.
 */

import {
  normaliseMeter,
  normaliseUnitType,
  normaliseWater,
  parseAdvanceMonths,
} from '../normalise';
import { emptyRawListing, type RawListing } from './types';

export interface ApiSourceConfig {
  id: string;
  origin: string;
  /** Category slug on that host. */
  slug: string;
}

export const JIJI_API: ApiSourceConfig = {
  id: 'jiji',
  origin: 'https://jiji.com.gh',
  slug: 'houses-apartments-for-rent',
};

export const TONATON_API: ApiSourceConfig = {
  id: 'tonaton',
  origin: 'https://tonaton.com',
  slug: 'houses-apartments-for-rent',
};

export function listingApiUrl(cfg: ApiSourceConfig, page: number): string {
  const p = new URLSearchParams({
    slug: cfg.slug,
    init_page: page <= 1 ? 'true' : 'false',
    webp: 'true',
    sort: 'new',
  });
  if (page > 1) p.set('page', String(page));
  return `${cfg.origin}/api_web/v1/listing?${p.toString()}`;
}

interface ApiAdvert {
  id?: unknown;
  guid?: unknown;
  url?: unknown;
  slug?: unknown;
  title?: unknown;
  short_description?: unknown;
  price_obj?: unknown;
  region_item_text?: unknown;
  region_name?: unknown;
  region_parent_name?: unknown;
  images?: unknown;
  images_count?: unknown;
  attrs?: unknown;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

export interface ApiPage {
  listings: RawListing[];
  /** Path to the next page, if the API offered one. */
  nextUrl: string | null;
}

export function parseApiPage(body: string, cfg: ApiSourceConfig): ApiPage {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { listings: [], nextUrl: null };
  }
  if (json === null || typeof json !== 'object') return { listings: [], nextUrl: null };

  const root = json as { adverts_list?: unknown; next_url?: unknown };
  const listRoot = root.adverts_list;
  const adverts =
    listRoot !== null && typeof listRoot === 'object' && Array.isArray((listRoot as { adverts?: unknown }).adverts)
      ? ((listRoot as { adverts: unknown[] }).adverts)
      : [];

  const listings: RawListing[] = [];
  for (const a of adverts) {
    if (a === null || typeof a !== 'object') continue;
    const parsed = fromApiAdvert(a as ApiAdvert, cfg);
    if (parsed !== null) listings.push(parsed);
  }

  return { listings, nextUrl: str(root.next_url) };
}

export function fromApiAdvert(a: ApiAdvert, cfg: ApiSourceConfig): RawListing | null {
  const title = str(a.title);
  if (title === null) return null;

  // Jiji gives a path; Tonaton gives a guid and a slug we assemble.
  const path = str(a.url);
  const guid = str(a.guid);
  const slug = str(a.slug);
  const href =
    path !== null
      ? path
      : guid !== null && slug !== null
        ? `/a-${guid}-${slug}.html`
        : null;
  if (href === null) return null;

  const listing = emptyRawListing(
    cfg.id,
    href.startsWith('http') ? href : `${cfg.origin}${href}`,
  );

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
    // Only a monthly figure is a monthly rent. "per year" and "per day"
    // both appear on these sites and are not what a card shows.
    if (typeof p.value === 'number' && p.value > 0 && str(p.period) === 'per month') {
      listing.monthlyRent = Math.round(p.value * 100);
    }
  }

  // --- the advance path ---
  // Neither site has an advance field. It stays null unless the seller
  // happened to write a term into the text, which is rare. Nothing is
  // inferred from the price, and there is no fallback.
  listing.advanceMonths = parseAdvanceMonths(haystack);

  // --- where ---
  // "Greater Accra, Weija" -> region "Greater Accra", area "Weija".
  const combined = str(a.region_item_text);
  if (combined !== null) {
    const parts = combined.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.length >= 2) {
      listing.regionHint = parts[0] ?? null;
      listing.townHint = parts[parts.length - 1] ?? null;
    } else {
      listing.regionHint = parts[0] ?? null;
      listing.townHint = parts[0] ?? null;
    }
  } else {
    listing.regionHint = str(a.region_parent_name);
    listing.townHint = str(a.region_name);
  }

  // --- photos, referenced not copied ---
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

  // --- named attributes ---
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
          value <= 1 ? 'bedroom_1' : value === 2 ? 'bedroom_2' : value === 3 ? 'bedroom_3' : 'bedroom_4_plus';
      }
      if (lower === 'bathrooms' && typeof value === 'number' && value > 0) {
        listing.bathroom = 'Inside, private';
      }
      if (lower === 'furnishing') {
        const v = str(value);
        if (v !== null) listing.rawBody = `${listing.rawBody}\nFurnishing: ${v}`.trim();
      }
    }
  }

  // Tier 3. Never, whatever the response contains.
  listing.agentName = null;
  listing.agentPhone = null;

  return listing;
}
