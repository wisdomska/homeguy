import { beforeEach, describe, expect, it } from 'vitest';
import { isAllowed, mayFetch, parseRobots, __clearRobotsCache } from '../robots';
import { __resetFetcher, fetchPolitely, looksGated } from '../fetcher';
import {
  normaliseMeter,
  normaliseUnitType,
  normaliseWater,
  parseAdvanceMonths,
  parseCedis,
} from '../normalise';
import { clusterCandidates, scorePair, type Candidate } from '../cluster';
import { canary, recordRun, __clearRuns } from '../health';
import { Queue } from '../queue';
import { eraseSubject } from '../erase';
import { jijiAdapter } from '../adapters/jiji';
import { parseAgentSubmission } from '../adapters/agentForm';
import { ingestPaste } from '../adapters/userPaste';
import { JIJI_FIXTURE, JIJI_NO_ADVANCE_FIXTURE, GATED_FIXTURE } from './fixtures';
import { isDenied } from '../config';

beforeEach(() => {
  __clearRobotsCache();
  __resetFetcher();
  __clearRuns();
});

/* ---- robots.txt ------------------------------------------------------ */

describe('robots.txt is honoured', () => {
  it('parses a wildcard group', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/ok\nCrawl-delay: 5');
    expect(rules.disallow).toEqual(['/private']);
    expect(rules.crawlDelaySeconds).toBe(5);
    expect(isAllowed(rules, '/public')).toBe(true);
    expect(isAllowed(rules, '/private/thing')).toBe(false);
    // A longer Allow wins over a shorter Disallow.
    expect(isAllowed(rules, '/private/ok/thing')).toBe(true);
  });

  it('prefers a group that names HomeGuyBot over the wildcard', () => {
    const rules = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: HomeGuyBot\nDisallow: /admin',
    );
    expect(isAllowed(rules, '/listings/1')).toBe(true);
    expect(isAllowed(rules, '/admin/x')).toBe(false);
  });

  it('refuses to crawl when robots.txt cannot be read', async () => {
    const verdict = await mayFetch('https://example.test/page', async () =>
      new Response('boom', { status: 500 }),
    );
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe('robots_unavailable');
  });

  it('refuses a disallowed path', async () => {
    const verdict = await mayFetch('https://example.test/private/x', async (url) => {
      if (String(url).endsWith('/robots.txt')) {
        return new Response('User-agent: *\nDisallow: /private', { status: 200 });
      }
      return new Response('', { status: 200 });
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe('robots_disallow');
  });
});

/* ---- the denylist ---------------------------------------------------- */

describe('the denylist is a hard stop', () => {
  it('refuses meQasa, whose terms prohibit crawlers', () => {
    expect(isDenied('https://meqasa.com/rent')).toBe(true);
    expect(isDenied('https://www.meqasa.com/rent')).toBe(true);
  });

  it('refuses Ghana Property Centre, which blocks aggregator bots by name', () => {
    expect(isDenied('https://ghanapropertycentre.com/x')).toBe(true);
  });

  it('refuses membership-gated networks', () => {
    expect(isDenied('https://web.facebook.com/groups/1')).toBe(true);
  });

  it('never fetches a denylisted host even if asked directly', async () => {
    const res = await fetchPolitely('https://meqasa.com/rent', {
      fetchImpl: async () => {
        throw new Error('a request was made and should not have been');
      },
    });
    expect(res.ok).toBe(false);
    expect(res.refusedReason).toBe('denylisted');
  });
});

/* ---- the fetcher ----------------------------------------------------- */

