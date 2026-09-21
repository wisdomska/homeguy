import { SOURCE_CONFIG } from '@/ingest/config';
import { allRuns, canary, lastSuccessfulRun } from '@/ingest/health';
import { mergeLogEntries } from '@/ingest/cluster';
import { queue } from '@/ingest/queue';
import { eventCounts, zeroResultsByTown } from '@/lib/eventStore';
import { openReports } from '@/lib/reports';
import { regionsWithCoverage, totalClusterCount } from '@/core';
import { db, hasDatabase } from '@/core/db';
import ui from '@/components/ui.module.css';
import styles from './health.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ingestion health',
  robots: { index: false, follow: false },
};

/**
 * /admin/health. Without this we are flying blind on the only thing that
 * matters: whether listings are still arriving.
 *
 * The number to read first is the coverage-zero rate by town. A rising
 * coverage-zero rate in a region is an ingestion problem, and nothing else
 * in the product will tell us.
 *
 * Access control: this route is behind Basic auth in middleware.ts.
 */
export default async function HealthPage() {
  const alerts = canary(SOURCE_CONFIG.map((s) => s.id));
  const counts = eventCounts();
  const zeros = zeroResultsByTown();
  const runs = allRuns().slice(0, 20);
  const merges = mergeLogEntries(20);
  const reports = openReports();
  const regionCounts = await regionsWithCoverage();
  const total = await totalClusterCount();

  // Read straight from the index rather than from any intent table.
  const stats = hasDatabase()
    ? {
        listings: await db().listing.count({ where: { goneAt: null } }),
        gone: await db().listing.count({ where: { goneAt: { not: null } } }),
        withTotal: await db().cluster.count({ where: { totalToMoveInMin: { not: null } } }),
        multiSource: await db().cluster.count({ where: { sourceCount: { gt: 1 } } }),
        withPhoto: await db().cluster.count({ where: { thumbnailUrl: { not: null } } }),
        townsCovered: await db().town.count({ where: { clusters: { some: {} } } }),
      }
    : null;

  return (
    <div className={styles.wrap}>
      <h1 className={ui.h2}>Ingestion health</h1>

      {alerts.length > 0 ? (
        <section className={styles.alert}>
          <h2 className={ui.h3}>Yield alerts</h2>
          <ul>
            {alerts.map((a) => (
              <li key={a.sourceId} className="num">
                {a.sourceId}: {a.today} today against {a.yesterday} yesterday, down{' '}
                {a.dropPercent}%. That is a parser to check, not a quiet market.
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className={ui.caption}>No source has dropped more than 50% day over day.</p>
      )}

      {stats === null ? null : (
        <section>
          <h2 className={ui.h3}>The index</h2>
          <table className={styles.table}>
            <tbody>
              <tr><td>Clusters (live)</td><td className="num">{total}</td></tr>
              <tr><td>Listings (live)</td><td className="num">{stats.listings}</td></tr>
              <tr><td>Listings marked gone</td><td className="num">{stats.gone}</td></tr>
              <tr><td>Towns with coverage</td><td className="num">{stats.townsCovered}</td></tr>
              <tr><td>Clusters with a photo</td><td className="num">{stats.withPhoto}</td></tr>
              <tr><td>Clusters across more than one source</td><td className="num">{stats.multiSource}</td></tr>
              <tr>
                <td><strong>Clusters with a cash-to-move-in figure</strong></td>
                <td className="num">
                  <strong>{stats.withTotal}</strong>{' '}
                  ({total === 0 ? 0 : Math.round((stats.withTotal / total) * 100)}%)
                </td>
              </tr>
            </tbody>
          </table>
          <p className={ui.caption}>
            That last row is the data-quality number to watch. Jiji and Tonaton publish a
            monthly rent and no advance term, so the product&apos;s headline figure cannot be
            computed for most of the index. It rises only as agents supply terms through the
            paste and agent-direct routes.
          </p>
        </section>
      )}

      <section>
        <h2 className={ui.h3}>Zero results by town, last 7 days</h2>
        <p className={ui.caption}>
          A filters-zero is a UX problem. A coverage-zero is an ingestion problem.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Town</th>
              <th scope="col">Filters</th>
              <th scope="col">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {zeros.length === 0 ? (
              <tr>
                <td colSpan={3} className={ui.caption}>
                  No zero-result searches recorded in this process yet.
                </td>
              </tr>
            ) : (
              zeros.map((z) => (
                <tr key={z.town}>
                  <td>{z.town}</td>
                  <td className="num">{z.filters}</td>
                  <td className="num">{z.coverage}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className={ui.h3}>Sources</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Tier</th>
              <th scope="col">State</th>
              <th scope="col">Last successful run</th>
              <th scope="col">Yield</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_CONFIG.map((s) => {
              const last = lastSuccessfulRun(s.id);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="num">{s.tier}</td>
                  <td>{s.enabled ? 'enabled' : 'switched off'}</td>
                  <td className="num">
                    {last === null ? 'never' : new Date(last.finishedAt).toISOString()}
                  </td>
                  <td className="num">{last === null ? '-' : last.yield}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className={ui.h3}>Clusters by region</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Region</th>
              <th scope="col">Clusters</th>
            </tr>
          </thead>
          <tbody>
            {regionCounts.map((r) => (
              <tr key={r.slug}>
                <td>{r.name}</td>
                <td className="num">{r.count}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td className="num">
                <strong>{total}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className={ui.h3}>Queue</h2>
        <p className={`${ui.caption} num`}>
          {queue.size()} pending · {queue.deadLetters().length} dead-lettered ·{' '}
          {queue.isolatedJobs().length} isolated job types
        </p>
        {queue
          .deadLetters()
          .slice(0, 10)
          .map((d) => (
            <p key={d.job.id} className={ui.caption}>
              {d.job.id} — {d.error}
            </p>
          ))}
      </section>

      <section>
        <h2 className={ui.h3}>Recent merge decisions</h2>
        <p className={ui.caption}>
          Every merge is scored and logged so a wrong one can be found and split.
        </p>
        {merges.length === 0 ? (
          <p className={ui.caption}>No clustering has run in this process.</p>
        ) : (
          merges.map((m, i) => (
            <p key={i} className={`${ui.caption} num`}>
              {m.a} / {m.b}: {m.score.total.toFixed(2)} — {m.merged ? 'merged' : 'kept apart'} (
              {m.score.reasons.join(', ')})
            </p>
          ))
        )}
      </section>

      <section>
        <h2 className={ui.h3}>Open reports</h2>
        <p className={ui.caption}>
          No listing is removed automatically, so this queue has to be opened by a person.
        </p>
        {reports.length === 0 ? (
          <p className={ui.caption}>Nothing open.</p>
        ) : (
          reports.map((r) => (
            <p key={r.id} className={ui.caption}>
              {r.id} · {r.reason} · {new Date(r.filedAt).toISOString()}
            </p>
          ))
        )}
      </section>

      <section>
        <h2 className={ui.h3}>Events, last 7 days</h2>
        <table className={styles.table}>
          <tbody>
            {Object.entries(counts).length === 0 ? (
              <tr>
                <td className={ui.caption}>Nothing recorded in this process yet.</td>
              </tr>
            ) : (
              Object.entries(counts).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="num">{v}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className={ui.h3}>Runs</h2>
        {runs.length === 0 ? (
          <p className={ui.caption}>No ingestion run has happened in this process.</p>
        ) : (
          runs.map((r, i) => (
            <p key={i} className={`${ui.caption} num`}>
              {r.sourceId} · {r.ok ? 'ok' : `failed: ${r.error ?? 'unknown'}`} · yield {r.yield} ·{' '}
              {r.parseFailures} parse failures · {r.robotsBlocked} robots-blocked
            </p>
          ))
        )}
      </section>
    </div>
  );
}
