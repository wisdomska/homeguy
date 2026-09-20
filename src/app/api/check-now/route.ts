import { NextResponse } from 'next/server';
import { clustersByIds } from '@/core/repo';
import { reverify } from '@/ingest/verify';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Never more than the page in front of the user. */
const MAX_PER_CALL = 20;

/**
 * "Check these now". This is the only user-triggered network activity that
 * leaves our own index, and it is deliberately narrow: conditional requests
 * against source URLs we already hold, for the listings currently on
 * screen, rate-limited per client.
 *
 * It is not a search. A live fan-out scraper on every query would take
 * 8-20 seconds, get the bot banned within days, make de-duplication
 * impossible and create real legal exposure.
 */
export async function POST(request: Request) {
  const key =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'anonymous';

  if (!rateLimit(`check-now:${key}`, 3, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let ids: string[] = [];
  try {
    const body = (await request.json()) as { clusterIds?: unknown };
    if (Array.isArray(body.clusterIds)) {
      ids = body.clusterIds.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const clusters = clustersByIds(ids.slice(0, MAX_PER_CALL));
  const results = await reverify(clusters);

  return NextResponse.json({
    checked: results.length,
    stillLive: results.filter((r) => r.status === 'live').length,
    gone: results.filter((r) => r.status === 'gone').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  });
}