describe('the polite fetcher', () => {
  const okRobots = async (url: RequestInfo | URL) => {
    if (String(url).endsWith('/robots.txt')) {
      return new Response('User-agent: *\nAllow: /', { status: 200 });
    }
    return new Response('<html><h1>x</h1></html>', { status: 200 });
  };

  it('identifies itself honestly', async () => {
    let seen = '';
    await fetchPolitely('https://example.test/a', {
      fetchImpl: async (url, init) => {
        if (String(url).endsWith('/robots.txt')) {
          return new Response('User-agent: *\nAllow: /', { status: 200 });
        }
        const headers = new Headers(init?.headers);
        seen = headers.get('User-Agent') ?? '';
        return new Response('<html></html>', { status: 200 });
      },
    });
    expect(seen).toContain('HomeGuyBot/1.0');
    expect(seen).toContain('https://homeguy.vercel.app/bot');
  });

  it('hard stops on 403 and does not retry', async () => {
    let calls = 0;
    const res = await fetchPolitely('https://example.test/a', {
      fetchImpl: async (url) => {
        if (String(url).endsWith('/robots.txt')) {
          return new Response('User-agent: *\nAllow: /', { status: 200 });
        }
        calls += 1;
        return new Response('no', { status: 403 });
      },
    });
    expect(res.hardStopped).toBe(true);
    expect(calls).toBe(1);
  });

  it('refuses a page behind a login or a CAPTCHA rather than parsing it', async () => {
    const res = await fetchPolitely('https://example.test/a', {
      fetchImpl: async (url) => {
        if (String(url).endsWith('/robots.txt')) {
          return new Response('User-agent: *\nAllow: /', { status: 200 });
        }
        return new Response(GATED_FIXTURE, { status: 200 });
      },
    });
    expect(res.ok).toBe(false);
    expect(res.refusedReason).toBe('gated');
  });

  it('detects gates', () => {
    expect(looksGated('<div class="g-recaptcha"></div>')).toBe(true);
    expect(looksGated('<p>Please log in to continue</p>')).toBe(true);
    expect(looksGated('<h1>Chamber and hall</h1>')).toBe(false);
  });

  it('fetches a permitted page', async () => {
    const res = await fetchPolitely('https://example.test/a', { fetchImpl: okRobots });
    expect(res.ok).toBe(true);
  });
});

/* ---- normalisation --------------------------------------------------- */

describe('normalisation maps loose Ghanaian text to enums', () => {
  it('reads the common shorthands', () => {
    expect(normaliseUnitType('Nice chamber n hall s/c at Ahodwo')).toBe(
      'chamber_and_hall_self_contain',
    );
    expect(normaliseUnitType('2 bdrm apartment')).toBe('bedroom_2');
    expect(normaliseUnitType('single room self contain')).toBe('single_room_self_contain');
    expect(normaliseUnitType('chamber and hall')).toBe('chamber_and_hall');
    expect(normaliseUnitType('BQ available')).toBe('boys_quarters');
  });

  it('prefers the longer match, so self-contain is never lost', () => {
    expect(normaliseUnitType('chamber and hall self contain')).toBe(
      'chamber_and_hall_self_contain',
    );
  });

  it('returns null rather than guessing', () => {
    expect(normaliseUnitType('lovely place, come and see')).toBeNull();
    expect(normaliseWater('nice compound')).toBeNull();
    expect(normaliseMeter('nice compound')).toBeNull();
  });

  it('reads water and meter arrangements', () => {
    expect(normaliseWater('pipe borne water available')).toBe('gwcl');
    expect(normaliseWater('mechanised borehole on site')).toBe('borehole');
    expect(normaliseMeter('prepaid meter')).toBe('prepaid');
    expect(normaliseMeter('own meter')).toBe('self');
  });

  it('reads money only when a currency marker is present', () => {
    expect(parseCedis('GHC 1,200 per month')).toBe(120_000);
    expect(parseCedis('GH¢800/mo')).toBe(80_000);
    // A bare number could be anything. It is not a price.
    expect(parseCedis('call 500 now')).toBeNull();
  });

  describe('the advance', () => {
    it('reads a stated term', () => {
      expect(parseAdvanceMonths('12 months advance')).toBe(12);
      expect(parseAdvanceMonths('advance: 6 months')).toBe(6);
      expect(parseAdvanceMonths('one year advance')).toBe(12);
    });

    it('IS NULL when the listing does not say', () => {
      expect(parseAdvanceMonths('Chamber and hall at Ahodwo, GHC 700')).toBeNull();
      expect(parseAdvanceMonths('negotiable')).toBeNull();
      expect(parseAdvanceMonths('advance negotiable')).toBeNull();
      expect(parseAdvanceMonths('')).toBeNull();
    });

    it('never infers a term from the price', () => {
      expect(parseAdvanceMonths('GHC 8,400 to move in')).toBeNull();
    });

    it('rejects an implausible term rather than clamping it', () => {
      expect(parseAdvanceMonths('99 months advance')).toBeNull();
      expect(parseAdvanceMonths('0 months advance')).toBeNull();
    });
  });
});

/* ---- adapters -------------------------------------------------------- */

