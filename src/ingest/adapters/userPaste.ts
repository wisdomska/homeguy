/**
 * User paste — the Tier 2 source, and the highest-signal, lowest-risk
 * channel we have.
 *
 * A person pastes a Jiji URL, a Facebook post or a WhatsApp forward. We
 * fetch that one public page because a human asked us to, parse it, cluster
 * it, and credit the contributor. Fetching one page on a person's request
 * is a completely different act from crawling a site, and it is the route
 * by which membership-gated content legitimately reaches the index - the
 * group itself stays out of scope.
 *
 * If the link needs a login, we say so and ask for the text instead. We do
 * not work around a gate.
 */

import { isDenied } from '../config';
import { fetchPolitely } from '../fetcher';
import { jijiAdapter } from './jiji';
import { parseAgentSubmission } from './agentForm';
import {
  normaliseMeter,
  normaliseUnitType,
  normaliseWater,
  parseAdvanceMonths,
  parseCedis,
  parseGhanaPhone,
} from '../normalise';
import { emptyRawListing, type RawListing } from './types';

export type PasteOutcome =
  | { status: 'parsed'; listing: RawListing }
  | { status: 'needs_text'; reason: string }
  | { status: 'rejected'; reason: string };

/** Hosts we can fetch and parse directly, because we have an adapter. */
const DIRECT_PARSERS: Record<string, (html: string, url: string) => RawListing | null> = {
  'jiji.com.gh': jijiAdapter.parse,
};

export async function ingestPaste(
  input: string,
  options: { townSlug: string | null; fetchImpl?: typeof fetch; now?: Date } = {
    townSlug: null,
  },
): Promise<PasteOutcome> {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { status: 'rejected', reason: 'empty' };

  const url = firstUrl(trimmed);

  // No link at all: treat the whole thing as a forwarded message. This is
  // the WhatsApp broadcast case, and it is the common one.
  if (url === null) {
    if (trimmed.length < 30) return { status: 'rejected', reason: 'too_short' };
    return {
      status: 'parsed',
      listing: parseAgentSubmission({
        text: trimmed,
        townSlug: options.townSlug ?? '',
        agentName: null,
        agentPhone: parseGhanaPhone(trimmed),
        photoCount: 0,
        sourceUrl: null,
        submittedAt: options.now ?? new Date(),
      }),
    };
  }

  // A link into a membership-gated network. We do not fetch it, and we say
  // plainly why rather than failing silently.
  if (isDenied(url)) {
    if (trimmed.length > 60) {
      // They pasted the post text alongside the link. Use the text.
      return {
        status: 'parsed',
        listing: fromFreeText(trimmed, url, options.townSlug, options.now ?? new Date()),
      };
    }
    return { status: 'needs_text', reason: 'login_required' };
  }

  const res = await fetchPolitely(url, { fetchImpl: options.fetchImpl });
  if (!res.ok || res.body === null) {
    if (res.refusedReason === 'gated') return { status: 'needs_text', reason: 'login_required' };
    return { status: 'rejected', reason: res.refusedReason ?? `http_${res.status}` };
  }

  const host = new URL(url).hostname.replace(/^www\./, '');
  const direct = DIRECT_PARSERS[host];
  if (direct !== undefined) {
    const parsed = direct(res.body, url);
    if (parsed !== null) {
      // Arrived on the consent path, but the page is still a crawled page:
      // no number is lifted from it.
      parsed.sourceId = 'user-paste';
      return { status: 'parsed', listing: parsed };
    }
  }

  return {
    status: 'parsed',
    listing: fromFreeText(stripTags(res.body), url, options.townSlug, options.now ?? new Date()),
  };
}

function fromFreeText(
  text: string,
  sourceUrl: string,
  townSlug: string | null,
  now: Date,
): RawListing {
  const listing = emptyRawListing('user-paste', sourceUrl);
  listing.rawTitle = text.split('\n')[0]?.slice(0, 140) ?? '';
  listing.rawBody = text.slice(0, 4000);
  listing.townHint = townSlug;
  listing.firstSeenAt = now;
  listing.unitType = normaliseUnitType(text);
  listing.monthlyRent = parseCedis(text);
  listing.advanceMonths = parseAdvanceMonths(text);
  listing.water = normaliseWater(text);
  listing.meter = normaliseMeter(text);
  listing.polytank = /polytank|poly tank/i.test(text) ? true : null;
  listing.gated = /gated|walled/i.test(text) ? true : null;
  // The paste route is a consent path, so a number the contributor included
  // may be held - and is deletable on request from day one.
  listing.agentPhone = parseGhanaPhone(text);
  return listing;
}

function firstUrl(text: string): string | null {
  const m = /https?:\/\/[^\s<>"']+/i.exec(text);
  return m === null ? null : m[0];
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
