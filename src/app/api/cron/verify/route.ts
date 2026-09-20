import { NextResponse } from 'next/server';
import { clustersFor } from '@/core/repo';
import { reverify } from '@/ingest/verify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The rolling re-check. This is what makes "Seen 2 days ago" honest rather
 * than decorative: each listing's source URL is re-fetched on a schedule,
 * conditionally, one host at a time, and lastVerifiedAt moves or the
 * listing is marked gone.
 *
 * It walks a slice of the index per run rather than the whole thing, so no
 * host ever sees a burst.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret === undefined || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const offset = Number(url.searchParams.get('offset'));
  const start = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const SLICE = 100;

  const all = clustersFor([]);
  const slice = all.slice(start, start + SLICE);
  const results = await reverify(slice);

  return NextResponse.json({
    ok: true,
    checkedFrom: start,
    clusters: slice.length,
    listings: results.length,
    live: results.filter((r) => r.status === 'live').length,
    gone: results.filter((r) => r.status === 'gone').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    nextOffset: start + SLICE >= all.length ? 0 : start + SLICE,
  });
}
