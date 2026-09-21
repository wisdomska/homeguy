import { NextResponse } from 'next/server';
import { db, hasDatabase } from '@/core/db';
import { enabledSources } from '@/ingest/config';
import { canary } from '@/ingest/health';
import { runAllSources } from '@/ingest/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * One ingest pass: look for listings that are new.
 *
 * Called hourly by .github/workflows/refresh.yml, because Vercel's Hobby
 * plan allows one cron run per day and that is nowhere near enough for a
 * market where a room is gone in a week.
 *
 * Refuses anyone who is not the scheduler.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret === undefined || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { ok: false, error: 'no_database', note: 'DATABASE_URL is not set; nothing to write into.' },
      { status: 503 },
    );
  }

  const started = Date.now();
  const results = await runAllSources(db(), { maxPages: 5 });
  const alerts = canary(enabledSources().map((s) => s.id));

  const clusters = await db().cluster.count({ where: { listings: { some: { goneAt: null } } } });
  const withTotal = await db().cluster.count({
    where: { listings: { some: { goneAt: null } }, totalToMoveInMin: { not: null } },
  });

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    tookMs: Date.now() - started,
    sources: results.map((r) => ({
      source: r.sourceId,
      pages: r.pagesFetched,
      seen: r.seen,
      created: r.created,
      updated: r.updated,
      clustered: r.clustered,
      droppedNoPrice: r.droppedNoPrice,
      droppedUnplaceable: r.droppedUnplaceable,
      withAdvance: r.withAdvance,
      refusals: r.refusals,
      error: r.error,
    })),
    index: {
      clusters,
      withCashToMoveIn: withTotal,
      // The share of the index where the product's headline number exists
      // at all. Worth watching: it is a data-quality metric, and it is low
      // because the sources do not publish an advance term.
      cashToMoveInRate: clusters === 0 ? 0 : Math.round((withTotal / clusters) * 100) / 100,
    },
    alerts,
  });
}
