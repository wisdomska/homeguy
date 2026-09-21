import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ResultCard } from '@/components/ResultCard';
import { buildCard } from '@/core/cardModel';
import { formatMoney } from '@/core/money';
import { unitTypeLabel } from '@/core/copy';
import { THIN_TOWN_THRESHOLD } from '@/core/coverage';
import { sortResults } from '@/core/filters';
import { REGION_BY_SLUG, TOWNS, TOWN_BY_SLUG, clustersFor, sourceNameMap, nameFrom } from '@/core';
import ui from '@/components/ui.module.css';
import styles from '../rent.module.css';

export const revalidate = 600;

export function generateStaticParams() {
  return TOWNS.map((t) => ({ region: t.regionId, town: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; town: string }>;
}): Promise<Metadata> {
  const { town } = await params;
  const t = TOWN_BY_SLUG.get(town);
  if (t === undefined) return { title: 'Not found' };
  const n = (await clustersFor([town])).length;
  return {
    title: `Rooms and apartments to rent in ${t.name}`,
    description:
      n === 0
        ? `HomeGuy tracks no rentals in ${t.name} yet.`
        : `${n} rentals tracked in ${t.name}, de-duplicated across every source, with total cash to move in on each one.`,
  };
}

/**
 * The indexable town page. Not in the design export - composed from the
 * landing and results primitives, and held to the same rule: every number
 * on it is a count of rows, and the zero state distinguishes "we track
 * nothing here" from "your filters are too tight".
 */
export default async function TownPage({
  params,
}: {
  params: Promise<{ region: string; town: string }>;
}) {
  const { region, town } = await params;
  const t = TOWN_BY_SLUG.get(town);
  const r = REGION_BY_SLUG.get(region);
  if (t === undefined || r === undefined || t.regionId !== region) notFound();

  const all = sortResults(await clustersFor([town]), [town]);
  const sourceName = nameFrom(await sourceNameMap());
  const count = all.length;
  const shown = all.slice(0, 12);

  const withTotals = all
    .map((c) => c.totalToMoveInMin)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const cheapest = withTotals[0];
  const median = withTotals[Math.floor(withTotals.length / 2)];
  const notStated = all.filter((c) => c.advanceMonthsMin === null).length;

  const byType = new Map<string, number>();
  for (const c of all) byType.set(c.unitType, (byType.get(c.unitType) ?? 0) + 1);

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <nav className={ui.caption} aria-label="Breadcrumb">
        <Link href="/">HomeGuy</Link> · <Link href={`/rent/${region}`}>{r.name}</Link> · {t.name}
      </nav>

      <h1 className={ui.h1}>Rooms and apartments to rent in {t.name}</h1>

      {count === 0 ? (
        <div className={ui.panel}>
          <p className={ui.body}>
            We track nothing in {t.name} right now. This is not a filter problem — coverage
            here is genuinely thin, and most rentals in this part of the country are never
            posted anywhere online. We are adding sources.
          </p>
          <Link className={ui.btnSecondary} href={`/rent/${region}`}>
            What we do track in {r.name}
          </Link>
        </div>
      ) : (
        <>
          <p className={`${ui.body} num`}>
            {count} {count === 1 ? 'rental' : 'rentals'} tracked in {t.name}
            {count < THIN_TOWN_THRESHOLD ? ' — coverage here is still thin' : ''}.{' '}
            {cheapest === undefined
              ? 'None of them states an advance, so none has a total cash-to-move-in figure.'
              : `The cheapest to move into is ${formatMoney(cheapest)}${median === undefined ? '' : `, and the middle of the range is ${formatMoney(median)}`}.`}{' '}
            {notStated} of them do not state an advance at all, so they carry no total — we
            show the monthly rent and say so rather than guessing.
          </p>

          <div className={ui.row}>
            {[...byType.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([type, n]) => (
                <Link
                  key={type}
                  className={`${ui.chip} num`}
                  href={`/search?area=${town}&type=${type}`}
                >
                  {unitTypeLabel(type)} · {n}
                </Link>
              ))}
          </div>

          <div className={ui.grid}>
            {shown.map((c) => (
              <ResultCard
                key={c.id}
                card={buildCard(
                  c,
                  { townSlugs: [town], lumpMax: null, dataSaver: false, offline: false },
                  sourceName,
                )}
              />
            ))}
          </div>

          <Link className={`${ui.btnPrimary} num`} href={`/search?area=${town}`}>
            Search all {count} in {t.name}
          </Link>
        </>
      )}

      <p className={ui.caption}>
        HomeGuy holds no inventory and takes no payment. Every listing here links back to the
        source it came from.
      </p>
    </div>
  );
}
