'use client';

import { useState } from 'react';
import { SAVED } from '@/core/copy';
import { track } from '@/lib/analytics';
import { useShortlist } from '@/lib/shortlist';
import ui from './ui.module.css';
import styles from './SaveControls.module.css';

/**
 * Keep, kill, note - the triad on every listing (Research Dossier §11,
 * borrowed from idealista).
 *
 * All three write to IndexedDB first and queue for sync second, so every
 * one of them succeeds with the network off. The discard bucket is the
 * underrated half: on a months-long search the same compound resurfaces
 * weekly under a different agent, and an explicit "no" is as valuable as a
 * "yes".
 *
 * No account is required, and none is offered here. A phone number is
 * offered on /me, after there is something worth keeping.
 */
export function SaveControls({ clusterId }: { clusterId: string }) {
  const { entryFor, save, discard, forget, patch, ready } = useShortlist();
  const entry = entryFor(clusterId);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const isSaved = entry !== null && entry.verdict === 'saved';
  const isDiscarded = entry !== null && entry.verdict === 'discarded';

  return (
    <div className={styles.wrap}>
      <div className={ui.row}>
        <button
          type="button"
          className={isSaved ? `${ui.btnPrimary} ${styles.grow}` : `${ui.btnSecondary} ${styles.grow}`}
          onClick={() => {
            if (isSaved) void forget(clusterId);
            else {
              void save(clusterId);
              track('saved', { cluster: clusterId });
            }
          }}
          aria-pressed={isSaved}
          data-testid="save-button"
          disabled={!ready}
        >
          <HeartIcon filled={isSaved} />
          {isSaved ? 'Saved' : 'Save to shortlist'}
        </button>

        <button
          type="button"
          className={ui.btnSecondary}
          onClick={() => {
            void discard(clusterId);
            track('discarded', { cluster: clusterId });
          }}
          aria-pressed={isDiscarded}
          data-testid="discard-button"
          disabled={!ready}
        >
          {isDiscarded ? 'Discarded' : SAVED.discard}
        </button>
      </div>

      {entry === null ? null : (
        <>
          <div className={ui.row} role="group" aria-label="Rating">
            {SAVED.ratings.map((r) => (
              <button
                key={r}
                type="button"
                className={entry.rating === r ? ui.chipOn : ui.chip}
                aria-pressed={entry.rating === r}
                onClick={() => void patch(clusterId, { rating: entry.rating === r ? null : r })}
              >
                {r}
              </button>
            ))}
          </div>

          <label className={styles.noteLabel}>
            <span className="sr-only">Note about this place</span>
            <textarea
              className={styles.note}
              rows={3}
              placeholder={SAVED.notePlaceholder}
              value={noteDraft ?? entry.note ?? ''}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => {
                if (noteDraft === null) return;
                void patch(clusterId, { note: noteDraft.trim() === '' ? null : noteDraft });
                track('note_added', { cluster: clusterId });
                setNoteDraft(null);
              }}
              data-testid="note-input"
            />
          </label>

          {entry.pending ? (
            <p className={ui.caption} role="status">
              Saved on this device · will sync
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0112 7a4.5 4.5 0 017 3.5C19 15.65 12 20 12 20z"
        fill={filled ? 'var(--clay-500)' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
