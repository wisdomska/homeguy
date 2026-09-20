import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, matching, passes, splitByBudget } from '../filters';
import { assessCoverage, findBlockingFilter } from '../coverage';
import { nearMisses } from '../nearmiss';
import { parseFilters, toQuery, searchHref } from '../url';
import { cedis } from '../money';
import { unitTypeLabel } from '../copy';
import { clusterById, clustersFor, clustersInTown } from '../repo';

const ahodwo = () => clustersFor(['ahodwo']);

describe('the not-stated advance is excluded by default and never hidden', () => {
  it('excludes a null-advance cluster from a strict match', () => {
    const a5 = clusterById('a5');
    expect(a5).not.toBeNull();
    if (a5 === null) return;
    expect(passes(a5, { ...EMPTY_FILTERS, towns: ['ahodwo'] })).toBe(false);
  });

  it('includes it the moment the user asks for it', () => {
    const a5 = clusterById('a5');
    if (a5 === null) return;
    expect(
      passes(a5, { ...EMPTY_FILTERS, towns: ['ahodwo'], includeNotStated: true }),
    ).toBe(true);
  });

  it('never prices a null-total cluster out of a budget', () => {
    const a5 = clusterById('a5');
    if (a5 === null) return;
    const { affordable, over } = splitByBudget([a5], cedis(100));
    // You cannot price something out on a number nobody stated.
    expect(affordable).toHaveLength(1);
    expect(over).toHaveLength(0);
  });
});

describe('the hub fallback', () => {
  it('reaches Bantama and Nhyiaeso from an Ahodwo search', () => {
    const towns = new Set(ahodwo().map((c) => c.town.slug));
    expect(towns.has('bantama')).toBe(true);
    expect(towns.has('nhyiaeso')).toBe(true);
  });
});

describe('the two zero states are distinguishable', () => {
  it('reports "filters" when we track things here but nothing matches', () => {
    const all = clustersFor(['ahodwo']);
    const filters = { ...EMPTY_FILTERS, towns: ['ahodwo'], types: ['hostel_bed' as const] };
    const matched = matching(all, filters);
    const verdict = assessCoverage(all, filters, matched);
    expect(verdict.zero).toBe(true);
    expect(verdict.cause).toBe('filters');
    expect(verdict.trackedHere).toBeGreaterThan(0);
  });

  it('reports "coverage" when we track nothing here at all', () => {
    const all = clustersFor(['lawra']);
    const filters = { ...EMPTY_FILTERS, towns: ['lawra'] };
    const matched = matching(all, filters);
    const verdict = assessCoverage(all, filters, matched);
    expect(verdict.zero).toBe(true);
    expect(verdict.cause).toBe('coverage');
    expect(verdict.trackedHere).toBe(0);
  });

  it('names the filter that is blocking everything', () => {
    const all = clustersFor(['ahodwo']);
    const filters = { ...EMPTY_FILTERS, towns: ['ahodwo'], types: ['hostel_bed' as const] };
    const blocking = findBlockingFilter(all, filters, unitTypeLabel);
    expect(blocking).not.toBeNull();
    expect(blocking?.name).toBe('Hostel bed');
    expect(blocking?.count).toBeGreaterThan(0);
  });
});

describe('labelled near-misses', () => {
  it('appear only when the strict set is small', () => {
    const all = clustersFor(['bawku']);
    const filters = { ...EMPTY_FILTERS, towns: ['bawku'] };
    const matched = matching(all, filters);
    if (matched.length > 0 && matched.length < 6) {
      const misses = nearMisses(clustersFor([]), filters, matched, unitTypeLabel);
      for (const m of misses) {
        expect(m.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('are empty when there is plenty to show', () => {
    const all = clustersFor(['ahodwo']);
    const filters = { ...EMPTY_FILTERS, towns: ['ahodwo'] };
    const matched = matching(all, filters);
    expect(matched.length).toBeGreaterThanOrEqual(6);
    expect(nearMisses(all, filters, matched, unitTypeLabel)).toEqual([]);
  });
});

describe('the URL is the state', () => {
  it('round-trips a full filter set', () => {
    const filters = {
      ...EMPTY_FILTERS,
      towns: ['ahodwo', 'bantama'],
      lumpMax: cedis(8400),
      types: ['chamber_and_hall_self_contain' as const],
      advances: [6, 12],
      seen: '7' as const,
      includeNotStated: true,
      water: ['gwcl' as const],
      gated: true,
    };
    const q = toQuery(filters);
    expect(parseFilters(new URLSearchParams(q))).toEqual(filters);
  });

  it('produces the shape the design specifies', () => {
    const href = searchHref({
      ...EMPTY_FILTERS,
      towns: ['ahodwo'],
      lumpMax: cedis(8400),
      types: ['chamber_and_hall_self_contain' as const],
      advances: [6, 12],
      seen: '7' as const,
    });
    expect(href).toContain('area=ahodwo');
    expect(href).toContain('lumpMax=8400');
    expect(href).toContain('type=chamber_and_hall_self_contain');
    expect(href).toContain('advance=6%2C12');
    expect(href).toContain('seen=7');
  });

  it('reproduces the exact result set from a pasted link', () => {
    const url = '/search?area=ahodwo&lumpMax=8400&advance=12&seen=30';
    const filters = parseFilters(new URLSearchParams(url.split('?')[1]));
    const a = matching(clustersFor(filters.towns), filters).map((c) => c.id);
    const b = matching(clustersFor(filters.towns), filters).map((c) => c.id);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('ignores junk rather than throwing', () => {
    const f = parseFilters(new URLSearchParams('type=nonsense&advance=abc&lumpMax=-5&seen=nope'));
    expect(f.types).toEqual([]);
    expect(f.advances).toEqual([]);
    expect(f.lumpMax).toBeNull();
    expect(f.seen).toBe('any');
  });
});

describe('the thin threshold', () => {
  it('marks a small result set as thin without calling it zero', () => {
    const all = clustersInTown('bawku');
    const filters = { ...EMPTY_FILTERS, towns: ['bawku'] };
    const matched = matching(all, filters);
    const verdict = assessCoverage(all, filters, matched);
    expect(verdict.zero).toBe(false);
    expect(verdict.thin).toBe(true);
  });
});
