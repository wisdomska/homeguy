import { NextResponse } from 'next/server';
import { fileReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

/**
 * Reports are read by a person. No listing is removed automatically, which
 * means the queue behind this has to be a queue somebody opens - it is at
 * /admin/reports.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reason?: unknown; clusterId?: unknown };
    fileReport({
      reason: typeof body.reason === 'string' ? body.reason : 'Something else',
      clusterId: typeof body.clusterId === 'string' ? body.clusterId : null,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true, autoRemoved: false });
}
