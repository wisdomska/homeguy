import Link from 'next/link';
import type { CardModel } from '@/core/cardModel';
import styles from './ResultCard.module.css';

/**
 * The result card. All logic lives in src/core/cardModel.ts; this renders
 * what it is given and nothing else.
 *
 * Contract A (Research Dossier §12): total cash to move in as the largest
 * figure, monthly rent and advance itemised beneath it, unit type in
 * Ghanaian vocabulary, landmark-relative location, last verified date,
 * source count and price spread where more than one, one low-resolution
 * thumbnail. Never a view count, a countdown, or a computed total where the
 * advance was not stated.
 */
export function ResultCard({ card, over = false }: { card: CardModel; over?: boolean }) {
  return (
    <Link
      href={card.href}
      className={over ? `${styles.card} ${styles.over}` : styles.card}
      data-testid="result-card"
      data-state-no-advance={card.advanceNotStated ? 'true' : 'false'}
      data-state-no-photo={card.photoCount === 0 ? 'true' : 'false'}
      data-state-no-landmark={card.placeNotStated ? 'true' : 'false'}
      data-state-clustered={card.clusterLabel === null ? 'false' : 'true'}
      data-state-fresh={card.fresh.band}
    >
      <div className={styles.thumb}>
        <div className={styles.plan} aria-hidden="true">
          {card.plan.map((p, i) => (
            <div
              key={i}
              className={styles.planBlock}
              style={{ flex: p.f, height: p.h }}
            />
          ))}
        </div>
        {card.hasPhoto ? (
          <>
            <img
              className={styles.photo}
              src={card.thumbnailUrl ?? ""}
              alt=""
              loading="lazy"
              width={192}
              height={192}
              decoding="async"
            />
            <span className={`${styles.photoBadge} num`}>1/{card.photoCount}</span>
          </>
        ) : (
          <span className={styles.noPhotoLabel}>{card.photoLabel}</span>
        )}
      </div>

      <div className={styles.body}>
        {card.awayLabel === null ? null : (
          <div className={styles.flagRow}>
            <span className={`${styles.awayPill} num`}>{card.awayLabel}</span>
          </div>
        )}
        {card.nearMissReason === null ? null : (
          <div className={`${styles.reason} num`}>{card.nearMissReason}</div>
        )}
        {card.overLabel === null ? null : (
          <div className={`${styles.overLabel} num`}>{card.overLabel}</div>
        )}

        <div className={`${styles.figure} num`}>{card.figure}</div>
        <div className={`${styles.qualifier} num`}>{card.qualifier}</div>
        <div className={styles.type}>{card.typeLabel}</div>
        <div
          className={
            card.placeNotStated ? `${styles.place} ${styles.placeNotStated}` : styles.place
          }
        >
          {card.place}
        </div>

        <div className={styles.badges}>
          {card.clusterLabel === null ? null : (
            <span className={`${styles.badge} ${styles.cluster} num`}>
              <RingsIcon />
              {card.clusterLabel}
            </span>
          )}
          {card.advanceNotStated ? (
            <span className={`${styles.badge} ${styles.notStated}`}>Advance not stated</span>
          ) : null}
          <span
            className={styles.badge}
            style={{ background: card.fresh.bg, color: card.fresh.ink }}
          >
            {card.fresh.label}
          </span>
        </div>

        <div className={styles.sourceLine}>Seen on {card.sourceLine}</div>
      </div>
    </Link>
  );
}

/** The Rings motif. Brand Guide §9: two rings mean more than one source. */
function RingsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="9" ry="5" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="12" cy="12" rx="4" ry="2.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** The loading state. Same box, same rhythm. Web.dc.html:385-402 */
export function ResultCardSkeleton({ index = 0 }: { index?: number }) {
  const w1 = `${48 + ((index * 7) % 22)}%`;
  const w2 = `${70 - ((index * 5) % 18)}%`;
  const w3 = `${58 + ((index * 9) % 20)}%`;
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={`${styles.thumb} ${styles.skeletonBlock}`} />
      <div className={styles.body}>
        <div className={styles.skeletonBlock} style={{ height: 26, width: w1 }} />
        <div className={styles.skeletonLine} style={{ height: 13, width: w2 }} />
        <div className={styles.skeletonLine} style={{ height: 15, width: w3 }} />
        <div className={styles.skeletonLine} style={{ height: 13, width: '44%' }} />
      </div>
    </div>
  );
}
