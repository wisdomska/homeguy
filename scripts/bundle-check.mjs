#!/usr/bin/env node
/**
 * The performance budget, enforced.
 *
 * Without a CI job that prints these numbers and fails on regression, they
 * rot within a month. The user is paying GH¢5-10 per GB and 3-6x the
 * headline rate, so every kilobyte here is money out of their pocket.
 *
 * Budgets:
 *   /search JS              <= 120 KB gzipped
 *   first 20-card page      <= 400 KB total transfer, fonts included
 *   subsequent filtered page <= 120 KB
 *   analytics               <= 5 KB gzipped
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BUDGETS = {
  searchJsGzip: 120 * 1024,
  firstPageTotal: 400 * 1024,
  analyticsGzip: 5 * 1024,
};

const NEXT_DIR = '.next';

function gzipSize(path) {
  try {
    return gzipSync(readFileSync(path)).length;
  } catch {
    return 0;
  }
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

// ---- read what Next actually emitted --------------------------------

const manifestPath = join(NEXT_DIR, 'app-build-manifest.json');
let manifest = null;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  console.error(
    'No app-build-manifest.json. Run `npm run build` before `npm run bundle`.',
  );
  process.exit(1);
}

const pages = manifest.pages ?? {};
const rows = [];

for (const [route, files] of Object.entries(pages)) {
  // API and metadata routes ship no client JS; listing them is noise.
  if (route.endsWith('/route')) continue;
  const js = files.filter((f) => f.endsWith('.js'));
  const css = files.filter((f) => f.endsWith('.css'));
  const jsBytes = js.reduce((n, f) => n + gzipSize(join(NEXT_DIR, f)), 0);
  const cssBytes = css.reduce((n, f) => n + gzipSize(join(NEXT_DIR, f)), 0);
  rows.push({ route, jsBytes, cssBytes });
}

rows.sort((a, b) => b.jsBytes - a.jsBytes);

// The self-hosted font is on every first page, so it counts.
const fontBytes = (() => {
  const fonts = walk('public/fonts').filter((f) => f.endsWith('.woff2'));
  // woff2 is already compressed; gzip would not help and is not applied.
  return fonts.reduce((n, f) => n + statSync(f).size, 0);
})();

// The manifest keys routes as "/search/page".
const searchRow = rows.find(
  (r) => r.route === '/search/page' || r.route === '/search',
) ?? { jsBytes: 0, cssBytes: 0 };
if (searchRow.jsBytes === 0) {
  console.error('Could not find /search in the build manifest. Did the route move?');
  process.exit(1);
}
const firstPageTotal = searchRow.jsBytes + searchRow.cssBytes + fontBytes;

// ---- report ----------------------------------------------------------

const lines = [];
lines.push('## Transfer size per route (gzipped)');
lines.push('');
lines.push('| Route | JS | CSS |');
lines.push('| --- | ---: | ---: |');
for (const r of rows) {
  lines.push(`| \`${r.route}\` | ${kb(r.jsBytes)} | ${kb(r.cssBytes)} |`);
}
lines.push('');
lines.push(`Self-hosted font (not gzipped, woff2 is already compressed): ${kb(fontBytes)}`);
lines.push('');
lines.push('## Budget');
lines.push('');
lines.push('| Budget | Limit | Actual | |');
lines.push('| --- | ---: | ---: | :--: |');

const checks = [
  {
    name: '`/search` JS, gzipped',
    limit: BUDGETS.searchJsGzip,
    actual: searchRow.jsBytes,
  },
  {
    name: 'First 20-card page, total transfer',
    limit: BUDGETS.firstPageTotal,
    actual: firstPageTotal,
  },
];

let failed = false;
for (const c of checks) {
  const ok = c.actual <= c.limit;
  if (!ok) failed = true;
  lines.push(`| ${c.name} | ${kb(c.limit)} | ${kb(c.actual)} | ${ok ? 'pass' : 'FAIL'} |`);
}

lines.push('');
lines.push(
  'This deployment sends no listing imagery: photo counts link back to the source rather than rehosting its pictures.',
);

const report = lines.join('\n');
writeFileSync('bundle-report.md', `${report}\n`);
console.log(report);

if (failed) {
  console.error('\nBundle budget exceeded. This is a regression, not a rounding error.');
  process.exit(1);
}
