import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The grep test.
 *
 * Every file listed here is in the advance path. A `??`, a `||` fallback,
 * or a phrase like "typically six months" anywhere in one of them fails the
 * build.
 *
 * This is deliberately blunt. The failure mode it guards against is not
 * someone writing `advanceMonths ?? 12` on purpose — it is someone
 * silencing a TypeScript null warning at three in the morning and shipping
 * a product that quietly invents the single number the whole thing is
 * built on.
 */

const ADVANCE_PATH = [
  'src/core/money.ts',
  'src/core/derive.ts',
  'src/core/filters.ts',
  'src/ingest/normalise.ts',
];

const BANNED_OPERATORS = [
  { pattern: /\?\?/, name: 'nullish coalescing (??)' },
  { pattern: /\|\|\s*(?:0|1|6|12|24)\b/, name: 'a || numeric-default fallback' },
  { pattern: /\|\|\s*['"`]/, name: 'a || string fallback' },
];

const BANNED_PHRASES = [
  'typically',
  'usually 6',
  'usually 12',
  'assume',
  'default advance',
  'defaultadvance',
  'fallback advance',
  'most landlords ask', // belongs in copy.ts, never in a calculation
];

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8');
}

/** Comments may discuss the rule; code may not break it. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('no defaults in the advance path', () => {
  for (const file of ADVANCE_PATH) {
    describe(file, () => {
      const code = stripComments(read(file));

      for (const op of BANNED_OPERATORS) {
        it(`contains no ${op.name}`, () => {
          const line = code
            .split('\n')
            .findIndex((l) => op.pattern.test(l));
          expect(
            line,
            line < 0
              ? ''
              : `${file}:${line + 1} uses ${op.name}. There is no sensible default for a Ghanaian advance term.`,
          ).toBe(-1);
        });
      }

      for (const phrase of BANNED_PHRASES) {
        it(`does not say "${phrase}"`, () => {
          expect(code.toLowerCase()).not.toContain(phrase);
        });
      }
    });
  }

  it('money.ts still states the rule it enforces', () => {
    const src = read('src/core/money.ts');
    expect(src).toContain('advanceMonths is null');
  });
});
