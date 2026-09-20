'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ResultCard } from '@/components/ResultCard';
import { SAVED } from '@/core/copy';
import { useClusters } from '@/lib/useClusters';
import { useShortlist, type ContactStatus } from '@/lib/shortlist';
import ui from '@/components/ui.module.css';
import styles from './saved.module.css';

const STATUSES: ContactStatus[] = ['Not contacted', 'Contacted', 'Viewing booked'];

/**
 * SAVED. Web.dc.html:693-747, with the process filters, notes and ordinal
 * rating from Pass 1:36.
 *
 * Ordinal rating, never a free-form additive score: the printable-scorecard
 * post-mortem in the dossier found that per-house criteria made the
 * possible total different for every house, producing totals nobody could
 * compare.
 *
 * Everything here reads from IndexedDB, so it works with the network off.
 */
export default function SavedPage() {
  const { saved, discarded, patch, forget, discard, ready } = useShortlist();
  const [tab, setTab] = useState<string>('All');
  const ids = saved.map((e) => e.clusterId);
  const { clusters, offline } = useClusters(ids);

  const visible = saved.filter((e) => tab === 'All' || e.status === tab);
  const byId = new Map(clusters.map((c) => [c.card.id, c]));

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <header className={styles.head}>
        <h1 className={ui.h2}>{SAVED.title}</h1>
        <div className={ui.row}>
          <Link className={ui.btnTertiary} href="/discarded">
            {SAVED.discardedLink(discarded.length)}
          </Link>
          <Link className={ui.btnTertiary} href="/compare">
            {SAVED.compare}
          </Link>
        </div>
      </header>

      <div className={ui.row} role="tablist" aria-label="Contact status">
        {(['All', ...STATUSES] as const).map((t) => {
          const n = t === 'All' ? saved.length : saved.filter((e) => e.status === t).length;
          return (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              className={tab === t ? `${ui.chipOn} num` : `${ui.chip} num`}
              onClick={() => setTab(t)}
            >
              {t} · {n}
            </button>
          );
        })}
      </div>

      {offline ? (
        <p className={ui.caption} role="status">
          Offline. Showing what is stored on this device — your notes and ratings are all here.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className={ui.panel}>
          <p className={ui.body}>
            {saved.length === 0 ? SAVED.emptyAll : SAVED.emptyTab(tab)}
          </p>
          <Link className={ui.btnSecondary} href="/search">
            {SAVED.backToResults}
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {visible.map((entry) => {
            const payload = byId.get(entry.clusterId);
            return (
              <li key={entry.clusterId} className={styles.item}>
                {payload === undefined ? (
                  <p className={ui.caption}>Loading this one…</p>
                ) : (
                  <ResultCard card={payload.card} />
                )}

                <div className={ui.row} role="group" aria-label="Rating">
                  {SAVED.ratings.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={entry.rating === r}
                      className={entry.rating === r ? ui.chipOn : ui.chip}
                      onClick={() =>
                        void patch(entry.clusterId, { rating: entry.rating === r ? null : r })
                      }
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={ui.chip}
                    onClick={() => {
                      const i = STATUSES.indexOf(entry.status);
                      const nextStatus = STATUSES[(i + 1) % STATUSES.length];
                      if (nextStatus !== undefined) {
                        void patch(entry.clusterId, { status: nextStatus });
                      }
                    }}
                  >
                    {entry.status}
                  </button>
                </div>

                <label className={styles.noteLabel}>
                  <span className="sr-only">Note</span>
                  <textarea
                    className={styles.note}
                    rows={2}
                    placeholder={SAVED.notePlaceholder}
                    defaultValue={entry.note ?? ''}
                    onBlur={(e) =>
                      void patch(entry.clusterId, {
                        note: e.target.value.trim() === '' ? null : e.target.value,
                      })
                    }
                  />
                </label>

                <div className={ui.row}>
                  <button
                    type="button"
                    className={ui.btnTertiary}
                    onClick={() => void discard(entry.clusterId)}
                  >
                    {SAVED.discard}
                  </button>
                  <button
                    type="button"
                    className={ui.btnTertiary}
                    onClick={() => void forget(entry.clusterId)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!ready ? <p className={ui.caption}>Reading what you saved on this device…</p> : null}
    </div>
  );
}
