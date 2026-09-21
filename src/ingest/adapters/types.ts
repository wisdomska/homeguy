/**
 * The adapter interface. Every source is one of these and nothing more, so
 * a broken parser fails one job type and names itself, instead of stalling
 * the pipeline.
 *
 * Each adapter ships with fixture-based tests over saved HTML snapshots.
 * When a site changes its markup, exactly one test fails and the failure
 * message is the source's name.
 */

import type { MeterArrangement, UnitType, WaterSource } from '@/core/types';

/** What a parser is allowed to produce. Every field may be null. */
export interface RawListing {
  sourceId: string;
  sourceUrl: string;
  rawTitle: string;
  rawBody: string;

  townHint: string | null;
  landmarkHint: string | null;
  approxDistanceM: number | null;

  unitType: UnitType | null;
  monthlyRent: number | null;
  /** In months. null is the common case and is never filled in. */
  advanceMonths: number | null;
  agentFee: number | null;

  agentName: string | null;
  /**
   * Only ever populated by an adapter whose source config sets
   * mayStoreContact. A Tier 3 parser must return null here even when the
   * page shows a number.
   */
  agentPhone: string | null;

  water: WaterSource | null;
  waterDays: number | null;
  polytank: boolean | null;
  meter: MeterArrangement | null;
  toilet: string | null;
  bathroom: string | null;
  kitchen: string | null;
  gated: boolean | null;

  directions: string | null;
  photoCount: number;
  /** The source's own image URL. We reference it; we never copy it. */
  thumbnailUrl: string | null;
  firstSeenAt: Date | null;
}

export function emptyRawListing(sourceId: string, sourceUrl: string): RawListing {
  return {
    sourceId,
    sourceUrl,
    rawTitle: '',
    rawBody: '',
    townHint: null,
    landmarkHint: null,
    approxDistanceM: null,
    unitType: null,
    monthlyRent: null,
    advanceMonths: null,
    agentFee: null,
    agentName: null,
    agentPhone: null,
    water: null,
    waterDays: null,
    polytank: null,
    meter: null,
    toilet: null,
    bathroom: null,
    kitchen: null,
    gated: null,
    directions: null,
    photoCount: 0,
    thumbnailUrl: null,
    firstSeenAt: null,
  };
}

export interface Adapter {
  id: string;
  /** Discover listing URLs. Sitemap, feed, or a permitted index page. */
  discover(ctx: AdapterContext): Promise<string[]>;
  /** Parse one already-fetched page. Pure: no network, so it is testable. */
  parse(html: string, url: string): RawListing | null;
}

export interface AdapterContext {
  fetchImpl?: typeof fetch;
  /** Cap on how many URLs one run may enqueue. */
  limit: number;
}

/* ---- tiny HTML helpers. No parser dependency: the brief allows no
   component or utility packages, and fixtures are controlled input. ---- */

export function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    // The currency sign arrives as an entity more often than not, and
    // losing it means parseCedis stops recognising the figure as money.
    .replace(/&cent;/g, '¢')
    .replace(/&pound;/g, '£')
    .replace(/&euro;/g, '€')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function firstMatch(html: string, re: RegExp): string | null {
  const m = re.exec(html);
  if (m === null) return null;
  const captured = m[1];
  return captured === undefined ? null : captured.trim();
}

export function countMatches(html: string, re: RegExp): number {
  const m = html.match(re);
  return m === null ? 0 : m.length;
}
