import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contrast, enforced rather than asserted.
 *
 * White on clay/500 is 2.80:1. It fails WCAG AA, and it is the single most
 * likely thing for someone to write by reflex, because white-on-orange is
 * what every other button in the world looks like. The ink label is
 * 5.73:1 and passes.
 *
 * This test does two things: it checks the maths on the pairings the brand
 * guide fixes, and it greps the whole source tree for the forbidden one.
 */

/* ---- WCAG relative luminance ---------------------------------------- */

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

const CLAY_500 = '#EC6410';
const CLAY_700 = '#9E3D09';
const INK = '#14110F';
const PAPER = '#FFFCF8';
const WHITE = '#FFFFFF';
const DUST_600 = '#6B6360';
const DUST_500 = '#8A7F77';
const PALM_700 = '#0F766E';
const PALM_50 = '#E6F4F1';
const EMBER_700 = '#B42318';
const EMBER_50 = '#FBEAE8';

describe('the pairings the brand guide fixes', () => {
  it('primary button: ink on clay/500 passes AA', () => {
    expect(contrast(INK, CLAY_500)).toBeGreaterThanOrEqual(4.5);
  });

  it('white on clay/500 FAILS AA, which is why there is no token for it', () => {
    // The brand guide §7 prints 2.80:1 here. That figure is carried over
    // from the older orange in Research Dossier §13 (#F97316 on paper is
    // 2.74:1, white on it is 2.80:1). White on clay/500 (#EC6410) actually
    // measures 3.28:1 — computed below, not estimated.
    //
    // It changes nothing that matters: 3.28 is still under the 4.5 AA floor
    // for normal text, so the ink label stays the rule. Logged in
    // docs/BRAND-DEVIATIONS.md.
    const ratio = contrast(WHITE, CLAY_500);
    expect(ratio).toBeCloseTo(3.28, 1);
    expect(ratio).toBeLessThan(4.5);
    // And it is worse than the ink label by a wide margin.
    expect(ratio).toBeLessThan(contrast(INK, CLAY_500));
  });

  it('body text: ink on paper is AAA', () => {
    expect(contrast(INK, PAPER)).toBeGreaterThanOrEqual(7);
  });

  it('secondary text: dust/600 on paper passes AA', () => {
    expect(contrast(DUST_600, PAPER)).toBeGreaterThanOrEqual(4.5);
  });

  it('links: clay/700 on paper passes AA, and clay/500 does not', () => {
    expect(contrast(CLAY_700, PAPER)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(CLAY_500, PAPER)).toBeLessThan(4.5);
  });

  it('not-stated: dust/500 on paper clears the 3:1 large-text floor', () => {
    expect(contrast(DUST_500, PAPER)).toBeGreaterThanOrEqual(3);
  });

  it('control borders: dust/500 clears the 3:1 UI floor', () => {
    expect(contrast(DUST_500, PAPER)).toBeGreaterThanOrEqual(3);
  });

  it('verified and stale badges pass AA on their own tints', () => {
    expect(contrast(PALM_700, PALM_50)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(EMBER_700, EMBER_50)).toBeGreaterThanOrEqual(4.5);
  });
});

/* ---- the grep --------------------------------------------------------- */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, out);
    } else if (/\.(tsx?|css)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('white on clay appears nowhere', () => {
  const files = walk(join(process.cwd(), 'src')).filter(
    (f) => !f.includes('__tests__'),
  );

  it('no declaration pairs a white foreground with a clay background', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split('\n');

      lines.forEach((line, i) => {
        const lower = line.toLowerCase();
        const hasWhiteInk =
          /color:\s*(?:#fff(?:fff)?\b|white\b|var\(--dust-0\))/.test(lower) ||
          /(?:^|[^-])ink:\s*['"]?(?:#fff|white|var\(--dust-0\))/.test(lower);
        const hasClayBg =
          /background(?:-color)?:\s*(?:#ec6410|var\(--clay-500\)|var\(--clay-400\)|var\(--button-primary-bg\))/.test(
            lower,
          );
        if (hasWhiteInk && hasClayBg) {
          offenders.push(`${file}:${i + 1}`);
        }
      });

      // Also catch the two-property form inside one rule block.
      const blocks = src.split('}');
      for (const block of blocks) {
        const lower = block.toLowerCase();
        const white = /color:\s*(?:#fff(?:fff)?\b|white\b|var\(--dust-0\))/.test(lower);
        const clay =
          /background(?:-color)?:\s*(?:#ec6410|var\(--clay-500\)|var\(--clay-400\)|var\(--button-primary-bg\))/.test(
            lower,
          );
        if (white && clay) offenders.push(`${file} (rule block)`);
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('the primary button token pair is ink on clay', () => {
    const tokens = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
    expect(tokens).toContain('--button-primary-ink: var(--dust-900)');
    expect(tokens).toContain('--button-primary-bg: var(--clay-500)');
  });
});
