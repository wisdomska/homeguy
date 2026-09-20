import { ResultCard, ResultCardSkeleton } from '@/components/ResultCard';
import { buildCard, type CardModel } from '@/core/cardModel';
import { clusterById, sourceName } from '@/core/repo';
import ui from '@/components/ui.module.css';
import styles from './cards.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'The result card, in every state',
  robots: { index: false, follow: false },
};

/**
 * Phase 8 step 4: the result card in isolation, in all eight states, on one
 * page.
 *
 * The thing to look at here is not the states individually. It is that the
 * card is the same size in all of them. Missing data is the common case in
 * this market - if the card shrank when the advance was not stated, or grew
 * a gap where a photo would be, a real results list would jitter its way
 * down the screen as it rendered.
 */
export default function CardsPage() {
  const cases: Array<{ title: string; note: string; card: CardModel | null; over?: boolean }> = [
    {
      title: '1 · Full',
      note: 'Advance stated, fee stated, landmark, photo count, one source.',
      card: card('a4'),
    },
    {
      title: '2 · Clustered — three agents who disagree',
      note: 'GH¢700, GH¢800 and GH¢900 a month for one place. Never collapsed to one price.',
      card: card('a1'),
    },
    {
      title: '3 · No advance stated',
      note: 'The figure falls back to the monthly rent and the qualifier says why. No total is invented.',
      card: card('a5'),
    },
    {
      title: '4 · No photo',
      note: 'The plan glyph takes the box. Same dimensions, and the label is honest about it.',
      card: card('b1'),
    },
    {
      title: '5 · No landmark',
      note: '"Location not stated" in dust-500 — rendered, not hidden, and not in a warning colour.',
      card: card('t3'),
    },
    {
      title: '6 · Stale',
      note: 'Past 30 days. Ember, with the text label doing the work as well as the colour.',
      card: card('a3'),
    },
    {
      title: '7 · Data saver on',
      note: 'Text-only. No image request is made at all, which is the promise the toggle makes.',
      card: card('a4', { dataSaver: true }),
    },
    {
      title: '8 · Loading',
      note: 'Same box, same rhythm, so nothing moves when the content lands.',
      card: null,
    },
  ];

  const extras: Array<{ title: string; note: string; card: CardModel | null; over: boolean }> = [
    {
      title: '9 · Over budget',
      note: 'Shown below a divider, never hidden. The overshoot is the label.',
      card: card('e1', { lumpMax: 500_000 }),
      over: true,
    },
    {
      title: '10 · Near miss, labelled',
      note: 'One reason, stated plainly. Pass 1:870.',
      card: card('a7', { townSlugs: ['ahodwo'], nearMissReason: 'Bantama, 4.2km away' }),
      over: true,
    },
  ];

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <h1 className={ui.h2}>The result card, in every state</h1>
      <p className={ui.body}>
        Every card below is built by the same function from the same seed data. Measure them:
        the thumbnail box, the figure line and the badge row hold their height in all of them.
      </p>

      <div className={styles.grid}>
        {[...cases, ...extras].map((c) => (
          <section key={c.title} className={styles.case}>
            <h2 className={ui.overline}>{c.title}</h2>
            <p className={ui.caption}>{c.note}</p>
            {c.card === null ? (
              <ResultCardSkeleton index={2} />
            ) : (
              <ResultCard card={c.card} over={c.over === true} />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function card(
  id: string,
  ctx: Partial<{
    townSlugs: string[];
    lumpMax: number | null;
    dataSaver: boolean;
    offline: boolean;
    nearMissReason: string;
  }> = {},
): CardModel | null {
  const c = clusterById(id);
  if (c === null) return null;
  return buildCard(
    c,
    {
      townSlugs: ctx.townSlugs ?? [],
      lumpMax: ctx.lumpMax ?? null,
      dataSaver: ctx.dataSaver ?? false,
      offline: ctx.offline ?? false,
      ...(ctx.nearMissReason === undefined ? {} : { nearMissReason: ctx.nearMissReason }),
    },
    sourceName,
  );
}
