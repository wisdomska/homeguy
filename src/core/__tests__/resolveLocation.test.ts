import { describe, expect, it } from 'vitest';
import { resolveLocation } from '../resolveLocation';
import { townClusterCount } from '../repo';

const resolve = (q: string) => resolveLocation(q, townClusterCount);

describe('free-text location search', () => {
  it('matches a town exactly, whatever the casing', () => {
    expect(resolve('Ahodwo').towns).toEqual(['ahodwo']);
    expect(resolve('  ahodwo ').towns).toEqual(['ahodwo']);
    expect(resolve('AHODWO').kind).toBe('exact');
  });

  it('matches a prefix', () => {
    const m = resolve('ahod');
    expect(m.towns).toEqual(['ahodwo']);
    expect(m.kind).toBe('prefix');
  });

  it('forgives a typo', () => {
    expect(resolve('ahodow').towns).toEqual(['ahodwo']);
    expect(resolve('bolgatana').towns).toEqual(['bolgatanga']);
  });

  it('finds a town named inside a phrase', () => {
    expect(resolve('a room in Tamale').towns).toEqual(['tamale']);
  });

  it('expands a region to every town in it', () => {
    const m = resolve('Upper East');
    expect(m.kind).toBe('region');
    expect(m.towns).toContain('bolgatanga');
    expect(m.towns).toContain('navrongo');
    expect(m.towns).toContain('bawku');
  });

  it('expands a city to its areas', () => {
    const m = resolve('kumasi');
    expect(m.towns).toContain('ahodwo');
    expect(m.towns).toContain('bantama');
    expect(m.towns.length).toBeGreaterThan(2);
  });

  it('returns no towns for a place we do not cover, and keeps the query', () => {
    const m = resolve('Dzorwulu');
    expect(m.towns).toEqual([]);
    expect(m.kind).toBe('none');
    // So the zero screen can say "we track nothing in Dzorwulu" rather than
    // pretending the place does not exist.
    expect(m.query).toBe('Dzorwulu');
    expect(m.suggestions.length).toBeGreaterThan(0);
  });

  it('treats an empty query as anywhere in Ghana', () => {
    const m = resolve('   ');
    expect(m.towns).toEqual([]);
    expect(m.label).toBe('Anywhere in Ghana');
  });

  it('prefers the better-covered town when several match', () => {
    const m = resolve('Upper East');
    // Bolgatanga (14) before Navrongo (6) before Bawku (3).
    expect(m.towns[0]).toBe('bolgatanga');
  });

  it('does not throw on junk', () => {
    for (const junk of ['...', '🙂', 'x'.repeat(200), '1234', '<script>']) {
      expect(() => resolve(junk)).not.toThrow();
    }
  });
});
