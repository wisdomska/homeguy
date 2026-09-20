/**
 * Freshness bands. Ported from HomeGuy Web.dc.html:1249-1254 freshBits().
 *
 * Brand Guide §7 rule 4: colour never carries meaning alone. Every band
 * returns a text label as well as its tokens.
 */

export type FreshnessBand = 'fresh' | 'ageing' | 'stale';

export interface Freshness {
  band: FreshnessBand;
  label: string;
  /** CSS custom property names, never hex literals. */
  bg: string;
  ink: string;
}

const DAYS_FRESH = 7;
const DAYS_AGEING = 30;

/**
 * @param days whole days since last verification
 * @param clustered true when the cluster has more than one source listing,
 *   which shortens the label so it fits beside the cluster badge
 */
export function freshness(days: number, clustered: boolean): Freshness {
  if (days <= DAYS_FRESH) {
    return {
      band: 'fresh',
      label: clustered ? `Seen ${days}d ago` : `Seen ${days} ${days === 1 ? 'day' : 'days'} ago`,
      bg: 'var(--palm-50)',
      ink: 'var(--palm-700)',
    };
  }
  const weeks = Math.round(days / 7);
  if (days <= DAYS_AGEING) {
    return {
      band: 'ageing',
      label: clustered ? `Seen ${weeks}w ago` : `Seen ${weeks} weeks ago`,
      bg: 'var(--dust-100)',
      ink: 'var(--dust-600)',
    };
  }
  return {
    band: 'stale',
    label: clustered ? `Not seen ${weeks}w` : `Not seen in ${weeks} weeks`,
    bg: 'var(--ember-50)',
    ink: 'var(--ember-700)',
  };
}

export function daysSince(date: Date, now: Date): number {
  const ms = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
