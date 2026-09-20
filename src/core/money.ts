/**
 * THE MONEY RULE.
 *
 * Ported from HomeGuy Web.dc.html:1219
 *   tcmiFull(l) { return l.adv == null ? null : l.rent * l.adv + l.comm; }
 *
 * Total cash to move in = monthlyRent x advanceMonths + agentFee,
 * and it is null the moment advanceMonths is null.
 *
 * THIS FILE IS IN THE ADVANCE PATH. It is scanned by
 * src/core/__tests__/no-defaults.test.ts, which fails the build if it finds
 * `??`, a `||` fallback, or any of the words "typically", "assume",
 * "default", "usually 6", "usually 12". Do not add one. There is no such
 * thing as a sensible default for a Ghanaian advance term.
 */

import type { Pesewas } from './types';

/** One cedi in minor units. */
export const PESEWAS_PER_CEDI = 100;

export function cedis(amount: number): Pesewas {
  return Math.round(amount * PESEWAS_PER_CEDI);
}

/**
 * The advance subtotal: rent x months. null when either input is not stated.
 * Web.dc.html:1218 tcmi()
 */
export function advanceTotal(
  monthlyRent: Pesewas | null,
  advanceMonths: number | null,
): Pesewas | null {
  if (monthlyRent === null) return null;
  if (advanceMonths === null) return null;
  return monthlyRent * advanceMonths;
}

/**
 * Total cash to move in, including the agent fee.
 * Web.dc.html:1219 tcmiFull()
 *
 * An unstated agent fee does NOT make the total null - the design shows the
 * advance subtotal and renders the fee row as "Not stated" beside it
 * (Web.dc.html:1357). An unstated advance always does.
 */
export function totalToMoveIn(
  monthlyRent: Pesewas | null,
  advanceMonths: number | null,
  agentFee: Pesewas | null,
): Pesewas | null {
  const advance = advanceTotal(monthlyRent, advanceMonths);
  if (advance === null) return null;
  if (agentFee === null) return advance;
  return advance + agentFee;
}

/**
 * Format minor units as the brand sets it: GH¢ tight to the figure,
 * grouped thousands, no decimals. Brand Guide §8.
 */
export function formatMoney(amount: Pesewas | null): string {
  if (amount === null) return NOT_STATED;
  const whole = Math.round(amount / PESEWAS_PER_CEDI);
  return `GH¢${whole.toLocaleString('en-US')}`;
}

/** The one rendering of a missing value. Never hidden, never inferred. */
export const NOT_STATED = 'Not stated';
