/**
 * fetch -> parse -> normalise -> landmark-match -> cluster -> verify -> index
 *
 * Wired as queue handlers so each stage retries and dead-letters on its
 * own, and one source's failure never stalls another's.
 */

import { enabledSources, sourceConfig } from '../config';
import { fetchPolitely } from '../fetcher';
import { jijiAdapter } from '../adapters/jiji';
import { clusterCandidates, type Candidate } from '../cluster';
import { recordRun } from '../health';
import { queue, type Job } from '../queue';
import type { Adapter, RawListing } from '../adapters/types';

const ADAPTERS: Record<string, Adapter> = {
  jiji: jijiAdapter,
};

interface DiscoverPayload {
  limit: number;
}
interface FetchPayload {
  url: string;
}

const parsedBuffer = new Map<string, RawListing[]>();

export function registerHandlers(): void {
  queue.register<DiscoverPayload>('discover', async (job) => {
    const adapter = ADAPTERS[job.sourceId];
    const cfg = sourceConfig(job.sourceId);
    if (adapter === undefined || cfg === null || !cfg.enabled) return;

    const urls = await adapter.discover({ limit: job.payload.limit });
    for (const url of urls) queue.enqueue<FetchPayload>('fetch', job.sourceId, { url });
  });

  queue.register<FetchPayload>('fetch', async (job) => {
    const adapter = ADAPTERS[job.sourceId];
    if (adapter === undefined) return;

    const res = await fetchPolitely(job.payload.url);
    if (!res.ok || res.body === null) {
      // A refusal is a normal outcome, not a failure to retry forever.
      if (res.refusedReason !== null) return;
      throw new Error(`fetch failed: ${res.status}`);
    }

    const parsed = adapter.parse(res.body, job.payload.url);
    if (parsed === null) throw new Error(`parse returned nothing for ${job.sourceId}`);

    const buf = parsedBuffer.get(job.sourceId) ?? [];
    buf.push(parsed);
    parsedBuffer.set(job.sourceId, buf);
  });

  queue.register('cluster', async (job: Job) => {
    const buf = parsedBuffer.get(job.sourceId) ?? [];
    if (buf.length === 0) return;
    const candidates: Candidate[] = buf.map((l, i) => ({
      id: `${job.sourceId}-${i}`,
      townSlug: l.townHint ?? 'unknown',
      unitType: l.unitType,
      landmarkId: l.landmarkHint,
      approxDistanceM: l.approxDistanceM,
      attributes: {
        water: l.water,
        waterDays: l.waterDays,
        polytank: l.polytank,
        meter: l.meter,
        toilet: l.toilet,
        bathroom: l.bathroom,
        kitchen: l.kitchen,
        gated: l.gated,
      },
      monthlyRent: l.monthlyRent,
    }));
    clusterCandidates(candidates);
  });
}

/** One full pass for one source, with a health record either way. */
export async function runSource(sourceId: string, limit = 50): Promise<void> {
  const startedAt = Date.now();
  let error: string | null = null;
  parsedBuffer.set(sourceId, []);

  try {
    queue.enqueue<DiscoverPayload>('discover', sourceId, { limit });
    // Drain repeatedly: discover enqueues fetches, fetches feed cluster.
    for (let i = 0; i < 5 && queue.size() > 0; i += 1) await queue.drain();
    queue.enqueue('cluster', sourceId, {});
    await queue.drain();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const parsed = parsedBuffer.get(sourceId) ?? [];
  recordRun({
    sourceId,
    startedAt,
    finishedAt: Date.now(),
    yield: parsed.length,
    parseFailures: queue.deadLetters().filter((d) => d.job.sourceId === sourceId).length,
    robotsBlocked: 0,
    meanAgeAtIndexHours: null,
    ok: error === null,
    error,
  });
}

export async function runAllEnabled(limit = 50): Promise<void> {
  registerHandlers();
  for (const s of enabledSources()) {
    if (s.kind === 'crawl' || s.kind === 'feed') await runSource(s.id, limit);
  }
}
