/**
 * Submissions: listings people send us, held until a person has read them.
 *
 * Two routes arrive here — a renter pasting an advert (Tier 2) and an agent
 * or landlord posting their own (Tier 1). Neither goes straight into search.
 * A stranger's text is not a listing until someone has looked at it: one
 * spam post that goes live costs more trust than a day's delay ever will.
 *
 * Approval runs the listing through persistListings, the same path a
 * crawled listing takes, so placement, clustering and the derived money
 * fields all behave identically.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { UnitType } from '@/core/types';
import { persistListings, type PersistResult } from './persist';
import type { RawListing } from './adapters/types';

export type SubmissionSource = 'user-paste' | 'agent-form' | 'landlord-direct';

export interface PendingSubmission {
  id: string;
  sourceId: string;
  rawText: string;
  submittedAt: Date;
  listing: RawListing;
}

/** Corrections a reviewer may make before approving. */
export interface ReviewEdits {
  townSlug: string | null;
  monthlyRent: number | null;
  unitType: UnitType | null;
}

export async function queueSubmission(
  db: PrismaClient,
  sourceId: SubmissionSource,
  listing: RawListing,
  rawText: string,
): Promise<string> {
  const row = await db.submission.create({
    data: {
      sourceId,
      payload: toJson({ ...listing, sourceId }),
      rawText: rawText.slice(0, 8000),
      contactPhone: listing.agentPhone,
    },
  });
  return row.id;
}

export async function pendingSubmissions(db: PrismaClient, limit = 100): Promise<PendingSubmission[]> {
  const rows = await db.submission.findMany({
    where: { status: 'pending' },
    orderBy: { submittedAt: 'asc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    sourceId: r.sourceId,
    rawText: r.rawText,
    submittedAt: r.submittedAt,
    listing: fromJson(r.payload),
  }));
}

export async function pendingCount(db: PrismaClient): Promise<number> {
  return db.submission.count({ where: { status: 'pending' } });
}

export type ApproveOutcome =
  | { ok: true; result: PersistResult }
  | { ok: false; reason: 'not_found' | 'not_pending' | 'no_price' | 'no_town' };

export async function approveSubmission(
  db: PrismaClient,
  id: string,
  edits: ReviewEdits,
  now = new Date(),
): Promise<ApproveOutcome> {
  const row = await db.submission.findUnique({ where: { id } });
  if (row === null) return { ok: false, reason: 'not_found' };
  if (row.status !== 'pending') return { ok: false, reason: 'not_pending' };

  const listing = applyEdits(fromJson(row.payload), edits, row.id);
  if (listing.monthlyRent === null) return { ok: false, reason: 'no_price' };
  if (listing.townHint === null) return { ok: false, reason: 'no_town' };

  const result = await persistListings(db, [listing], now);
  if (result.created + result.updated === 0) {
    // persistListings drops what it cannot place; say which, and leave the
    // submission pending so it can be corrected and tried again.
    return { ok: false, reason: result.droppedNoPrice > 0 ? 'no_price' : 'no_town' };
  }

  await db.submission.update({
    where: { id },
    data: { status: 'approved', reviewedAt: now, payload: toJson(listing) },
  });
  return { ok: true, result };
}

export async function rejectSubmission(
  db: PrismaClient,
  id: string,
  note: string | null,
  now = new Date(),
): Promise<boolean> {
  const res = await db.submission.updateMany({
    where: { id, status: 'pending' },
    data: {
      status: 'rejected',
      reviewedAt: now,
      outcomeNote: note,
      // A rejected submission has no reason to keep anyone's number.
      contactPhone: null,
    },
  });
  return res.count > 0;
}

/**
 * Apply a reviewer's corrections and give the listing a stable identity.
 *
 * A listing is unique on (sourceId, sourceUrl). Agent posts and pasted
 * messages have no URL of their own, and they all used to share the
 * placeholder "homeguy://agent-form" — so the second agent post would have
 * overwritten the first. Each submission now gets its own.
 */
export function applyEdits(listing: RawListing, edits: ReviewEdits, submissionId: string): RawListing {
  const out: RawListing = { ...listing };
  if (edits.townSlug !== null) out.townHint = edits.townSlug;
  if (edits.monthlyRent !== null) out.monthlyRent = edits.monthlyRent;
  if (edits.unitType !== null) out.unitType = edits.unitType;
  if (!/^https?:\/\//.test(out.sourceUrl)) out.sourceUrl = `homeguy://submission/${submissionId}`;
  return out;
}

function toJson(listing: RawListing): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(listing)) as Prisma.InputJsonValue;
}

function fromJson(value: Prisma.JsonValue): RawListing {
  const obj = value as unknown as RawListing & { firstSeenAt: string | null };
  return {
    ...obj,
    firstSeenAt: obj.firstSeenAt === null ? null : new Date(obj.firstSeenAt),
  };
}
