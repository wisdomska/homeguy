'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ResultCard } from '@/components/ResultCard';
import { DIGEST } from '@/core/copy';
import type { CardModel } from '@/core/cardModel';
import { usePref } from '@/lib/shortlist';
import ui from '@/components/ui.module.css';
import styles from './digest.module.css';

interface Group {
  day: string;
  items: Array<{ kind: string; card: CardModel }>;
}

/**
 * DIGEST. Web.dc.html:825-859, grouped as Pass 1:350 specifies.
 *
 * "We don't send push notifications — they don't arrive on most phones
 * here." That is not an apology, it is the design. Everything new waits on
 * this page, and goes out by WhatsApp or email only if a number or address
 * is on file.
 */
export default function DigestPage() {
  const [searches] = usePref<string[]>('savedSearches', []);
  const [lastSeen, setLastSeen] = usePref<number>('digestLastSeen', 0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searches.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }
    const since = lastSeen === 0 ? Date.now() - 7 * 86_400_000 : lastSeen;
    let live = true;
    Promise.all(
      searches.map((q) =>
        fetch(`/api/digest?${q}${q === '' ? '' : '&'}since=${since}`)
          .then((r) => r.json())
          .catch(() => ({ groups: [] })),
      ),
    )
      .then((results: Array<{ groups: Group[] }>) => {
        if (!live) return;
        const merged = new Map<string, Group>();
        for (const r of results) {
          for (const g of r.groups) {
            const existing = merged.get(g.day);
            if (existing === undefined) merged.set(g.day, { ...g, items: [...g.items] });
            else existing.items.push(...g.items);
          }
        }
        setGroups([...merged.values()]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searches.join('|')]);

  // Mark as read on the way out, not on the way in, so a user who bounces
  // does not lose the list.
  useEffect(() => () => setLastSeen(Date.now()), [setLastSeen]);

  const changes = groups.reduce((n, g) => n + g.items.length, 0);
  const daysSince =
    lastSeen === 0 ? null : Math.max(0, Math.floor((Date.now() - lastSeen) / 86_400_000));

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <h1 className={ui.h2}>{DIGEST.title}</h1>

      {searches.length === 0 ? (
        <div className={ui.panel}>
          <p className={ui.body}>
            You have no saved searches yet. Save one from a results page and everything new in
            it collects here.
          </p>
          <Link className={ui.btnSecondary} href="/search">
            Go to results
          </Link>
        </div>
      ) : (
        <p className={`${ui.caption} num`}>
          {loading
            ? 'Checking your saved searches…'
            : changes === 0
              ? DIGEST.empty
              : daysSince === null
                ? `${changes} changes across ${searches.length} saved ${searches.length === 1 ? 'search' : 'searches'}`
                : DIGEST.line(changes, `${searches.length} saved searches`, daysSince)}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.day} className={styles.group}>
          <h2 className={ui.overline}>{g.day}</h2>
          <div className={ui.grid}>
            {g.items.map((i) => (
              <div key={`${g.day}-${i.card.id}`} className={styles.item}>
                {i.kind === 'taken' ? (
                  <span className={styles.tagTaken}>{DIGEST.tagTaken}</span>
                ) : null}
                <ResultCard card={i.card} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className={ui.caption}>{DIGEST.foot}</p>
    </div>
  );
}
