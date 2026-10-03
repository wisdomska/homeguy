import { townsWithCounts } from '@/core';
import { UNIT_TYPE_LABEL } from '@/core/copy';
import { db, hasDatabase } from '@/core/db';
import { UNIT_TYPES } from '@/core/types';
import { pendingSubmissions } from '@/ingest/submissions';
import { openReports } from '@/lib/reports';
import ui from '@/components/ui.module.css';
import styles from '../health/health.module.css';
import review from './review.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Review queue',
  robots: { index: false, follow: false },
};

const OUTCOME_TEXT: Record<string, string> = {
  approved: 'Approved. It is in search now.',
  rejected: 'Rejected.',
  no_price: 'Not approved: it needs a monthly rent. Fill one in and approve again.',
  no_town: 'Not approved: choose a town we can place it in, then approve again.',
  not_found: 'That submission no longer exists.',
  not_pending: 'That submission was already reviewed.',
  takedown: 'Taken down. Its listings no longer appear in search.',
  dismissed: 'Report dismissed. The listing is unchanged.',
  bad_origin: 'Refused: that request did not come from this page.',
  erase_empty: 'Enter the number or name to erase.',
};

function outcomeText(outcome: string): string | undefined {
  const erased = /^erased_(\d+)$/.exec(outcome);
  if (erased !== null) {
    return `Erased from ${erased[1]} ${erased[1] === '1' ? 'record' : 'records'}. The request is logged.`;
  }
  return OUTCOME_TEXT[outcome];
}

/**
 * /admin/review. Everything a person has to read before it changes what
 * renters see: listings sent in by renters and agents, and reports against
 * listings already live. Behind Basic auth in middleware.ts.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { outcome } = await searchParams;

  if (!hasDatabase()) {
    return (
      <div className={styles.wrap}>
        <h1 className={ui.h2}>Review queue</h1>
        <p className={ui.body}>This deployment has no database, so there is nothing to review.</p>
      </div>
    );
  }

  const submissions = await pendingSubmissions(db());
  const reports = await openReports();
  const towns = (await townsWithCounts()).sort((a, b) => a.name.localeCompare(b.name));
  const reportClusterIds = reports.map((r) => r.clusterId).filter((id): id is string => id !== null);
  const slugs = new Map(
    (
      await db().cluster.findMany({
        where: { id: { in: reportClusterIds } },
        select: { id: true, slug: true },
      })
    ).map((c) => [c.id, c.slug]),
  );

  return (
    <div className={styles.wrap}>
      <h1 className={ui.h2}>Review queue</h1>
      {outcome !== undefined && outcomeText(outcome) !== undefined ? (
        <p className={ui.body} role="status">
          {outcomeText(outcome)}
        </p>
      ) : null}

      <section>
        <h2 className={ui.h3}>Listings sent in ({submissions.length})</h2>
        <p className={ui.caption}>
          Nothing here is in search until it is approved. Correct the town, rent or type if the
          parser got them wrong. Leave a field empty rather than guess.
        </p>
        {submissions.length === 0 ? <p className={ui.caption}>Nothing waiting.</p> : null}
        {submissions.map((s) => (
          <form key={s.id} method="post" action="/admin/review/action" className={review.item}>
            <input type="hidden" name="kind" value="submission" />
            <input type="hidden" name="id" value={s.id} />
            <p className={`${ui.caption} num`}>
              {s.sourceId} · {s.submittedAt.toISOString()}
              {s.listing.agentPhone === null ? '' : ` · ${s.listing.agentPhone}`}
              {s.listing.sourceUrl.startsWith('http') ? (
                <>
                  {' · '}
                  <a href={s.listing.sourceUrl} rel="noreferrer nofollow" target="_blank">
                    source
                  </a>
                </>
              ) : null}
            </p>
            <pre className={review.raw}>{s.rawText}</pre>
            <p className={ui.caption}>
              Advance read from the text:{' '}
              {s.listing.advanceMonths === null ? 'not stated' : `${s.listing.advanceMonths} months`}
            </p>
            <div className={review.fields}>
              <label className={review.field}>
                <span className={ui.caption}>Town</span>
                <select name="townSlug" className={ui.input} defaultValue={s.listing.townHint ?? ''}>
                  <option value="">Not placed</option>
                  {towns.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={review.field}>
                <span className={ui.caption}>Rent per month (GH₵)</span>
                <input
                  name="rent"
                  className={`${ui.input} num`}
                  inputMode="decimal"
                  defaultValue={s.listing.monthlyRent === null ? '' : String(s.listing.monthlyRent / 100)}
                />
              </label>
              <label className={review.field}>
                <span className={ui.caption}>Type</span>
                <select name="unitType" className={ui.input} defaultValue={s.listing.unitType ?? ''}>
                  <option value="">Not stated</option>
                  {UNIT_TYPES.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_TYPE_LABEL[u]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={review.actions}>
              <button type="submit" name="action" value="approve" className={ui.btnPrimary}>
                Approve
              </button>
              <button type="submit" name="action" value="reject" className={ui.btnSecondary}>
                Reject
              </button>
            </div>
          </form>
        ))}
      </section>

      <section>
        <h2 className={ui.h3}>Open reports ({reports.length})</h2>
        <p className={ui.caption}>
          No listing is removed automatically. Taking one down removes it from search; dismissing
          leaves it as it is.
        </p>
        {reports.length === 0 ? <p className={ui.caption}>Nothing open.</p> : null}
        {reports.map((r) => {
          const slug = r.clusterId === null ? undefined : slugs.get(r.clusterId);
          return (
            <form key={r.id} method="post" action="/admin/review/action" className={review.item}>
              <input type="hidden" name="kind" value="report" />
              <input type="hidden" name="id" value={r.id} />
              <p className={ui.body}>{r.reason}</p>
              <p className={`${ui.caption} num`}>
                {new Date(r.filedAt).toISOString()} ·{' '}
                {slug === undefined ? 'no listing attached' : <a href={`/place/${slug}`}>the listing</a>}
              </p>
              <div className={review.actions}>
                {slug === undefined ? null : (
                  <button type="submit" name="action" value="takedown" className={ui.btnPrimary}>
                    Take it down
                  </button>
                )}
                <button type="submit" name="action" value="dismiss" className={ui.btnSecondary}>
                  Dismiss
                </button>
              </div>
            </form>
          );
        })}
      </section>

      <section>
        <h2 className={ui.h3}>Erase a person&apos;s details</h2>
        <p className={ui.caption}>
          A request under Act 843 s.33. Removes the name or number from every listing and every
          queued submission. The listings themselves stay. Process within 48 hours of the request.
        </p>
        <form method="post" action="/admin/review/action" className={review.item}>
          <input type="hidden" name="kind" value="erasure" />
          <div className={review.fields}>
            <label className={review.field}>
              <span className={ui.caption}>Phone number or name</span>
              <input name="subject" className={ui.input} required minLength={3} />
            </label>
            <label className={review.field}>
              <span className={ui.caption}>Note for the audit trail</span>
              <input name="note" className={ui.input} />
            </label>
          </div>
          <div className={review.actions}>
            <button type="submit" name="action" value="erase" className={ui.btnPrimary}>
              Erase
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
