import { NextResponse } from 'next/server';
import { runAllEnabled } from '@/ingest/pipeline';
import { canary } from '@/ingest/health';
import { enabledSources } from '@/ingest/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron enqueues; the queue worker processes. This endpoint is the
 * enqueue side, and it refuses anyone who is not Cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret === undefined || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await runAllEnabled(50);
  const alerts = canary(enabledSources().map((s) => s.id));

  return NextResponse.json({ ok: true, alerts });
}
