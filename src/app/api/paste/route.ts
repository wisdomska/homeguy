import { NextResponse } from 'next/server';
import { ingestPaste } from '@/ingest/adapters/userPaste';
import { ME } from '@/core/copy';
import { rateLimit } from '@/lib/rateLimit';
import { db, hasDatabase } from '@/core/db';
import { queueSubmission } from '@/ingest/submissions';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * Tier 2 ingestion: one page, fetched because a person asked for it.
 *
 * It goes through the same polite fetcher as everything else, so robots.txt
 * still applies, the denylist still applies, and a login wall is answered
 * with "paste the text instead" rather than worked around.
 */
export async function POST(request: Request) {
  const key =
    request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous';
  if (!rateLimit(`paste:${key}`, 10, 60_000)) {
    return NextResponse.json(
      { status: 'rejected', message: 'That is a lot of links at once. Try again in a minute.' },
      { status: 429 },
    );
  }

  let input = '';
  try {
    const body = (await request.json()) as { input?: unknown };
    if (typeof body.input === 'string') input = body.input;
  } catch {
    return NextResponse.json({ status: 'rejected', message: ME.linkRejectedInvalid }, { status: 400 });
  }

  const outcome = await ingestPaste(input, { townSlug: null });

  if (outcome.status === 'needs_text') {
    return NextResponse.json({
      status: 'needs_text',
      message: outcome.reason === 'blocked' ? ME.linkRejectedBlocked : ME.linkRejectedLogin,
    });
  }
  if (outcome.status === 'rejected') {
    return NextResponse.json({ status: 'rejected', message: ME.linkRejectedInvalid });
  }

  // Held for a person to read before it can appear in search. It used to be
  // parsed, acknowledged as "Queued" and then dropped on the floor.
  if (!hasDatabase()) {
    return NextResponse.json({ status: 'rejected', message: ME.linkNotStored }, { status: 503 });
  }
  await queueSubmission(db(), 'user-paste', outcome.listing, input);

  return NextResponse.json({
    status: 'parsed',
    message: ME.linkQueued,
    parsed: {
      unitType: outcome.listing.unitType,
      monthlyRent: outcome.listing.monthlyRent,
      // null here is the honest answer far more often than not.
      advanceMonths: outcome.listing.advanceMonths,
    },
  });
}
