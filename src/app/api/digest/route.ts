import { NextResponse } from 'next/server';
import { buildCard } from '@/core/cardModel';
import { digestFor } from '@/core/digest';
import { parseFilters } from '@/core/url';
import { clustersFor, referenceNow, sourceName } from '@/core/repo';

export const dynamic = 'force-dynamic';

/**
 * The digest for one saved search. The client holds the saved searches and
 * the "last looked" timestamp locally, so this stays anonymous.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseFilters(url.searchParams);
  const sinceParam = Number(url.searchParams.get('since'));
  const now = referenceNow();
  const since = Number.isFinite(sinceParam) && sinceParam > 0
    ? new Date(sinceParam)
    : new Date(now.getTime() - 7 * 86_400_000);

  const all = clustersFor(filters.towns);
  const groups = digestFor(all, filters, since, now);
  const byId = new Map(all.map((c) => [c.id, c]));

  return NextResponse.json({
    groups: groups.map((g) => ({
      day: g.day,
      items: g.items
        .map((i) => {
          const c = byId.get(i.clusterId);
          if (c === undefined) return null;
          return {
            kind: i.kind,
            card: buildCard(
              c,
              { townSlugs: filters.towns, lumpMax: filters.lumpMax, dataSaver: false, offline: false },
              sourceName,
            ),
          };
        })
        .filter((x) => x !== null),
    })),
  });
}
