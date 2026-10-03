import { NextResponse } from 'next/server';
import { db, hasDatabase } from '@/core/db';
import { UNIT_TYPES, type UnitType } from '@/core/types';
import { approveSubmission, rejectSubmission } from '@/ingest/submissions';
import { eraseFromDb } from '@/ingest/erase';
import { resolveReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

/**
 * The review queue's buttons. Behind Basic auth like the rest of /admin.
 *
 * A browser resends Basic credentials on any request to this origin, a
 * cross-site form post included, so the Origin header is checked too:
 * without that, any page an admin visited could approve or take down
 * listings in their name.
 */
export async function POST(request: Request) {
  const back = (outcome: string) =>
    NextResponse.redirect(new URL(`/admin/review?outcome=${outcome}`, request.url), 303);

  const origin = request.headers.get('origin');
  if (origin === null || origin !== new URL(request.url).origin) {
    return back('bad_origin');
  }
  if (!hasDatabase()) return back('not_found');

  const form = await request.formData();
  const kind = String(form.get('kind') ?? '');
  const id = String(form.get('id') ?? '');
  const action = String(form.get('action') ?? '');

  if (kind === 'submission') {
    if (action === 'reject') {
      return back((await rejectSubmission(db(), id, null)) ? 'rejected' : 'not_pending');
    }
    if (action === 'approve') {
      const townSlug = String(form.get('townSlug') ?? '').trim();
      const unitType = String(form.get('unitType') ?? '');
      const rentText = String(form.get('rent') ?? '').replace(/[,\s]/g, '');
      const rent = rentText === '' ? NaN : Number(rentText);
      const outcome = await approveSubmission(db(), id, {
        townSlug: townSlug === '' ? null : townSlug,
        monthlyRent: Number.isFinite(rent) && rent > 0 ? Math.round(rent * 100) : null,
        unitType: (UNIT_TYPES as readonly string[]).includes(unitType) ? (unitType as UnitType) : null,
      });
      return back(outcome.ok ? 'approved' : outcome.reason);
    }
  }

  if (kind === 'report' && (action === 'takedown' || action === 'dismiss')) {
    const done = await resolveReport(id, action, null);
    if (!done) return back('not_pending');
    return back(action === 'takedown' ? 'takedown' : 'dismissed');
  }

  if (kind === 'erasure') {
    const subject = String(form.get('subject') ?? '').trim();
    const note = String(form.get('note') ?? '').trim();
    if (subject.length < 3) return back('erase_empty');
    const done = await eraseFromDb(db(), subject, note === '' ? null : note);
    return back(`erased_${done.listingsAffected}`);
  }

  return back('not_found');
}
