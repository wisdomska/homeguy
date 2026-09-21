import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { REGIONS, REGION_BY_SLUG, regionsWithCoverage, townsWithCounts } from '@/core';
import { THIN_TOWN_THRESHOLD } from '@/core/coverage';
import ui from '@/components/ui.module.css';
import styles from './rent.module.css';

export const revalidate = 600;

export function generateStaticParams() {
  return REGIONS.map((r) => ({ region: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  const r = REGION_BY_SLUG.get(region);
  if (r === undefined) return { title: 'Not found' };
  const n = (await regionsWithCoverage()).find((x) => x.slug === region)?.count ?? 0;
  return {
    title: `Rentals in ${r.name}`,
    description:
      n === 0
        ? `HomeGuy tracks no rentals in ${r.name} yet. We say so rather than showing an empty search.`
        : `${n.toLocaleString('en-US')} rentals tracked across ${r.name}, with total cash to move in on every card.`,
  };
}

/** Server-rendered, indexable region page with real counts. */
export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const r = REGION_BY_SLUG.get(region);
  if (r === undefined) notFound();

  const towns = (await townsWithCounts())
    .filter((t) => t.regionId === region)
    .sort((a, b) => b.count - a.count);
  const total = towns.reduce((n, t) => n + t.count, 0);

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <nav className={ui.caption} aria-label="Breadcrumb">
        <Link href="/">HomeGuy</Link> · {r.name}
      </nav>
      <h1 className={ui.h1}>Rentals in {r.name}</h1>
      <p className={`${ui.body} num`}>
        {total === 0
          ? `We track nothing in ${r.name} yet. Most rentals in this part of the country are never posted anywhere online, and we would rather say that than show you an empty search.`
          : `${total.toLocaleString('en-US')} rentals tracked across ${towns.filter((t) => t.count > 0).length} towns, every one showing the total cash to move in where the advance was stated.`}
      </p>

      <ul className={styles.list}>
        {towns.map((t) => (
          <li key={t.slug}>
            <Link className={styles.row} href={`/rent/${region}/${t.slug}`}>
              <span className={styles.name}>{t.name}</span>
              <span className={ui.caption}>{t.sub}</span>
              {t.count > 0 && t.count < THIN_TOWN_THRESHOLD ? (
                <span className={ui.thinPill}>thin coverage</span>
              ) : null}
              <span className={`${ui.caption} num`}>{t.count}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link className={ui.btnSecondary} href="/search">
        Search everywhere instead
      </Link>
    </div>
  );
}
