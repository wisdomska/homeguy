/**
 * The result card's view model.
 *
 * Ported from HomeGuy Web.dc.html:1256-1291 card(), widened to carry the
 * source provenance Contract A requires and the near-miss reason the mobile
 * spine specifies (Pass 1:870).
 *
 * This is pure and tested. The component that renders it has no logic in it
 * at all, which is how the card stays identical in every missing-data state.
 */

import { CARD } from './copy';
import { unitTypeLabel } from './copy';
import { formatMoney, PESEWAS_PER_CEDI } from './money';
import { freshness, type Freshness } from './freshness';
import { headlineListing } from './derive';
import { planFor, type PlanBlock } from './plan';
import type { ClusterView, Pesewas } from './types';

export interface CardContext {
  /** Town slugs the user chose. Used to label a result from somewhere else. */
  townSlugs: string[];
  /** Max cash the user can raise, in minor units. */
  lumpMax: Pesewas | null;
  dataSaver: boolean;
  offline: boolean;
  /** Set when this card is shown in the labelled near-miss group. */
  nearMissReason?: string;
}

export interface CardModel {
  id: string;
  slug: string;
  href: string;

  /** The largest element on the card, always. */
  figure: string;
  qualifier: string;
  /** true when no listing stated an advance, so no total exists. */
  noTotal: boolean;

  typeLabel: string;
  place: string;
  placeNotStated: boolean;

  plan: PlanBlock[];
  hasPhoto: boolean;
  thumbnailUrl: string | null;
  photoLabel: string;
  photoCount: number;

  /** "Bantama · 4.2km away" when the result is outside the chosen towns. */
  awayLabel: string | null;
  /** "GH¢2,340 OVER YOUR UPFRONT" */
  overLabel: string | null;
  /** The one reason a near-miss missed. */
  nearMissReason: string | null;

  clusterLabel: string | null;
  advanceNotStated: boolean;
  fresh: Freshness;

  /** Every card names its sources and links back. Contract A. */
  sourceLine: string;
  sourceCount: number;
}

export function buildCard(
  c: ClusterView,
  ctx: CardContext,
  sourceNameOf: (sourceId: string) => string,
): CardModel {
  const head = headlineListing(c);
  const total = c.totalToMoveInMin;
  const noTotal = total === null;

  const figure = noTotal ? formatMoney(c.rentMin) : formatMoney(total);

  let qualifier: string;
  if (noTotal) {
    qualifier = CARD.qualifierNoAdvance;
  } else if (head === null) {
    qualifier = CARD.qualifierNoAdvance;
  } else if (head.advanceMonths === null) {
    qualifier = CARD.qualifierNoAdvance;
  } else {
    qualifier = CARD.qualifier(formatMoney(head.monthlyRent), head.advanceMonths);
  }

  const landmarkName = c.landmark === null ? null : c.landmark.name;
  const place =
    landmarkName === null
      ? CARD.locationNotStated(c.town.name)
      : c.approxDistanceM === null
        ? `Near ${landmarkName}`
        : `~${c.approxDistanceM}m from ${landmarkName}`;

  // Data saver and offline both mean: no image request at all.
  // A photo is shown only when we hold our own ingested thumbnail. We link
  // back to the source for its imagery rather than rehosting it.
  const hasPhoto =
    c.photoCount > 0 && c.thumbnailUrl !== null && !ctx.dataSaver && !ctx.offline;
  const photoLabel = ctx.offline
    ? 'Offline'
    : c.photoCount === 0
      ? CARD.noPhoto
      : CARD.photoCount(c.photoCount);

  const outsideChosen =
    ctx.townSlugs.length > 0 && !ctx.townSlugs.includes(c.town.slug);
  const awayKm = c.town.hubDistanceM === null ? null : Math.round(c.town.hubDistanceM / 100) / 10;
  const awayLabel =
    outsideChosen && awayKm !== null ? CARD.away(c.town.name, awayKm) : outsideChosen ? c.town.name : null;

  const overLabel =
    ctx.lumpMax !== null && total !== null && total > ctx.lumpMax
      ? `${formatMoney(total - ctx.lumpMax)} OVER YOUR UPFRONT`
      : null;

  const clustered = c.sourceCount > 1;
  const clusterLabel =
    clustered && c.rentMin !== null && c.rentMax !== null
      ? CARD.clusterLabel(
          c.listings.length,
          plainCedis(c.rentMin),
          plainCedis(c.rentMax),
        )
      : null;

  const names = [...new Set(c.listings.map((l) => sourceNameOf(l.sourceId)))];

  return {
    id: c.id,
    slug: c.slug,
    href: `/place/${c.slug}`,
    figure,
    qualifier,
    noTotal,
    typeLabel: unitTypeLabel(c.unitType),
    place,
    placeNotStated: landmarkName === null,
    plan: planFor(c.unitType),
    hasPhoto,
    thumbnailUrl: c.thumbnailUrl,
    photoLabel,
    photoCount: c.photoCount,
    awayLabel,
    overLabel,
    nearMissReason: ctx.nearMissReason === undefined ? null : ctx.nearMissReason,
    clusterLabel,
    advanceNotStated: c.advanceMonthsMin === null,
    fresh: freshness(c.seenDaysAgo, clustered),
    sourceLine: names.join(', '),
    sourceCount: c.sourceCount,
  };
}

/** The cluster badge shows bare figures: "3 agents · 1,200–1,800". */
function plainCedis(amount: Pesewas): string {
  return Math.round(amount / PESEWAS_PER_CEDI).toLocaleString('en-US');
}
