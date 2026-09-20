/**
 * The job queue.
 *
 * Queue-driven, not cron-driven-and-hope. Vercel Cron enqueues jobs; a
 * worker drains them with retries and a dead-letter queue. Each source is
 * its own job type with its own schedule and its own failure isolation, so
 * one broken parser fails one job type and names itself instead of stalling
 * the pipeline.
 *
 * The in-memory driver here is the interface and the test double. In
 * production the same `Queue` shape sits over a durable backend; nothing
 * that calls it changes.
 */

export type JobType =
  | 'discover'
  | 'fetch'
  | 'parse'
  | 'normalise'
  | 'cluster'
  | 'verify'
  | 'digest'
  | 'canary';

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  sourceId: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
  enqueuedAt: number;
  /** Earliest time this job may run. Used for backoff. */
  runAfter: number;
  lastError: string | null;
}

export interface DeadLetter {
  job: Job;
  failedAt: number;
  error: string;
}

export type Handler<T = unknown> = (job: Job<T>) => Promise<void>;

export class Queue {
  private pending: Job[] = [];
  private dead: DeadLetter[] = [];
  private handlers = new Map<JobType, Handler>();
  private seq = 0;
  /** Job types that have been switched off after repeated failure. */
  private isolated = new Set<string>();

  register<T>(type: JobType, handler: Handler<T>): void {
    this.handlers.set(type, handler as Handler);
  }

  enqueue<T>(
    type: JobType,
    sourceId: string,
    payload: T,
    options: { maxAttempts?: number; delayMs?: number } = {},
  ): Job<T> {
    this.seq += 1;
    const job: Job<T> = {
      id: `${type}:${sourceId}:${this.seq}`,
      type,
      sourceId,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      enqueuedAt: Date.now(),
      runAfter: Date.now() + (options.delayMs ?? 0),
      lastError: null,
    };
    this.pending.push(job as Job);
    return job;
  }

  /**
   * Drain everything runnable. A failing job is retried with exponential
   * backoff and dead-lettered once it is out of attempts. One source's
   * repeated failure isolates that source and leaves every other one
   * running.
   */
  async drain(now = Date.now()): Promise<{ done: number; failed: number; deadLettered: number }> {
    let done = 0;
    let failed = 0;
    let deadLettered = 0;

    const runnable = this.pending.filter(
      (j) => j.runAfter <= now && !this.isolated.has(`${j.type}:${j.sourceId}`),
    );
    this.pending = this.pending.filter((j) => !runnable.includes(j));

    for (const job of runnable) {
      const handler = this.handlers.get(job.type);
      if (handler === undefined) {
        this.dead.push({ job, failedAt: now, error: 'no_handler' });
        deadLettered += 1;
        continue;
      }
      job.attempts += 1;
      try {
        await handler(job);
        done += 1;
      } catch (err) {
        failed += 1;
        job.lastError = err instanceof Error ? err.message : String(err);
        if (job.attempts >= job.maxAttempts) {
          this.dead.push({ job, failedAt: now, error: job.lastError });
          deadLettered += 1;
          // Isolate this source's job type so the rest of the run continues.
          this.isolated.add(`${job.type}:${job.sourceId}`);
        } else {
          job.runAfter = now + 1000 * 2 ** job.attempts;
          this.pending.push(job);
        }
      }
    }

    return { done, failed, deadLettered };
  }

  deadLetters(): DeadLetter[] {
    return [...this.dead];
  }

  isolatedJobs(): string[] {
    return [...this.isolated];
  }

  release(type: JobType, sourceId: string): void {
    this.isolated.delete(`${type}:${sourceId}`);
  }

  size(): number {
    return this.pending.length;
  }
}

export const queue = new Queue();
