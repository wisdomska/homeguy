import { describe, expect, it } from 'vitest';
import { applyEdits } from '../submissions';
import { canaryFrom, type RunRecord } from '../health';
import { parseAgentSubmission } from '../adapters/agentForm';

const NOW = new Date('2026-10-03T12:00:00Z');

function agentPost(text: string) {
  return parseAgentSubmission({
    text,
    townSlug: 'ahodwo',
    agentName: 'Kofi',
    agentPhone: '+233 24 123 4567',
    photoCount: 0,
    sourceUrl: null,
    submittedAt: NOW,
  });
}

describe('a submission on its way into the index', () => {
  it('gets its own identity, so two agent posts never overwrite each other', () => {
    const a = applyEdits(agentPost('Chamber and hall at Ahodwo, GH₵ 800 per month'), noEdits, 'sub1');
    const b = applyEdits(agentPost('Single room at Ahodwo, GH₵ 400 per month'), noEdits, 'sub2');
    expect(a.sourceUrl).toBe('homeguy://submission/sub1');
    expect(b.sourceUrl).not.toBe(a.sourceUrl);
  });

  it('keeps a real source link when there is one', () => {
    const raw = { ...agentPost('Room, GH₵ 500 per month'), sourceUrl: 'https://example.test/a' };
    expect(applyEdits(raw, noEdits, 'sub1').sourceUrl).toBe('https://example.test/a');
  });

  it("takes the reviewer's corrections and leaves the rest alone", () => {
    const raw = agentPost('Nice place, GH₵ 800 per month, 6 months advance');
    const out = applyEdits(raw, { townSlug: 'bantama', monthlyRent: 90_000, unitType: 'bedroom_2' }, 's');
    expect(out.townHint).toBe('bantama');
    expect(out.monthlyRent).toBe(90_000);
    expect(out.unitType).toBe('bedroom_2');
    // The advance is never something a reviewer types in for the agent.
    expect(out.advanceMonths).toBe(raw.advanceMonths);
  });
});

const noEdits = { townSlug: null, monthlyRent: null, unitType: null };

describe('the canary over a stored run history', () => {
  const run = (finishedAt: number, y: number): RunRecord => ({
    sourceId: 'jiji',
    startedAt: finishedAt - 1000,
    finishedAt,
    yield: y,
    parseFailures: 0,
    robotsBlocked: 0,
    meanAgeAtIndexHours: null,
    ok: true,
    error: null,
  });

  it('alerts on a collapse read back from the database, in any order', () => {
    const now = NOW.getTime();
    const history = [run(now - 3_600_000, 10), run(now - 30 * 3_600_000, 100)];
    expect(canaryFrom(history.reverse(), ['jiji'], now)).toEqual([
      { sourceId: 'jiji', today: 10, yesterday: 100, dropPercent: 90 },
    ]);
  });
});

describe('the title key clustering compares', () => {
  it('splits on whitespace, not on the letter s', async () => {
    const { titleKey } = await import('../persist');
    expect(titleKey('2bdrm Apartment in Born To Pray Estate, Ejisu for rent', 'Ejisu')).toEqual([
      '2bdrm',
      'born',
      'pray',
    ]);
    expect(titleKey('Spacious house at Asokwa Melcom', 'Kumasi')).toEqual(['asokwa', 'melcom']);
  });
});
