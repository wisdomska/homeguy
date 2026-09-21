import Link from 'next/link';
import { ResultCard, ResultCardSkeleton } from '@/components/ResultCard';
import { buildCard, type CardModel } from '@/core/cardModel';
import { clustersFor, nameFrom, sourceNameMap } from '@/core';
import type { ClusterView } from '@/core/types';
import ui from '@/components/ui.module.css';
import styles from './cards.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'The result card, in every state',
  robots: { index: false, follow: false },
};

/**
 * The result card in every state it has, on one page.
 *
 * Built from real listings in the index, not from fixtures. It used to
 * render the design's seed data, which meant a public page on the live site
 * showed invented rooms with invented prices — exactly the thing this
 * product exists not to do. If a state has no real example right now, the
 * page says so instead of manufacturing one.
 *
 * The thing to look at is not the states individually. It is that the card
 * is the same size in all of them: missing data is the common case here, and
 * a card that shrank when the advance was absent would make a real results
 * list jitter its way down the screen as it rendered.
 */
export default async function CardsPage() {
  const all = await clustersFor([]);
  const sourceName = nameFrom(await sourceNameMap());

  const ctx = { townSlugs: [] as string[], lumpMax: null, dataSaver: false, offline: false };
  const card = (c: ClusterView | undefined, over: Partial<typeof ctx> = {}): CardModel | null =>
    c === undefined ? null : buildCard(c, { ...ctx, ...over }, sourceName);

  const find = (p: (c: ClusterView) => boolean) => all.find(p);

  const withTotal = find((c) => c.totalToMoveInMin !== null);
  const noAdvance = find((c) => c.advanceMonthsMin === null);
  const clustered = find((c) => c.sourceCount > 1);
  const noPhoto = find((c) => c.thumbnailUrl === null);
  const noLandmark = find((c) => c.landmark === null);
  const stale = find((c) => c.seenDaysAgo > 30);
  const anyOne = all[0];

  const cases: Array<{ title: string; note: string; card: CardModel | null; over?: boolean }> = [
    {
      title: '1 · Advance stated, so there is a total',
      note: 'The rare one. About 4% of the index — neither Jiji nor Tonaton publishes an advance term.',
      card: card(withTotal),
    },
    {
      title: '2 · No advance stated',
      note: 'The common one. The figure falls back to the monthly rent and the qualifier says why. No total is invented.',
      card: card(noAdvance),
    },
    {
      title: '3 · Clustered across more than one source',
      note: 'The same room advertised on both sites, merged. Each listing keeps its own price.',
      card: card(clustered),
    },
    {
      title: '4 · No photo',
      note: 'The plan glyph takes the box. Same dimensions, and the label is honest about it.',
      card: card(noPhoto),
    },
    {
      title: '5 · No landmark',
      note: '"Location not stated" — rendered, not hidden, and not in a warning colour.',
      card: card(noLandmark),
    },
    {
      title: '6 · Stale',
      note: 'Past 30 days. Ember, with the text label doing the work as well as the colour.',
      card: card(stale),
    },
    {
      title: '7 · Data saver on',
      note: 'Text only. No image request is made at all, which is the promise the toggle makes.',
      card: card(anyOne, { dataSaver: true }),
    },
    {
      title: '8 · Loading',
      note: 'Same box, same rhythm, so nothing moves when the content lands.',
      card: null,
    },
  ];

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <h1 className={ui.h2}>The result card, in every state</h1>
      <p className={ui.body}>
        Every card below is a real listing from the index, built by the same function. Measure
        them: the thumbnail box, the figure line and the badge row hold their height in all of
        them.
      </p>

      {all.length === 0 ? (
        <div className={ui.panel}>
          <p className={ui.body}>
            The index is empty, so there is nothing real to show. This page will not invent a
            listing to fill itself.
          </p>
          <Link className={ui.btnSecondary} href="/admin/health">
            Check ingestion health
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {cases.map((c) => (
            <section key={c.title} className={styles.case}>
              <h2 className={ui.overline}>{c.title}</h2>
              <p className={ui.caption}>{c.note}</p>
              {c.title.startsWith('8') ? (
                <ResultCardSkeleton index={2} />
              ) : c.card === null ? (
                <p className={`${ui.caption} ${ui.notStated}`}>
                  No listing in the index is in this state right now, so there is nothing to
                  show here.
                </p>
              ) : (
                <ResultCard card={c.card} over={c.over === true} />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
