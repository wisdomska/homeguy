/**
 * `npm run ingest:run` — one ingest pass from the command line, against the
 * database in DATABASE_URL. The same pass /api/cron/ingest runs.
 *
 *   npm run ingest:run              national feed, 5 pages per source
 *   npm run ingest:run -- --pages 2
 */

import { PrismaClient } from '@prisma/client';
import { runAllSources } from './run';

async function main(): Promise<void> {
  if ((process.env.DATABASE_URL ?? '') === '') {
    console.error('DATABASE_URL is not set; there is nothing to write into.');
    process.exit(1);
  }

  const i = process.argv.indexOf('--pages');
  const pages = i >= 0 ? Number(process.argv[i + 1]) : 5;
  const maxPages = Number.isInteger(pages) && pages > 0 ? pages : 5;

  const db = new PrismaClient();
  try {
    const results = await runAllSources(db, { maxPages });
    for (const r of results) {
      console.log(
        `${r.sourceId}: ${r.ok ? 'ok' : `failed (${r.error})`} · ${r.pagesFetched} pages · ` +
          `${r.created} new · ${r.updated} refreshed · refusals: ${r.refusals.join(', ') || 'none'}`,
      );
    }
    if (!results.every((r) => r.ok)) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
