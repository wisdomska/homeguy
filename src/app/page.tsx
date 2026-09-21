import Link from 'next/link';
import { LANDING } from '@/core/copy';
import { REGIONS, regionsWithCoverage, totalClusterCount, townsWithCounts } from '@/core';
import { THIN_TOWN_THRESHOLD } from '@/core/coverage';
import ui from '@/components/ui.module.css';
import styles from './landing.module.css';

// Real counts change with every ingest pass, so this is revalidated
// rather than frozen at build time.
export const revalidate = 300;

/**
 * LANDING. Ported from HomeGuy Web.dc.html:72-142.
 *
 * Every number on this page is a count of rows in the index. Coverage is
 * uneven and the page says so in the second stat rather than hiding it
 * behind a rounded total.
 */
export default async function LandingPage() {
  const total = await totalClusterCount();
  const regions = await regionsWithCoverage();
  const towns = await townsWithCounts();
  const covered = regions.filter((r) => r.count > 0);
  const empty = regions.filter((r) => r.count === 0);
  const thinnest = covered[covered.length - 1];
  const topTowns = towns
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
              {/*
                A text field, not a dropdown. A dropdown can only offer what
                we already cover, which quietly tells someone that anywhere
                missing from it does not exist. The datalist suggests the
                towns we do track; typing anything else is allowed and lands
                on the screen that says the gap is ours.
              */}
              <input
                className={ui.input}
                id="where"
                name="q"
                type="search"
                list="towns"
                autoComplete="off"
                placeholder={LANDING.wherePlaceholder}
              />
              <datalist id="towns">
                {towns
                  .sort((a, b) => b.count - a.count)
                  .map((t) => (
                    <option key={t.slug} value={t.name}>
                      {t.sub} · {t.count}
                    </option>
                  ))}
              </datalist>
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
            Listings are indexed from public adverts on Jiji and Tonaton, refreshed hourly
            and re-checked through the day. Photos stay on the source&apos;s own servers and
            every card links back to the advert it came from. See{' '}
            <Link href="/bot">/bot</Link> for how HomeGuyBot identifies itself and how a
            site can opt out.
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
