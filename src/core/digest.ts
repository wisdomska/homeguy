/**
 * The digest — the alert channel, because push is not one.
 *
 * Push renders for roughly 10-20% of lapsed users on Transsion-class
 * devices (Research Dossier C7), so the product is designed for the
 * assumption that the notification did not arrive. Everything new waits on
 * /digest, and goes out by WhatsApp or email only when a number or address
 * is on file.
 *
 * The matcher runs as a job after each ingest pass, against every saved
 * search.
 */

import { matching, type Filters } from './filters';
import type { ClusterView } from './types';

export type ChangeKind = 'new' | 'taken' | 'price_changed';

export interface DigestItem {
  clusterId: string;
  slug: string;
  kind: ChangeKind;
  /** Set only for price_changed. Minor units. */
  previousRent: number | null;
  at: Date;
}

export interface DigestGroup {
  day: 'TODAY' | 'YESTERDAY' | 'THIS WEEK';
  items: DigestItem[];
}

/**
 * What has changed in a saved search since the user last looked.
 *
 * `taken` and `price_changed` are produced from the listing event log that
 * the verification job writes. With no source enabled there are no such
 * events yet, and the digest says what it knows rather than padding itself
 * with "new" items that are merely old.
 */
export function digestFor(
  all: ClusterView[],
  filters: Filters,
  lastSeenAt: Date,
  now: Date,
): DigestGroup[] {
  const matched = matching(all, filters);

  const items: DigestItem[] = [];
  for (const c of matched) {
    const firstSeen = c.listings
      .map((l) => l.firstSeenAt.getTime())
      .sort((a, b) => a - b)[0];
    if (firstSeen === undefined) continue;
    if (firstSeen <= lastSeenAt.getTime()) continue;
    items.push({
      clusterId: c.id,
      slug: c.slug,
      kind: 'new',
      previousRent: null,
      at: new Date(firstSeen),
    });

    if (c.listings.some((l) => l.goneAt !== null)) {
      items.push({
        clusterId: c.id,
        slug: c.slug,
        kind: 'taken',
        previousRent: null,
        at: now,
      });
    }
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  const day = 86_400_000;
  const groups: DigestGroup[] = [
    { day: 'TODAY', items: items.filter((i) => now.getTime() - i.at.getTime() < day) },
    {
      day: 'YESTERDAY',
      items: items.filter(
        (i) =>
          now.getTime() - i.at.getTime() >= day && now.getTime() - i.at.getTime() < 2 * day,
      ),
    },
    {
      day: 'THIS WEEK',
      items: items.filter(
        (i) =>
          now.getTime() - i.at.getTime() >= 2 * day && now.getTime() - i.at.getTime() < 7 * day,
      ),
    },
  ];

  return groups.filter((g) => g.items.length > 0);
}
