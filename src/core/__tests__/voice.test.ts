import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The scarcity test.
 *
 * Ghanaian renters deliberately suppress visible enthusiasm, because
 * showing it raises the asking price. Social proof and urgency are not
 * merely tacky here; they are actively hostile, and they would cost the
 * user money.
 *
 * So: no view counts, no save counts, no "popular", no "trending", no
 * countdowns, no "only N left", anywhere a user can see.
 */

const BANNED_ON_USER_SURFACES = [
  'people are viewing',
  'viewing this',
  'views',
  'view count',
  'saved by',
  'popular',
  'trending',
  'hot deal',
  'best deal',
  'great value',
  'bargain',
  "won't last",
  'wont last',
  'hurry',
  'act fast',
  'limited time',
  'only 1 left',
  'only 2 left',
  'selling fast',
  'going fast',
  'countdown',
  'expires in',
  'book now before',
];

/**
 * "Verified" is allowed only where it describes a check we actually
 * performed against the REAC register or a re-fetch of the source. It is
 * never allowed as a badge for something self-attested or paid for.
 */
const VERIFIED_ALLOWED_CONTEXT = [
  'licence',
  'register',
  'reac',
  'last verified',
  'verified 2',
  // The negative promise: "Call a listing verified because someone paid us"
  // is the thing we say we will never do.
  'paid us',
  'never',
];

/**
 * Comments may state the rule; user-facing strings may not break it. A
 * doc comment saying "never a countdown" is the rule being written down,
 * not a countdown.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
      walk(full, out);
    } else if (/\.(tsx?|css)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('no scarcity or social proof on any user surface', () => {
  const files = walk(join(process.cwd(), 'src'));

  for (const phrase of BANNED_ON_USER_SURFACES) {
    it(`never says "${phrase}"`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        // The analytics module names the events it records; recording a
        // count internally is fine, displaying one is not.
        if (file.includes('analytics') || file.includes('eventStore')) continue;
        const src = stripComments(readFileSync(file, 'utf8')).toLowerCase();
        if (src.includes(phrase)) offenders.push(file);
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
  }

  it('copy.ts carries the voice it is supposed to', () => {
    const copy = readFileSync(join(process.cwd(), 'src/core/copy.ts'), 'utf8');
    // Say the number.
    expect(copy).toContain('CASH TO MOVE IN');
    // Admit the gap.
    expect(copy).toContain('Advance not stated');
    expect(copy).toContain('Cannot be calculated');
    // Name the source.
    expect(copy).toContain('Seen on');
    // Never stand between the renter and the landlord.
    expect(copy).toContain('HomeGuy never asks you for payment.');
  });

  it('only uses "verified" about a check we actually did', () => {
    const copy = readFileSync(join(process.cwd(), 'src/core/copy.ts'), 'utf8').toLowerCase();
    const lines = copy.split('\n').filter((l) => l.includes('verified'));
    for (const line of lines) {
      const justified = VERIFIED_ALLOWED_CONTEXT.some((c) => line.includes(c));
      expect(justified, `unjustified "verified": ${line.trim()}`).toBe(true);
    }
  });
});
