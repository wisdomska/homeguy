import { NextResponse } from 'next/server';
import { buildCard } from '@/core/cardModel';
import { clustersByIds, sourceName } from '@/core/repo';
import { formatMoney } from '@/core/money';
import { METER_LABEL, WATER_LABEL, unitTypeLabel } from '@/core/copy';

export const dynamic = 'force-dynamic';

/**
 * The shortlist, the discard bucket and the compare table all live in the
 * browser (IndexedDB), so they need to hydrate cluster detail by id. This
 * returns exactly what those screens render and nothing more.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 100);

  const clusters = clustersByIds(ids);

  return NextResponse.json({
    clusters: clusters.map((c) => ({
      card: buildCard(
        c,
        { townSlugs: [], lumpMax: null, dataSaver: false, offline: false },
        sourceName,
      ),
      compare: {
        name: c.landmark === null ? c.town.name : c.landmark.name,
        cashToMoveIn:
          c.totalToMoveInMin === null ? null : formatMoney(c.totalToMoveInMin),
        monthly: formatMoney(c.rentMin),
        advance:
          c.advanceMonthsMin === null ? null : `${c.advanceMonthsMin} months`,
        type: unitTypeLabel(c.unitType),
        water:
          c.attributes.water === null
            ? null
            : `${WATER_LABEL[c.attributes.water]}${c.attributes.waterDays === null ? '' : `, ${c.attributes.waterDays}d`}`,
        meter: c.attributes.meter === null ? null : METER_LABEL[c.attributes.meter],
        toilet: c.attributes.toilet,
      },
    })),
  });
}
