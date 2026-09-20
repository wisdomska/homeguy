import { NextResponse } from 'next/server';
import { matching, splitByBudget } from '@/core/filters';
import { parseFilters } from '@/core/url';
import { clustersFor } from '@/core/repo';

export const dynamic = 'force-dynamic';

/**
 * The live count behind the batch-apply button.
 *
 * The design recomputes this in the browser over seventeen listings
 * (Web.dc.html:1609). A real index is far too large to recount client-side,
 * and putting an estimate on that button would be putting a number on
 * screen that is not real. So it is one small request instead.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseFilters(url.searchParams);
  const all = clustersFor(filters.towns);
  const matched = matching(all, filters);
  const { affordable } = splitByBudget(matched, filters.lumpMax);
  return NextResponse.json(
    { count: affordable.length, matched: matched.length },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  );
}
