import { describe, expect, it } from 'vitest';
import { advanceTotal, cedis, formatMoney, NOT_STATED, totalToMoveIn } from '../money';
import { deriveCluster } from '../derive';
import type { Listing } from '../types';

/**
 * The money rule, tested from both ends: the function, and every cluster in
 * the seed that exercises it.
 */

function listing(partial: Partial<Listing>): Listing {
  return {
    id: 'l',
    clusterId: 'c',
    sourceId: 'jiji',
    sourceUrl: 'https://example.invalid/x',
    monthlyRent: cedis(700),
    advanceMonths: 12,
    agentFee: cedis(420),
    agentName: null,
    agentPhone: null,
    reacLicensed: null,
    firstSeenAt: new Date(0),
    lastVerifiedAt: new Date(0),
    goneAt: null,
    rawTitle: '',
    rawBody: '',
    lawfulBasisNote: '',
    ...partial,
  };
}

describe('totalToMoveIn', () => {
  it('is rent x advance + fee', () => {
    expect(totalToMoveIn(cedis(700), 12, cedis(420))).toBe(cedis(8820));
  });

  it('IS NULL WHENEVER THE ADVANCE IS NULL', () => {
    expect(totalToMoveIn(cedis(700), null, cedis(420))).toBeNull();
    expect(totalToMoveIn(cedis(700), null, null)).toBeNull();
    expect(totalToMoveIn(cedis(0), null, cedis(0))).toBeNull();
    expect(totalToMoveIn(null, null, null)).toBeNull();
  });

  it('is null when the rent is null, whatever the advance says', () => {
    expect(totalToMoveIn(null, 12, cedis(420))).toBeNull();
  });

  it('does not treat a null advance as zero, one, six or twelve', () => {
    const withNull = totalToMoveIn(cedis(700), null, cedis(420));
    expect(withNull).not.toBe(cedis(420));
    expect(withNull).not.toBe(cedis(700));
    expect(withNull).not.toBe(cedis(4200));
    expect(withNull).not.toBe(cedis(8400));
    expect(withNull).toBeNull();
  });

  it('keeps the advance subtotal when only the fee is unstated', () => {
    // An unstated fee is not an unstated advance. The total still exists,
    // and the fee row renders as "Not stated" beside it.
    expect(totalToMoveIn(cedis(700), 12, null)).toBe(cedis(8400));
  });

  it('never returns a fractional minor unit', () => {
    const t = totalToMoveIn(cedis(333.33), 7, cedis(99.99));
    expect(t).not.toBeNull();
    expect(Number.isInteger(t)).toBe(true);
  });
});

describe('advanceTotal', () => {
  it('is null when the advance is null', () => {
    expect(advanceTotal(cedis(500), null)).toBeNull();
  });
});

describe('deriveCluster', () => {
  it('reports no total when no listing states an advance', () => {
    const d = deriveCluster([
      listing({ id: 'a', advanceMonths: null, agentFee: null }),
      listing({ id: 'b', advanceMonths: null, agentFee: null, monthlyRent: cedis(800) }),
    ]);
    expect(d.totalToMoveInMin).toBeNull();
    expect(d.totalToMoveInMax).toBeNull();
    expect(d.advanceMonthsMin).toBeNull();
    // The rents are still known, and still shown.
    expect(d.rentMin).toBe(cedis(700));
    expect(d.rentMax).toBe(cedis(800));
  });

  it('builds the range only from listings that stated an advance', () => {
    const d = deriveCluster([
      listing({ id: 'a', monthlyRent: cedis(700), advanceMonths: 12, agentFee: cedis(420) }),
      listing({ id: 'b', monthlyRent: cedis(800), advanceMonths: null, agentFee: null }),
      listing({ id: 'c', monthlyRent: cedis(900), advanceMonths: 6, agentFee: null }),
    ]);
    // 700x12+420 = 8820, 900x6 = 5400
    expect(d.totalToMoveInMin).toBe(cedis(5400));
    expect(d.totalToMoveInMax).toBe(cedis(8820));
    // The cluster is never collapsed: all three rents survive.
    expect(d.rentMin).toBe(cedis(700));
    expect(d.rentMax).toBe(cedis(900));
  });

  it('ignores listings that are gone', () => {
    const d = deriveCluster([
      listing({ id: 'a', goneAt: new Date() }),
      listing({ id: 'b', monthlyRent: cedis(500), advanceMonths: 6, agentFee: null }),
    ]);
    expect(d.rentMin).toBe(cedis(500));
    expect(d.sourceCount).toBe(1);
  });
});

describe('formatMoney', () => {
  it('sets GH¢ tight to the figure with grouped thousands', () => {
    expect(formatMoney(cedis(8400))).toBe('GH¢8,400');
    expect(formatMoney(cedis(500))).toBe('GH¢500');
  });

  it('renders null as "Not stated", never as zero and never hidden', () => {
    expect(formatMoney(null)).toBe(NOT_STATED);
    expect(formatMoney(null)).not.toBe('');
    expect(formatMoney(null)).not.toContain('0');
  });
});
