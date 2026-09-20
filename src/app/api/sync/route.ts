import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * The sync endpoint the offline queue drains into.
 *
 * Anonymous by default: with no phone number on file there is nothing to
 * sync a shortlist *to*, so this acknowledges and drops. Once a number is
 * verified, the same payload is written against that account. The client
 * never blocks on this either way - the write already succeeded in
 * IndexedDB before the request was made.
 */
export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true, storedRemotely: false });
}
