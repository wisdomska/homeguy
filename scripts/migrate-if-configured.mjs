#!/usr/bin/env node
/**
 * Migrate and seed, but only where there is a database to migrate.
 *
 * Staging deliberately has no DATABASE_URL — the brief says staging must
 * never point at production data, and it has no store of its own yet. The
 * build used to run `prisma migrate deploy` unconditionally, so every
 * staging deploy failed and the last successful build kept serving, which
 * is how a page nobody had deployed for hours stayed live.
 *
 * With no database the app shows no listings and says so. That is the
 * correct behaviour, and it should not fail the build.
 */
import { execSync } from 'node:child_process';

const url = process.env.DATABASE_URL;

if (typeof url !== 'string' || url.length === 0) {
  console.log('No DATABASE_URL. Skipping migrate and seed.');
  console.log('This deployment will serve no listings, and will say so.');
  process.exit(0);
}

for (const cmd of ['prisma migrate deploy', 'prisma db seed']) {
  console.log(`> ${cmd}`);
  execSync(`npx ${cmd}`, { stdio: 'inherit' });
}
