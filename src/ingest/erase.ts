/**
 * Deletion on request, wired from day one rather than retrofitted.
 *
 * Agent names and phone numbers are personal data under Ghana's Data
 * Protection Act, 2012 (Act 843), which has no public-data exemption and
 * whose enforcement began in January 2026. A data subject can ask for their
 * details to be removed, and s.33 gives them that right; this is the code
 * path that honours it.
 *
 * It is deliberately separate from a takedown (which removes a listing).
 * An erasure removes the person from a listing that may legitimately stay.
 */

export interface ErasureRequest {
  /** The number or name the request is about. */
  subject: string;
  requestedAt: Date;
  /** Free text from the requester, kept for the audit trail. */
  note: string | null;
}

export interface ErasureOutcome {
  subject: string;
  listingsAffected: number;
  completedAt: Date;
}

export interface ErasableListing {
  id: string;
  agentName: string | null;
  agentPhone: string | null;
}

/**
 * Strip the personal fields, keep the listing. The source link stays, so a
 * renter can still reach the original - we simply stop holding the person's
 * details ourselves.
 */
export function eraseSubject(
  listings: ErasableListing[],
  subject: string,
): { listings: ErasableListing[]; affected: number } {
  const needle = subject.replace(/\s+/g, '').toLowerCase();
  let affected = 0;
  const next = listings.map((l) => {
    const phone = (l.agentPhone ?? '').replace(/\s+/g, '').toLowerCase();
    const name = (l.agentName ?? '').replace(/\s+/g, '').toLowerCase();
    if (phone === needle || name === needle) {
      affected += 1;
      return { ...l, agentName: null, agentPhone: null };
    }
    return l;
  });
  return { listings: next, affected };
}
