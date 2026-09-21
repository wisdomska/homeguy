/**
 * One ingest pass.
 *
 * Walks the newest listings on each enabled source, parses them, and writes
 * what it finds. Bounded on purpose: a pass takes pages until it hits the
 * limit or stops finding anything new, then stops. Running hourly, that is
 * enough to stay current without ever asking a source for more than it
 * would serve a person browsing.
 *
 * Every request goes through src/ingest/fetcher.ts, so robots.txt, the one
 * request at a time per host, the 2s interval, the backoff and the 403 hard
 * stop all apply here without this file having to remember them.
 */

import { PrismaClient } from '@prisma/client';
import { enabledSources } from './config';
import { fetchPolitely } from './fetcher';
import { JIJI_API, TONATON_API, listingApiUrl, parseApiPage, type ApiSourceConfig } from './adapters/jijiApi';
import { persistListings, type PersistResult } from './persist';
import { recordRun } from './health';
import type { RawListing } from './adapters/types';

const API_SOURCES: Record<string, ApiSourceConfig> = {
  jiji: JIJI_API,
  tonaton: TONATON_API,
};

export interface SourceRunResult extends PersistResult {
  sourceId: string;
  pagesFetched: number;
  ok: boolean;
  error: string | null;
  refusals: string[];
}

/** Pages per source per pass. 5 x ~20 = about 100 of the newest listings. */
const DEFAULT_MAX_PAGES = 5;

export async function runSourceIngest(
  db: PrismaClient,
  sourceId: string,
  options: { maxPages?: number; fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<SourceRunResult> {
  const startedAt = Date.now();
  const cfg = API_SOURCES[sourceId];
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const now = options.now ?? new Date();

  const empty: PersistResult = {
    seen: 0, created: 0, updated: 0, clustered: 0,
    droppedUnplaceable: 0, droppedNoPrice: 0, withAdvance: 0, withPhoto: 0,
  };

  if (cfg === undefined) {
    return { sourceId, pagesFetched: 0, ok: false, error: 'no_adapter', refusals: [], ...empty };
  }

  const collected: RawListing[] = [];
  const refusals: string[] = [];
  let pagesFetched = 0;
  let error: string | null = null;

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const url = listingApiUrl(cfg, page);
      const res = await fetchPolitely(url, { fetchImpl: options.fetchImpl, maxRetries: 2 });

      if (!res.ok || res.body === null) {
        // A refusal is a normal outcome and is recorded, not retried forever.
        if (res.refusedReason !== null) refusals.push(`${res.refusedReason}@p${page}`);
        else error = `http_${res.status}`;
        break;
      }

      pagesFetched += 1;
      const parsed = parseApiPage(res.body, cfg);
      if (parsed.listings.length === 0) break;
      collected.push(...parsed.listings);
      if (parsed.nextUrl === null) break;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  let persisted = empty;
  if (collected.length > 0) {
    persisted = await persistListings(db, collected, now);
  }

  recordRun({
    sourceId,
    startedAt,
    finishedAt: Date.now(),
    yield: persisted.created + persisted.updated,
    parseFailures: persisted.droppedNoPrice + persisted.droppedUnplaceable,
    robotsBlocked: refusals.filter((r) => r.startsWith('robots')).length,
    meanAgeAtIndexHours: null,
    ok: error === null,
    error,
  });

  return {
    sourceId,
    pagesFetched,
    ok: error === null,
    error,
    refusals,
    ...persisted,
  };
}

export async function runAllSources(
  db: PrismaClient,
  options: { maxPages?: number } = {},
): Promise<SourceRunResult[]> {
  const out: SourceRunResult[] = [];
  // One source at a time. Running them in parallel would multiply the
  // request rate at hosts that happen to share infrastructure, which Jiji
  // and Tonaton do.
  for (const s of enabledSources()) {
    if (API_SOURCES[s.id] === undefined) continue;
    out.push(await runSourceIngest(db, s.id, options));
  }
  return out;
}
