import Link from 'next/link';
import { LANDING } from '@/core/copy';
import {
  REGIONS,
  regionsWithCoverage,
  totalClusterCount,
  townsWithCounts,
} from '@/core/repo';
import { THIN_TOWN_THRESHOLD } from '@/core/coverage';
import ui from '@/components/ui.module.css';
import styles from './landing.module.css';

export const dynamic = 'force-static';

/**
 * LANDING. Ported from HomeGuy Web.dc.html:72-142.
 *
 * Every number on this page is a count of rows in the index. Coverage is
 * uneven and the page says so in the second stat rather than hiding it
 * behind a rounded total.
 */
export default function LandingPage() {
  const total = totalClusterCount();
  const regions = regionsWithCoverage();
  const covered = regions.filter((r) => r.count > 0);
  const empty = regions.filter((r) => r.count === 0);
  const thinnest = covered[covered.length - 1];
  const topTowns = townsWithCounts()
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <div className={styles.inner}>
        <div className={ui.stack}>
          <p className={ui.overline}>{LANDING.overline}</p>
          <h1 className={ui.h1}>{LANDING.h1}</h1>
          <p className={styles.sub}>{LANDING.sub}</p>
        </div>

        <form className={styles.searchCard} action="/search" method="get">
          <div className={styles.searchRow}>
            <div className={styles.field}>
              <label className={ui.overline} htmlFor="where">
                {LANDING.whereLabel}
              </label>
              <select className={ui.input} id="where" name="area" defaultValue="">
                <option value="">{LANDING.wherePlaceholder}</option>
                {townsWithCounts()
                  .sort((a, b) => b.count - a.count)
                  .map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name} — {t.sub} · {t.count}
                    </option>
                  ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={ui.overline} htmlFor="lumpMax">
                {LANDING.lumpLabel}
              </label>
              <select className={ui.input} id="lumpMax" name="lumpMax" defaultValue="">
                <option value="">{LANDING.noMaximum}</option>
                {LUMP_LADDER.map((v) => (
                  <option key={v} value={v}>
                    GH¢{v.toLocaleString('en-US')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.ctaRow}>
            <button className={`${ui.btnPrimary} ${styles.grow} num`} type="submit">
              {LANDING.ctaAll(total)}
            </button>
            <Link className={ui.btnTertiary} href="/start">
              {LANDING.budgetFirst}
            </Link>
          </div>
        </form>

        <div className={styles.stats}>
          <Stat
            n={`${total.toLocaleString('en-US')} tracked`}
            l={LANDING.statTrackedBody}
          />
          <Stat
            n={`${covered.length} of ${REGIONS.length} regions`}
            l={
              thinnest === undefined
                ? LANDING.statNoFeesBody
                : `Coverage is uneven and we say so — ${thinnest.name} has ${thinnest.count} rentals, and ${empty.length} regions have none at all.`
            }
          />
          <Stat n={LANDING.statNoFees} l={LANDING.statNoFeesBody} />
        </div>

        <section className={ui.stack}>
          <h2 className={ui.overline}>{LANDING.browseByRegion}</h2>
          <div className={ui.row}>
            {regions.map((r) => (
              <Link
                key={r.slug}
                className={r.count === 0 ? ui.chipEmpty : `${ui.chip} num`}
                href={`/rent/${r.slug}`}
              >
                {r.name} · {r.count}
              </Link>
            ))}
          </div>
        </section>

        <section className={ui.stack}>
          <h2 className={ui.overline}>WHERE PEOPLE ARE LOOKING</h2>
          <div className={styles.townGrid}>
            {topTowns.map((t) => (
              <Link key={t.slug} className={styles.townRow} href={`/search?area=${t.slug}`}>
                <span className={styles.townName}>{t.name}</span>
                <span className={ui.caption}>{t.sub}</span>
                {t.count < THIN_TOWN_THRESHOLD ? (
                  <span className={ui.thinPill}>{LANDING.thinPill}</span>
                ) : null}
                <span className={`${ui.caption} num`}>{t.count}</span>
              </Link>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <p className={ui.caption}>
            HomeGuy holds no inventory, takes no payment, and is never a counterparty to a
            tenancy. Every listing links back to the source it came from.
          </p>
          <p className={ui.caption}>
            This deployment runs on a development dataset: seventeen hand-authored clusters
            from the design brief plus a deterministic generator, so that every count on
            every screen is a real count of rows. No live source is enabled yet — the
            ingestion adapters run against saved fixtures. See{' '}
            <Link href="/bot">/bot</Link> for how HomeGuyBot identifies itself and how to
            opt out.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className={styles.stat}>
      <div className={`${styles.statN} num`}>{n}</div>
      <div className={ui.caption}>{l}</div>
    </div>
  );
}

/** Web.dc.html:1241-1247 ladderVals() */
const LUMP_LADDER = [
  2000, 3000, 4000, 5000, 7500, 10000, 15000, 20000,
];
