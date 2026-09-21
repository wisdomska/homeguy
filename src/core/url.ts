/**
 * The URL is the state.
 *
 * The design syncs filters to location.hash (Web.dc.html:1083-1094). In the
 * real app they live in the query string so the server can read them, so a
 * pasted link reproduces the exact result set, and so back and forward work.
 * That matters here specifically: searches get forwarded in WhatsApp groups.
 *
 *   /search?area=ahodwo&lumpMax=8400&type=chamber_and_hall_self_contain
 *          &advance=6,12&seen=7
 *
 * Amounts in the URL are whole cedis, because a person reads them. They are
 * converted to minor units on the way in and never leave this module in
 * cedis again.
 */

import { EMPTY_FILTERS, type Filters, type Freshness7or30 } from './filters';
import { PESEWAS_PER_CEDI } from './money';
import { UNIT_TYPES, WATER_SOURCES, METER_ARRANGEMENTS } from './types';
import type { MeterArrangement, UnitType, WaterSource } from './types';

export type QueryLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function read(q: QueryLike, key: string): string | null {
  if (q instanceof URLSearchParams) return q.get(key);
  const v = q[key];
  if (v === undefined) return null;
  if (Array.isArray(v)) return v[0] === undefined ? null : v[0];
  return v;
}

function list(q: QueryLike, key: string): string[] {
  const raw = read(q, key);
  if (raw === null) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function cedisParam(q: QueryLike, key: string): number | null {
  const raw = read(q, key);
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return Math.round(n) * PESEWAS_PER_CEDI;
}

function flag(q: QueryLike, key: string): boolean {
  return read(q, key) === '1';
}

/** The raw thing the person typed into the location field, if anything. */
export function locationQuery(q: QueryLike): string {
  const raw = read(q, 'q');
  return raw === null ? '' : raw.trim();
}

export function parseFilters(q: QueryLike): Filters {
  const seenRaw = read(q, 'seen');
  const seen: Freshness7or30 =
    seenRaw === '7' ? '7' : seenRaw === '30' ? '30' : 'any';

  return {
    ...EMPTY_FILTERS,
    towns: list(q, 'area'),
    lumpMax: cedisParam(q, 'lumpMax'),
    monthlyMax: cedisParam(q, 'monthlyMax'),
    types: list(q, 'type').filter((t): t is UnitType =>
      (UNIT_TYPES as readonly string[]).includes(t),
    ),
    advances: list(q, 'advance')
      .map((a) => Number(a))
      .filter((a) => Number.isInteger(a) && a > 0 && a <= 48),
    includeNotStated: flag(q, 'notstated'),
    seen,
    water: list(q, 'water').filter((w): w is WaterSource =>
      (WATER_SOURCES as readonly string[]).includes(w),
    ),
    polytank: flag(q, 'polytank'),
    meter: list(q, 'meter').filter((m): m is MeterArrangement =>
      (METER_ARRANGEMENTS as readonly string[]).includes(m),
    ),
    privateToilet: flag(q, 'toilet'),
    gated: flag(q, 'gated'),
  };
}

/** The inverse. Produces a stable, minimal query string. */
export function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.towns.length > 0) p.set('area', f.towns.join(','));
  if (f.lumpMax !== null) p.set('lumpMax', String(Math.round(f.lumpMax / PESEWAS_PER_CEDI)));
  if (f.monthlyMax !== null) {
    p.set('monthlyMax', String(Math.round(f.monthlyMax / PESEWAS_PER_CEDI)));
  }
  if (f.types.length > 0) p.set('type', f.types.join(','));
  if (f.advances.length > 0) p.set('advance', f.advances.join(','));
  if (f.includeNotStated) p.set('notstated', '1');
  if (f.seen !== 'any') p.set('seen', f.seen);
  if (f.water.length > 0) p.set('water', f.water.join(','));
  if (f.polytank) p.set('polytank', '1');
  if (f.meter.length > 0) p.set('meter', f.meter.join(','));
  if (f.privateToilet) p.set('toilet', '1');
  if (f.gated) p.set('gated', '1');
  return p.toString();
}

export function searchHref(f: Filters): string {
  const q = toQuery(f);
  return q.length === 0 ? '/search' : `/search?${q}`;
}

/** Drop one filter and produce the link that does it. Used by the zero screens. */
export function withFilter(f: Filters, patch: Partial<Filters>): Filters {
  return { ...f, ...patch };
}

/** A stable key for a saved search, used for digest matching and dedupe. */
export function savedSearchKey(f: Filters): string {
  return toQuery(f);
}
