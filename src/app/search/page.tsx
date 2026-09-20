import Link from 'next/link';
import { RESULTS } from '@/core/copy';
import { unitTypeLabel } from '@/core/copy';
import { formatMoney } from '@/core/money';
import { parseFilters, searchHref, toQuery } from '@/core/url';
import { activeFilterCount, matching, sortResults, splitByBudget } from '@/core/filters';
import { assessCoverage, findBlockingFilter, nearbyCoverage } from '@/core/coverage';
import { nearMisses } from '@/core/nearmiss';
import { buildCard } from '@/core/cardModel';
import { clustersFor, sourceName, TOWN_BY_SLUG } from '@/core/repo';
import { ResultCard } from '@/components/ResultCard';
import { FilterControls } from '@/components/FilterControls';
import { MapPanel } from '@/components/MapPanel';
import { CheckNow } from '@/components/CheckNow';
import { SearchTelemetry } from '@/components/SearchTelemetry';
import { OfflineBanner } from '@/components/OfflineBanner';
import ui from '@/components/ui.module.css';
import styles from './search.module.css';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const pageParam = typeof sp['page'] === 'string' ? Number(sp['page']) : 1;
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const all = clustersFor(filters.towns);
  const matched = sortResults(matching(all, filters), filters.towns);
  const { affordable, over } = splitByBudget(matched, filters.lumpMax);
  const verdict = assessCoverage(all, filters, matched);

  const townLabel =
    filters.towns.length === 0
      ? 'Anywhere in Ghana'
      : filters.towns
          .map((s) => TOWN_BY_SLUG.get(s))
          .map((t) => (t === undefined ? null : t.name))
          .filter((n): n is string => n !== null)
          .join(' + ');

  const lumpLabel = filters.lumpMax === null ? null : formatMoney(filters.lumpMax);

  const blocking =
    verdict.cause === 'filters' ? findBlockingFilter(all, filters, unitTypeLabel) : null;

  const misses = nearMisses(all, filters, matched, unitTypeLabel);

  const ctx = {
    townSlugs: filters.towns,
    lumpMax: filters.lumpMax,
    dataSaver: false,
    offline: false,
  };

  const shown = affordable.slice(0, page * PAGE_SIZE);
  const hasMore = affordable.length > shown.length;

  const countLine = verdict.zero
    ? verdict.cause === 'filters'
      ? RESULTS.countZeroFilters
      : RESULTS.countZeroCoverage
    : RESULTS.count(affordable.length, lumpLabel, townLabel);

  const advanceNotStatedShown = shown.filter((c) => c.advanceMonthsMin === null).length;

  return (
    <div className={styles.shell}>
      <SearchTelemetry
        townSlugs={filters.towns}
        filterCount={activeFilterCount(filters)}
        resultCount={affordable.length}
        zeroCause={verdict.cause}
        nearMissCount={misses.length}
        advanceNotStatedShown={advanceNotStatedShown}
        shownCount={shown.length}
        clusterSizes={shown.map((c) => c.sourceCount)}
      />

      <OfflineBanner />

      <FilterControls filters={filters} townLabel={townLabel} all={facets(all, filters)} />

      <div className={styles.split}>
        <div className={styles.list}>
          <div className={styles.countRow}>
            <h1 className={`${styles.count} num`} aria-live="polite" data-testid="result-count">
              {countLine}
            </h1>
            <div className={ui.row}>
              <CheckNow clusterIds={shown.slice(0, 20).map((c) => c.id)} />
              <span className={ui.caption}>{RESULTS.sort}</span>
            </div>
          </div>

          {shown.length > 0 ? (
            <div className={ui.grid} data-testid="results">
              {shown.map((c) => (
                <ResultCard key={c.id} card={buildCard(c, ctx, sourceName)} />
              ))}
            </div>
          ) : null}

          {hasMore ? (
            <div className={styles.more}>
              <Link
                className={`${ui.btnSecondary} num`}
                href={`/search?${toQuery(filters)}${toQuery(filters) === '' ? '' : '&'}page=${page + 1}`}
              >
                Show {Math.min(PAGE_SIZE, affordable.length - shown.length)} more of{' '}
                {affordable.length}
              </Link>
            </div>
          ) : null}

          {/* ---- labelled near-misses. Pass 1:870 ---- */}
          {misses.length > 0 ? (
            <section className={styles.section}>
              <Divider label={RESULTS.nearMissHeading} />
              <div className={ui.grid}>
                {misses.map((m) => (
                  <ResultCard
                    key={m.cluster.id}
                    over
                    card={buildCard(
                      m.cluster,
                      { ...ctx, nearMissReason: m.reason },
                      sourceName,
                    )}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* ---- over budget, shown not hidden ---- */}
          {over.length > 0 && lumpLabel !== null ? (
            <section className={styles.section}>
              <Divider label={RESULTS.overDivider(over.length, lumpLabel)} />
              <div className={ui.grid}>
                {over.slice(0, PAGE_SIZE).map((c) => (
                  <ResultCard key={c.id} over card={buildCard(c, ctx, sourceName)} />
                ))}
              </div>
            </section>
          ) : null}

          {/* ---- thin coverage ---- */}
          {verdict.thin ? (
            <section className={ui.panel} data-testid="thin-coverage">
              <h2 className={`${ui.h3} num`}>
                {RESULTS.thinHead(verdict.trackedHere, townLabel)}
              </h2>
              <p className={ui.caption}>{RESULTS.thinBody}</p>
              <AlertButton townLabel={townLabel} towns={filters.towns} />
              <Link className={ui.btnSecondary} href="/me#paste">
                {RESULTS.thinAskAgent}
              </Link>
            </section>
          ) : null}

          {/* ---- zero, because the filters are too tight ---- */}
          {verdict.cause === 'filters' ? (
            <section className={ui.panel} data-testid="zero-filters">
              <SearchGlyph />
              <h2 className={ui.h3}>{RESULTS.zeroFilterHead(townLabel)}</h2>
              <p className={`${ui.body} num`}>
                {blocking === null
                  ? RESULTS.zeroFilterBodyGeneric
                  : RESULTS.zeroFilterBody(blocking.name, blocking.count)}
              </p>
              {blocking === null ? (
                <Link className={ui.btnPrimary} href={searchHref({ ...filters, towns: filters.towns, types: [], advances: [], seen: 'any' })}>
                  {RESULTS.zeroFilterFixGeneric}
                </Link>
              ) : (
                <Link className={`${ui.btnPrimary} num`} href={searchHref(blocking.relaxed)}>
                  {RESULTS.zeroFilterFix(blocking.count)}
                </Link>
              )}
              <div className={ui.row}>
                <Link className={`${ui.btnSecondary} ${styles.grow}`} href="/start">
                  {RESULTS.changeArea}
                </Link>
                <Link
                  className={`${ui.btnSecondary} ${styles.grow}`}
                  href={searchHref({
                    ...filters,
                    types: [],
                    advances: [],
                    seen: 'any',
                    water: [],
                    meter: [],
                    polytank: false,
                    privateToilet: false,
                    gated: false,
                    monthlyMax: null,
                  })}
                >
                  {RESULTS.clearAllFilters}
                </Link>
              </div>
              <p className={ui.caption}>{RESULTS.postWanted}</p>
              <Link className={ui.btnTertiary} href="/me#paste">
                {RESULTS.postWantedCta}
              </Link>
            </section>
          ) : null}

          {/* ---- zero, because we track nothing here ---- */}
          {verdict.cause === 'coverage' ? (
            <section className={ui.panel} data-testid="zero-coverage">
              <SearchGlyph />
              <h2 className={`${ui.h3} num`}>{RESULTS.zeroCoverageHead(townLabel)}</h2>
              <p className={ui.body}>{RESULTS.zeroCoverageBody}</p>
              <AlertButton townLabel={townLabel} towns={filters.towns} />
              <h3 className={ui.overline}>{RESULTS.zeroCoverageNearby}</h3>
              <ul className={styles.nearby}>
                {nearbyCoverage(clustersFor([]), filters.towns).map((n) => (
                  <li key={n.townSlug}>
                    <Link className={styles.nearbyRow} href={`/search?area=${n.townSlug}`}>
                      <span>{n.townName}</span>
                      {n.distanceKm === null ? null : (
                        <span className={`${ui.caption} num`}>{n.distanceKm}km away</span>
                      )}
                      <span className={`${ui.caption} num`}>{n.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className={ui.btnSecondary} href="/start">
                {RESULTS.searchNearbyTown}
              </Link>
            </section>
          ) : null}
        </div>

        <MapPanel
          pins={shown.slice(0, 40).map((c) => ({
            id: c.id,
            href: `/place/${c.slug}`,
            x: c.mapX,
            y: c.mapY,
            label:
              c.totalToMoveInMin === null
                ? `${formatMoney(c.rentMin)}/mo`
                : formatMoney(c.totalToMoveInMin),
          }))}
          total={affordable.length}
        />
      </div>
    </div>
  );
}

/** Facet counts, computed on the server over the chosen towns. */
function facets(
  all: ReturnType<typeof clustersFor>,
  filters: ReturnType<typeof parseFilters>,
) {
  const advance = [1, 3, 6, 12, 24].map((a) => ({
    months: a,
    count: all.filter((c) => c.listings.some((l) => l.advanceMonths === a)).length,
  }));
  const types = [...new Set(all.map((c) => c.unitType))].map((t) => ({
    type: t,
    label: unitTypeLabel(t),
    count: all.filter((c) => c.unitType === t).length,
  }));
  const notStated = all.filter((c) => c.advanceMonthsMin === null).length;
  return { advance, types, notStated, total: all.length, filters };
}

function Divider({ label }: { label: string }) {
  return (
    <div className={styles.divider}>
      <span className={styles.dividerRule} />
      <span className={`${ui.caption} num`}>{label}</span>
      <span className={styles.dividerRule} />
    </div>
  );
}

function AlertButton({ townLabel, towns }: { townLabel: string; towns: string[] }) {
  const href = `/me?alert=${encodeURIComponent(towns.join(','))}#searches`;
  return (
    <Link className={ui.btnPrimary} href={href}>
      {RESULTS.alertOff(townLabel)}
    </Link>
  );
}

/** Brand Guide §9: a single faded ring. Never an illustration of a sad house. */
function SearchGlyph() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="var(--dust-400)" strokeWidth="1.5" />
      <path d="M20 20l-3.6-3.6" stroke="var(--dust-400)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 11h5" stroke="var(--dust-400)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