describe('the Jiji adapter, against a saved snapshot', () => {
  it('parses a complete listing', () => {
    const l = jijiAdapter.parse(JIJI_FIXTURE, 'https://jiji.com.gh/x/1');
    expect(l).not.toBeNull();
    expect(l?.unitType).toBe('chamber_and_hall_self_contain');
    expect(l?.monthlyRent).toBe(70_000);
    expect(l?.advanceMonths).toBe(12);
    expect(l?.water).toBe('gwcl');
  });

  it('leaves the advance null when the page does not state one', () => {
    const l = jijiAdapter.parse(JIJI_NO_ADVANCE_FIXTURE, 'https://jiji.com.gh/x/2');
    expect(l?.advanceMonths).toBeNull();
    expect(l?.monthlyRent).not.toBeNull();
  });

  it('NEVER keeps a phone number from a crawled page', () => {
    const l = jijiAdapter.parse(JIJI_FIXTURE, 'https://jiji.com.gh/x/1');
    expect(l?.agentPhone).toBeNull();
    // The number is on the fixture page, so this is a real refusal.
    expect(JIJI_FIXTURE).toContain('024');
  });

  it('keeps the source link so we can send traffic back', () => {
    const l = jijiAdapter.parse(JIJI_FIXTURE, 'https://jiji.com.gh/x/1');
    expect(l?.sourceUrl).toBe('https://jiji.com.gh/x/1');
    expect(l?.sourceId).toBe('jiji');
  });
});

describe('the agent submission adapter, which may hold contact', () => {
  it('parses a forwarded WhatsApp broadcast', () => {
    const l = parseAgentSubmission({
      text: 'Chamber and hall self contain at Ahodwo. GHC 700 per month, 12 months advance. Commission GHC 420. GWCL water 4 days a week, prepaid meter, gated. Call 0244123456',
      townSlug: 'ahodwo',
      agentName: 'Agent A',
      agentPhone: null,
      photoCount: 3,
      sourceUrl: null,
      submittedAt: new Date(),
    });
    expect(l.unitType).toBe('chamber_and_hall_self_contain');
    expect(l.monthlyRent).toBe(70_000);
    expect(l.advanceMonths).toBe(12);
    expect(l.agentFee).toBe(42_000);
    expect(l.waterDays).toBe(4);
    // Consent given at submission, so this route may hold the number.
    expect(l.agentPhone).toBe('+233 24 412 3456');
  });

  it('leaves the advance null when the agent did not say', () => {
    const l = parseAgentSubmission({
      text: 'Single room at Tamale. GHC 300 per month. Call 0244123456',
      townSlug: 'tamale',
      agentName: null,
      agentPhone: null,
      photoCount: 0,
      sourceUrl: null,
      submittedAt: new Date(),
    });
    expect(l.advanceMonths).toBeNull();
    expect(l.agentFee).toBeNull();
  });
});

describe('the paste route', () => {
  it('parses a forwarded message with no link at all', async () => {
    const out = await ingestPaste(
      'Chamber and hall at Bantama, GHC 650 per month, 12 months advance. Gated compound with polytank.',
      { townSlug: 'bantama' },
    );
    expect(out.status).toBe('parsed');
    if (out.status === 'parsed') {
      expect(out.listing.unitType).toBe('chamber_and_hall');
      expect(out.listing.advanceMonths).toBe(12);
    }
  });

  it('asks for the text when the link needs a login', async () => {
    const out = await ingestPaste('https://web.facebook.com/groups/1/posts/2', {
      townSlug: null,
    });
    expect(out.status).toBe('needs_text');
  });

  it('uses the pasted text when a gated link comes with it', async () => {
    const out = await ingestPaste(
      'https://web.facebook.com/groups/1/posts/2 Chamber and hall self contain, GHC 900 per month, 6 months advance, borehole water',
      { townSlug: 'east-legon' },
    );
    expect(out.status).toBe('parsed');
    if (out.status === 'parsed') expect(out.listing.advanceMonths).toBe(6);
  });
});

/* ---- clustering ------------------------------------------------------ */

describe('clustering', () => {
  const base: Candidate = {
    id: 'a',
    townSlug: 'ahodwo',
    unitType: 'chamber_and_hall_self_contain',
    landmarkId: 'ahodwo-lm-0',
    approxDistanceM: 300,
    attributes: {
      water: 'gwcl',
      waterDays: 4,
      polytank: true,
      meter: null,
      toilet: 'Inside, private',
      bathroom: null,
      kitchen: null,
      gated: true,
    },
    monthlyRent: 70_000,
  };

  it('merges two listings of the same place even when the rent differs wildly', () => {
    const b: Candidate = { ...base, id: 'b', approxDistanceM: 320, monthlyRent: 180_000 };
    const score = scorePair(base, b);
    expect(score.total).toBeGreaterThanOrEqual(0.72);
    expect(clusterCandidates([base, b])).toHaveLength(1);
  });

  it('keeps different landmarks apart', () => {
    const b: Candidate = { ...base, id: 'b', landmarkId: 'ahodwo-lm-3' };
    expect(scorePair(base, b).total).toBeLessThan(0.72);
  });

  it('keeps different towns apart whatever else agrees', () => {
    const b: Candidate = { ...base, id: 'b', townSlug: 'tamale' };
    expect(scorePair(base, b).total).toBe(0);
  });

  it('does not let a null attribute count against a merge', () => {
    // Otherwise nothing in this market would ever cluster.
    const sparse: Candidate = {
      ...base,
      id: 'b',
      attributes: {
        water: null,
        waterDays: null,
        polytank: null,
        meter: null,
        toilet: null,
        bathroom: null,
        kitchen: null,
        gated: null,
      },
    };
    expect(scorePair(base, sparse).total).toBeGreaterThanOrEqual(0.72);
  });

  it('keeps contradicting attributes apart', () => {
    const contradicting: Candidate = {
      ...base,
      id: 'b',
      landmarkId: 'ahodwo-lm-1',
      unitType: 'single_room',
      attributes: { ...base.attributes, water: 'borehole', toilet: 'Shared', gated: null },
    };
    expect(scorePair(base, contradicting).total).toBeLessThan(0.72);
  });

  it('logs every decision with its score', () => {
    const b: Candidate = { ...base, id: 'b' };
    clusterCandidates([base, b]);
    // Reviewed and split by hand at /admin/health.
    expect(scorePair(base, b).reasons.length).toBeGreaterThan(0);
  });
});

