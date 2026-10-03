/**
 * Ingestion health, and the canary.
 *
 * Silent parser rot is the main way aggregators die: a site changes its
 * markup, one adapter starts returning nothing, the index quietly stops
 * growing in that region, and nobody notices for a month because the app
 * still renders fine. The canary exists to make that loud.
 *
 * Alert rule: a source's yield dropping more than 50% day over day.
 *
 * Runs are kept in memory for the current process and, where there is a
 * database, in the IngestRun table. On serverless every request may land on
 * a fresh process, so memory alone meant the canary never had a yesterday to
 * compare against and /admin/health always said no run had happened.
 */

import type { PrismaClient } from '@prisma/client';

export interface RunRecord {
  sourceId: string;
  startedAt: number;
  finishedAt: number;
  /** Listings successfully parsed and indexed. */
  yield: number;
  /** Pages fetched that the parser could not read. */
  parseFailures: number;
  /** URLs skipped because robots.txt said no. */
  robotsBlocked: number;
  /** Mean age in hours of the listings this run indexed. */
  meanAgeAtIndexHours: number | null;
  ok: boolean;
  error: string | null;
}

const runs: RunRecord[] = [];
const MAX_RUNS = 500;

export function recordRun(r: RunRecord): void {
  runs.push(r);
  if (runs.length > MAX_RUNS) runs.splice(0, runs.length - MAX_RUNS);
}

export function runsFor(sourceId: string): RunRecord[] {
  return runs.filter((r) => r.sourceId === sourceId).sort((a, b) => b.finishedAt - a.finishedAt);
}

export function lastSuccessfulRun(sourceId: string): RunRecord | null {
  return runsFor(sourceId).find((r) => r.ok) ?? null;
}

export function allRuns(): RunRecord[] {
  return [...runs].sort((a, b) => b.finishedAt - a.finishedAt);
}

export interface CanaryAlert {
  sourceId: string;
  today: number;
  yesterday: number;
  dropPercent: number;
}

export const YIELD_DROP_ALERT_THRESHOLD = 0.5;

/**
 * Compare the most recent run against the one a day earlier. A drop of more
 * than half is an alert, not a note.
 */
export function canary(sourceIds: string[], now = Date.now()): CanaryAlert[] {
  return canaryFrom(runs, sourceIds, now);
}

/** The same rule over any run history, such as one read from the database. */
export function canaryFrom(
  history: RunRecord[],
  sourceIds: string[],
  now = Date.now(),
): CanaryAlert[] {
  const alerts: CanaryAlert[] = [];
  const DAY = 86_400_000;
  const newestFirst = [...history].sort((a, b) => b.finishedAt - a.finishedAt);

  for (const sourceId of sourceIds) {
    const history = newestFirst.filter((r) => r.sourceId === sourceId && r.ok);
    const today = history.find((r) => now - r.finishedAt < DAY);
    const yesterday = history.find(
      (r) => now - r.finishedAt >= DAY && now - r.finishedAt < 2 * DAY,
    );
    if (today === undefined || yesterday === undefined) continue;
    if (yesterday.yield === 0) continue;

    const drop = (yesterday.yield - today.yield) / yesterday.yield;
    if (drop > YIELD_DROP_ALERT_THRESHOLD) {
      alerts.push({
        sourceId,
        today: today.yield,
        yesterday: yesterday.yield,
        dropPercent: Math.round(drop * 100),
      });
    }
  }

  return alerts;
}

/** Persist one run. Never throws: losing a log row must not fail a pass. */
export async function saveRun(db: PrismaClient, r: RunRecord): Promise<void> {
  try {
    await db.ingestRun.create({
      data: {
        sourceId: r.sourceId,
        startedAt: new Date(r.startedAt),
        finishedAt: new Date(r.finishedAt),
        yield: r.yield,
        parseFailures: r.parseFailures,
        robotsBlocked: r.robotsBlocked,
        meanAgeAtIndexHours: r.meanAgeAtIndexHours,
        ok: r.ok,
        error: r.error,
      },
    });
  } catch {
    // The in-memory record still exists for this process.
  }
}

/** The most recent runs, newest first. */
export async function loadRuns(db: PrismaClient, limit = 200): Promise<RunRecord[]> {
  const rows = await db.ingestRun.findMany({ orderBy: { finishedAt: 'desc' }, take: limit });
  return rows.map((row) => ({
    sourceId: row.sourceId,
    startedAt: row.startedAt.getTime(),
    finishedAt: row.finishedAt.getTime(),
    yield: row.yield,
    parseFailures: row.parseFailures,
    robotsBlocked: row.robotsBlocked,
    meanAgeAtIndexHours: row.meanAgeAtIndexHours,
    ok: row.ok,
    error: row.error,
  }));
}

export function __clearRuns(): void {
  runs.length = 0;
}
