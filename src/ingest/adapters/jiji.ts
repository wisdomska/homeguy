/**
 * Jiji — a Tier 3 source.
 *
 * Disabled by default in src/ingest/config.ts. Enabling it is a deliberate
 * act, and every run still re-checks robots.txt before a single request
 * leaves the process.
 *
 * Tier 3 rules this adapter obeys in code:
 *   - discovery is by sitemap only, never by walking search pages
 *   - agentPhone is always null, whatever the page shows. Act 843 has no
 *     public-data exemption, so a crawled number is not ours to hold. The
 *     card links back to the original listing instead.
 *   - the source name and a link back are kept on every listing, always
 */

import { fetchPolitely } from '../fetcher';
import { robotsFor } from '../robots';
import {
  normaliseMeter,
  normaliseUnitType,
  normaliseWater,
  parseAdvanceMonths,
  parseCedis,
} from '../normalise';
import {
  countMatches,
  emptyRawListing,
  firstMatch,
  textOf,
  type Adapter,
  type AdapterContext,
  type RawListing,
} from './types';

const ORIGIN = 'https://jiji.com.gh';
const SOURCE_ID = 'jiji';

export const jijiAdapter: Adapter = {
  id: SOURCE_ID,

  async discover(ctx: AdapterContext): Promise<string[]> {
    const fetchImpl = ctx.fetchImpl ?? fetch;
    const rules = await robotsFor(ORIGIN, fetchImpl);
    if (rules.sitemaps.length === 0) return [];

    const urls: string[] = [];
    for (const sitemap of rules.sitemaps) {
      if (urls.length >= ctx.limit) break;
      const res = await fetchPolitely(sitemap, { fetchImpl });
      if (!res.ok || res.body === null) continue;
      for (const m of res.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
        const loc = m[1];
        if (loc === undefined) continue;
        if (!loc.includes('/houses-apartments-for-rent')) continue;
        urls.push(loc);
        if (urls.length >= ctx.limit) break;
      }
    }
    return urls;
  },

  parse(html: string, url: string): RawListing | null {
    const title = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (title === null) return null;

    const cleanTitle = textOf(title);
    const description =
      firstMatch(html, /<div[^>]*class="[^"]*b-show-advert__description[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ??
      firstMatch(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i) ??
      '';
    const body = textOf(description);
    const haystack = `${cleanTitle} ${body}`;

    const listing = emptyRawListing(SOURCE_ID, url);
    listing.rawTitle = cleanTitle;
    listing.rawBody = body;

    listing.unitType = normaliseUnitType(haystack);

    const priceBlock =
      firstMatch(html, /<div[^>]*class="[^"]*qa-advert-price[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ?? '';
    listing.monthlyRent = parseCedis(textOf(priceBlock));
    if (listing.monthlyRent === null) listing.monthlyRent = parseCedis(haystack);

    // Advance path: null unless the page actually says.
    listing.advanceMonths = parseAdvanceMonths(haystack);

    // An agent fee is recorded only where the text names it as one.
    const feeLine = /(?:commission|agent fee|agency fee)[^.\n]{0,40}/i.exec(haystack);
    listing.agentFee = feeLine === null ? null : parseCedis(feeLine[0]);

    listing.water = normaliseWater(haystack);
    listing.meter = normaliseMeter(haystack);
    listing.polytank = /polytank|poly tank/i.test(haystack) ? true : null;
    listing.gated = /gated|walled and gated|gate/i.test(haystack) ? true : null;
    listing.toilet = /toilet[^.]{0,40}(inside|private|self)/i.test(haystack)
      ? 'Inside, private'
      : /shared\s+toilet/i.test(haystack)
        ? 'Shared'
        : null;

    listing.townHint = firstMatch(html, /itemprop="addressLocality"[^>]*>([^<]+)</i);

    listing.agentName = firstMatch(
      html,
      /<div[^>]*class="[^"]*b-seller-block__name[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    );
    if (listing.agentName !== null) listing.agentName = textOf(listing.agentName);

    // Tier 3. Never, whatever is on the page.
    listing.agentPhone = null;

    listing.photoCount = countMatches(html, /class="[^"]*qa-advert-gallery-image[^"]*"/g);

    return listing;
  },
};
