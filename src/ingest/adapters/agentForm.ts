/**
 * Agent direct — a Tier 1 source.
 *
 * This is the one built first and the one that matters longest. An agent
 * posts through a HomeGuy form, or forwards the WhatsApp broadcast they
 * already send; we parse it into a listing. Zero behaviour change for them,
 * consented data for us, and the listing arrives before the portals get it.
 *
 * Because consent is given at submission, this is the tier that may hold a
 * contact number - and the deletion path in src/ingest/erase.ts is wired
 * from day one rather than retrofitted.
 */

import { sourceConfig } from '../config';
import {
  normaliseMeter,
  normaliseUnitType,
  normaliseWater,
  parseAdvanceMonths,
  parseCedis,
  parseGhanaPhone,
} from '../normalise';
import { emptyRawListing, type RawListing } from './types';

export interface AgentSubmission {
  /** The whole message, as the agent wrote or forwarded it. */
  text: string;
  townSlug: string;
  agentName: string | null;
  /** The number the agent gave us, with consent, at submission. */
  agentPhone: string | null;
  photoCount: number;
  /** Where a renter can see the original, if there is one. */
  sourceUrl: string | null;
  submittedAt: Date;
}

export function parseAgentSubmission(s: AgentSubmission): RawListing {
  const cfg = sourceConfig('agent-form');
  const mayStoreContact = cfg === null ? false : cfg.mayStoreContact;

  const listing = emptyRawListing('agent-form', s.sourceUrl ?? 'homeguy://agent-form');
  listing.rawTitle = s.text.split('\n')[0]?.slice(0, 140) ?? '';
  listing.rawBody = s.text;
  listing.townHint = s.townSlug;
  listing.firstSeenAt = s.submittedAt;
  listing.photoCount = s.photoCount;

  listing.unitType = normaliseUnitType(s.text);
  listing.monthlyRent = parseCedis(s.text);
  listing.advanceMonths = parseAdvanceMonths(s.text);

  // An agent fee is only recorded when the message names it as one.
  const feeLine = /(?:commission|agent fee|agency fee)[^\n]{0,40}/i.exec(s.text);
  listing.agentFee = feeLine === null ? null : parseCedis(feeLine[0]);

  listing.water = normaliseWater(s.text);
  listing.meter = normaliseMeter(s.text);
  listing.polytank = /polytank|poly tank/i.test(s.text) ? true : null;
  listing.gated = /gated|gate|walled/i.test(s.text) ? true : null;

  const waterDays = /(\d)\s*days?\s*(?:a\s*week|per\s*week|weekly)/i.exec(s.text);
  listing.waterDays =
    waterDays === null ? null : clampDays(Number(waterDays[1]));

  listing.agentName = s.agentName;
  listing.agentPhone = mayStoreContact
    ? (s.agentPhone ?? parseGhanaPhone(s.text))
    : null;

  const directions = /(?:directions?|how to get there|from)\s*[:\-]?\s*([^\n]{20,240})/i.exec(
    s.text,
  );
  listing.directions = directions === null ? null : (directions[1]?.trim() ?? null);

  return listing;
}

function clampDays(n: number): number | null {
  if (!Number.isInteger(n)) return null;
  if (n < 0 || n > 7) return null;
  return n;
}
