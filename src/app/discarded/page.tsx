'use client';

import Link from 'next/link';
import { ResultCard } from '@/components/ResultCard';
import { DISCARDED, SAVED } from '@/core/copy';
import { useClusters } from '@/lib/useClusters';
import { useShortlist } from '@/lib/shortlist';
import ui from '@/components/ui.module.css';
import styles from '../saved/saved.module.css';

/**
 * DISCARDED. Web.dc.html:748-777, with the reason text from Pass 1:138.
 *
 * The underrated half of the triad. On a months-long search the same
 * compound resurfaces weekly under a different agent, and "why I said no"
 * is the note that saves the second wasted trip.
 */
export default function DiscardedPage() {
  const { discarded, save, forget, patch } = useShortlist();
  const ids = discarded.map((e) => e.clusterId);
  const { clusters } = useClusters(ids);
  const byId = new Map(clusters.map((c) => [c.card.id, c]));

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <Link className={ui.btnTertiary} href="/saved">
        ← {SAVED.title}
      </Link>
      <h1 className={ui.h2}>{DISCARDED.title}</h1>
      <p className={`${ui.body} num`}>
        {discarded.length === 0 ? DISCARDED.empty : DISCARDED.line(discarded.length)}
      </p>

      <ul className={styles.list}>
        {discarded.map((entry) => {
          const payload = byId.get(entry.clusterId);
          return (
            <li key={entry.clusterId} className={styles.item}>
              {payload === undefined ? null : <ResultCard card={payload.card} over />}
              <label className={styles.noteLabel}>
                <span className="sr-only">Why you said no</span>
                <textarea
                  className={styles.note}
                  rows={2}
                  placeholder={DISCARDED.notePlaceholder}
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
                  className={ui.btnSecondary}
                  onClick={() => void save(entry.clusterId)}
                >
                  {DISCARDED.putBack}
                </button>
                <button
                  type="button"
                  className={ui.btnTertiary}
                  onClick={() => void forget(entry.clusterId)}
                >
                  Forget it
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
