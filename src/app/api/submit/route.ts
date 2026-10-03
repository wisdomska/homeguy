import { NextResponse } from 'next/server';
import { POST as COPY } from '@/core/copy';
import { db, hasDatabase } from '@/core/db';
import { parseAgentSubmission } from '@/ingest/adapters/agentForm';
import { parseGhanaPhone } from '@/ingest/normalise';
import { queueSubmission } from '@/ingest/submissions';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Tier 1: an agent or landlord posting their own listing.
 *
 * Consent to show a name and number is given here, explicitly, which is the
 * only route on which HomeGuy holds contact details at all. The listing is
 * queued for a person to read; nothing posted here is live until then.
 */
export async function POST(request: Request) {
  const key =
    request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous';
  if (!rateLimit(`submit:${key}`, 5, 60_000)) {
    return NextResponse.json({ ok: false, message: COPY.errorBusy }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: COPY.errorMissing }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
  const townSlug = typeof body.townSlug === 'string' ? body.townSlug.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const phone = typeof body.phone === 'string' ? parseGhanaPhone(body.phone) : null;
  const role = body.role === 'landlord' ? 'landlord-direct' : 'agent-form';

  if (text.length < 20 || townSlug.length === 0 || phone === null || body.consent !== true) {
    return NextResponse.json({ ok: false, message: COPY.errorMissing }, { status: 400 });
  }

  const listing = parseAgentSubmission({
    text,
    townSlug,
    agentName: name.length > 0 ? name : null,
    agentPhone: phone,
    photoCount: 0,
    sourceUrl: null,
    submittedAt: new Date(),
  });
  listing.sourceId = role;
  if (listing.monthlyRent === null) {
    return NextResponse.json({ ok: false, message: COPY.errorNoRent }, { status: 422 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, message: COPY.errorNotStored }, { status: 503 });
  }
  await queueSubmission(db(), role, listing, text);
  return NextResponse.json({ ok: true, message: COPY.sent });
}