/* ---- the queue ------------------------------------------------------- */

describe('the queue isolates failures', () => {
  it('retries, then dead-letters, then isolates the failing source', async () => {
    const q = new Queue();
    let calls = 0;
    q.register('fetch', async () => {
      calls += 1;
      throw new Error('parser broke');
    });
    q.enqueue('fetch', 'jiji', {}, { maxAttempts: 2 });

    const t0 = Date.now();
    await q.drain(t0);
    // Past the exponential backoff the first failure set.
    await q.drain(t0 + 60_000);

    expect(calls).toBe(2);
    expect(q.deadLetters()).toHaveLength(1);
    expect(q.isolatedJobs()).toContain('fetch:jiji');
  });

  it('keeps other sources running when one is isolated', async () => {
    const q = new Queue();
    const done: string[] = [];
    q.register('fetch', async (job) => {
      if (job.sourceId === 'broken') throw new Error('nope');
      done.push(job.sourceId);
    });
    q.enqueue('fetch', 'broken', {}, { maxAttempts: 1 });
    q.enqueue('fetch', 'working', {});
    await q.drain(Date.now());
    expect(done).toEqual(['working']);
  });
});

/* ---- the canary ------------------------------------------------------ */

describe('the canary', () => {
  it('alerts when a source yield halves day over day', () => {
    const now = Date.now();
    recordRun({
      sourceId: 'jiji',
      startedAt: now - 90_000_000,
      finishedAt: now - 90_000_000,
      yield: 100,
      parseFailures: 0,
      robotsBlocked: 0,
      meanAgeAtIndexHours: null,
      ok: true,
      error: null,
    });
    recordRun({
      sourceId: 'jiji',
      startedAt: now - 1000,
      finishedAt: now - 1000,
      yield: 20,
      parseFailures: 0,
      robotsBlocked: 0,
      meanAgeAtIndexHours: null,
      ok: true,
      error: null,
    });
    const alerts = canary(['jiji'], now);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.dropPercent).toBe(80);
  });

  it('stays quiet on a normal day', () => {
    const now = Date.now();
    recordRun({
      sourceId: 'jiji',
      startedAt: now - 90_000_000,
      finishedAt: now - 90_000_000,
      yield: 100,
      parseFailures: 0,
      robotsBlocked: 0,
      meanAgeAtIndexHours: null,
      ok: true,
      error: null,
    });
    recordRun({
      sourceId: 'jiji',
      startedAt: now - 1000,
      finishedAt: now - 1000,
      yield: 92,
      parseFailures: 0,
      robotsBlocked: 0,
      meanAgeAtIndexHours: null,
      ok: true,
      error: null,
    });
    expect(canary(['jiji'], now)).toHaveLength(0);
  });
});

/* ---- erasure --------------------------------------------------------- */

describe('deletion on request', () => {
  it('strips the person and keeps the listing', () => {
    const { listings, affected } = eraseSubject(
      [
        { id: '1', agentName: 'Agent A', agentPhone: '+233 24 000 0002' },
        { id: '2', agentName: 'Agent B', agentPhone: '+233 24 000 0003' },
      ],
      '+233 24 000 0002',
    );
    expect(affected).toBe(1);
    expect(listings[0]?.agentPhone).toBeNull();
    expect(listings[0]?.agentName).toBeNull();
    // The listing itself survives; only the personal data goes.
    expect(listings[0]?.id).toBe('1');
    expect(listings[1]?.agentPhone).not.toBeNull();
  });
});
