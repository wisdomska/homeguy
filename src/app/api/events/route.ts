import { NextResponse } from 'next/server';
import { recordEvent } from '@/lib/eventStore';

export const dynamic = 'force-dynamic';

/**
 * The analytics sink. Cookieless: nothing here identifies a person, and no
 * event is ever rendered back to a user.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null && 'name' in body) {
      const e = body as { name: string; props?: Record<string, unknown> };
      recordEvent(e.name, e.props ?? {});
    }
  } catch {
    // A malformed beacon is not worth a 400 the client will never read.
  }
  return new NextResponse(null, { status: 204 });
}
