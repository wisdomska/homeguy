import { NextResponse } from 'next/server';
import { clustersFor } from '@/core';
import { db, hasDatabase } from '@/core/db';
import { recordVerification } from '@/ingest/persist';
import { reverifyWithin } from '@/ingest/verify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Stop starting new clusters this long after the request arrives, leaving
 * room for the one in flight (two 15s request timeouts at most) before
 * the platform kills the function at maxDuration.
 */
const BUDGET_MS = 25_000;

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

  const deadline = Date.now() + BUDGET_MS;
  const url = new URL(request.url);
  const offset = Number(url.searchParams.get('offset'));
  const start = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const SLICE = 100;

  const all = await clustersFor([]);
  const slice = all.slice(start, start + SLICE);
  const { results, clustersChecked } = await reverifyWithin(slice, { deadline });
  const next = start + clustersChecked;
  const recorded = hasDatabase()
    ? await recordVerification(db(), results)
    : { markedLive: 0, markedGone: 0 };

  return NextResponse.json({
    ok: true,
    checkedFrom: start,
    clusters: clustersChecked,
    listings: results.length,
    live: results.filter((r) => r.status === 'live').length,
    gone: results.filter((r) => r.status === 'gone').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    recorded,
    nextOffset: next >= all.length ? 0 : next,
  });
}
