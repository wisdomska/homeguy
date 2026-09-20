'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { COMPARE, SAVED } from '@/core/copy';
import { track } from '@/lib/analytics';
import { useClusters } from '@/lib/useClusters';
import { useShortlist } from '@/lib/shortlist';
import ui from '@/components/ui.module.css';
import styles from './compare.module.css';

/**
 * COMPARE. Web.dc.html:778-824, with the Note row from Pass 1:221.
 *
 * Up to four places, a fixed attribute set, and every empty cell rendered
 * as "Not stated" rather than blank - a blank cell in a comparison reads as
 * "no", which is a different claim from "nobody said".
 */
export default function ComparePage() {
  const { saved } = useShortlist();
  const chosen = saved.slice(0, 4);
  const { clusters } = useClusters(chosen.map((e) => e.clusterId));

  useEffect(() => {
    if (chosen.length >= 2) track('compare_used', { places: chosen.length });
  }, [chosen.length]);

  const byId = new Map(clusters.map((c) => [c.card.id, c]));

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <Link className={ui.btnTertiary} href="/saved">
        ← {SAVED.title}
      </Link>
      <h1 className={ui.h2}>{COMPARE.title}</h1>
      <p className={`${ui.caption} num`}>
        {chosen.length === 0 ? COMPARE.empty : COMPARE.line(chosen.length)}
      </p>

      {chosen.length === 0 ? null : (
        <div className={styles.scroller}>
          <table className={styles.table}>
            <caption className="sr-only">
              Saved places compared on cash to move in, rent, advance, type, water, meter,
              toilet, your rating and your note
            </caption>
            <thead>
              <tr>
                <th scope="col" className={ui.overline}>
                  {COMPARE.place}
                </th>
                {chosen.map((e) => {
                  const p = byId.get(e.clusterId);
                  return (
                    <th scope="col" key={e.clusterId} className={styles.colHead}>
                      {p === undefined ? e.clusterId : p.compare.name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARE.keys.map((key) => (
                <tr key={key}>
                  <th scope="row" className={styles.rowHead}>
                    {key}
                  </th>
                  {chosen.map((e) => {
                    const p = byId.get(e.clusterId);
                    const v = p === undefined ? null : cellFor(key, p.compare, e.rating, e.note);
                    return (
                      <td
                        key={e.clusterId}
                        className={v === null ? `${styles.cell} ${ui.notStated}` : `${styles.cell} num`}
                      >
                        {v ?? 'Not stated'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={ui.caption}>{COMPARE.foot}</p>
    </div>
  );
}

function cellFor(
  key: string,
  c: { cashToMoveIn: string | null; monthly: string; advance: string | null; type: string; water: string | null; meter: string | null; toilet: string | null },
  rating: string | null,
  note: string | null,
): string | null {
  switch (key) {
    case 'Cash to move in':
      return c.cashToMoveIn;
    case 'Monthly':
      return c.monthly;
    case 'Advance':
      return c.advance;
    case 'Type':
      return c.type;
    case 'Water':
      return c.water;
    case 'Meter':
      return c.meter;
    case 'Toilet':
      return c.toilet;
    case 'Rating':
      return rating;
    case 'Note':
      return note;
    default:
      return null;
  }
}
