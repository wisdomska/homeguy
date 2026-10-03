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

import type { Prisma, PrismaClient } from '@prisma/client';
import { parseGhanaPhone } from './normalise';

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

/**
 * Apply an erasure to everything we hold: live listings and anything still
 * in the review queue. Records the request for the audit trail.
 *
 * A number can be written several ways ("024 123 4567", "+233241234567"),
 * so the subject is matched in the stored form as well as as typed.
 */
export async function eraseFromDb(
  db: PrismaClient,
  subject: string,
  note: string | null,
  now = new Date(),
): Promise<ErasureOutcome> {
  const typed = subject.trim();
  const phone = parseGhanaPhone(typed);
  const phones = phone === null ? [typed] : [typed, phone];

  const listings = await db.listing.updateMany({
    where: {
      OR: [
        { agentPhone: { in: phones } },
        { agentName: { equals: typed, mode: 'insensitive' } },
      ],
    },
    data: { agentName: null, agentPhone: null },
  });

  const queued = await db.submission.findMany({
    where: { contactPhone: { in: phones } },
    select: { id: true, payload: true },
  });
  for (const q of queued) {
    const payload = { ...(q.payload as Record<string, unknown>), agentName: null, agentPhone: null };
    await db.submission.update({
      where: { id: q.id },
      data: { contactPhone: null, payload: payload as Prisma.InputJsonValue },
    });
  }

  const affected = listings.count + queued.length;
  await db.erasureRequest.create({
    data: { subject: typed, note, requestedAt: now, completedAt: now, listingsAffected: affected },
  });
  return { subject: typed, listingsAffected: affected, completedAt: now };
}
