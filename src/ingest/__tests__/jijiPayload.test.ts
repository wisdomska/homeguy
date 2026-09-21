import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findAdverts, fromAdvert, listingUrls, parseIndex } from '../adapters/jijiPayload';

/**
 * Fixture captured from a live jiji.com.gh rentals index, trimmed to two
 * adverts. When Jiji changes its payload shape, exactly one test fails and
 * the failure names the source.
 */
const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'src/ingest/__tests__/fixtures/jiji-index.json'), 'utf8'),
) as { adverts: number[]; payload: unknown[] };

const asHtml = `<html><script id="__NUXT_DATA__">${JSON.stringify(fixture.payload)}</script></html>`;

describe('the Jiji payload adapter, against a captured live page', () => {
  it('finds the adverts', () => {
    expect(findAdverts(fixture.payload).length).toBeGreaterThan(0);
  });

  it('pulls real listing URLs', () => {
    const urls = listingUrls(asHtml);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u).toMatch(/^https:\/\/jiji\.com\.gh\/.+\.html$/);
    }
  });

  it('parses a real listing end to end', () => {
    const rows = parseIndex(asHtml);
    expect(rows.length).toBeGreaterThan(0);
    const first = rows[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    expect(first.rawTitle.length).toBeGreaterThan(5);
    expect(first.sourceId).toBe('jiji');
    expect(first.sourceUrl).toContain('jiji.com.gh');
    // Money in minor units, from the payload's own number.
    expect(first.monthlyRent).not.toBeNull();
    expect(Number.isInteger(first.monthlyRent)).toBe(true);
    // A real photo, referenced not copied.
    expect(first.thumbnailUrl).toMatch(/^https:\/\/pictures-ghana\.jijistatic\.net\//);
    expect(first.townHint).not.toBeNull();
  });

  it('LEAVES THE ADVANCE NULL, because Jiji does not publish one', () => {
    // This is the finding, not a gap in the parser. Jiji carries
    // price_obj.period = "per month" and no term at all, so total cash to
    // move in cannot be computed for this source and is not invented.
    for (const row of parseIndex(asHtml)) {
      expect(row.advanceMonths).toBeNull();
    }
  });

  it('never keeps a name or a number from a crawled page', () => {
    for (const row of parseIndex(asHtml)) {
      expect(row.agentPhone).toBeNull();
      expect(row.agentName).toBeNull();
    }
  });

  it('ignores a price that is not monthly', () => {
    const yearly = fromAdvert({
      url: '/x/y/z.html',
      title: '2bdrm Apartment in Accra for rent',
      price_obj: { value: 24000, period: 'per year' },
    });
    expect(yearly?.monthlyRent).toBeNull();
  });

  it('returns nothing rather than half a listing', () => {
    expect(fromAdvert({ title: 'no url here' })).toBeNull();
    expect(fromAdvert({ url: '/a/b/c.html' })).toBeNull();
  });

  it('survives a payload that is not what we expect', () => {
    expect(parseIndex('<html>no payload</html>')).toEqual([]);
    expect(parseIndex('<script id="__NUXT_DATA__">not json</script>')).toEqual([]);
    expect(listingUrls('')).toEqual([]);
  });
});
