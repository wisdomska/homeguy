/**
 * robots.txt, parsed and honoured on every run.
 *
 * This is enforced in code, not documented in a README. `fetchPolitely`
 * cannot be called without a verdict from here, and a disallow is a hard
 * refusal rather than a warning.
 *
 * Cached per host, re-checked daily.
 */

import { BOT_USER_AGENT, isDenied } from './config';

export interface RobotsRules {
  /** Path prefixes disallowed for our agent. */
  disallow: string[];
  /** Path prefixes explicitly allowed, which win over a longer disallow. */
  allow: string[];
  /** Seconds the host asks us to wait between requests, if it says. */
  crawlDelaySeconds: number | null;
  sitemaps: string[];
  fetchedAt: number;
  /** True when the host returned 4xx/5xx for robots.txt itself. */
  unavailable: boolean;
}

const DAY_MS = 86_400_000;
const cache = new Map<string, RobotsRules>();

export function parseRobots(text: string, agent = 'HomeGuyBot'): RobotsRules {
  const lines = text.split(/\r?\n/);
  const groups: Array<{ agents: string[]; allow: string[]; disallow: string[]; delay: number | null }> = [];
  const sitemaps: string[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const raw of lines) {
    const line = raw.split('#')[0]?.trim() ?? '';
    if (line.length === 0) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!lastWasAgent || current === null) {
        current = { agents: [], allow: [], disallow: [], delay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }

    lastWasAgent = false;
    if (current === null) continue;

    if (field === 'disallow') current.disallow.push(value);
    else if (field === 'allow') current.allow.push(value);
    else if (field === 'crawl-delay') {
      const n = Number(value);
      if (Number.isFinite(n)) current.delay = n;
    } else if (field === 'sitemap') sitemaps.push(value);
  }

  const lowerAgent = agent.toLowerCase();
  // A group naming us specifically wins over the wildcard group.
  const specific = groups.find((g) => g.agents.some((a) => lowerAgent.startsWith(a) && a !== '*'));
  const wildcard = groups.find((g) => g.agents.includes('*'));
  const chosen = specific ?? wildcard ?? null;

  return {
    disallow: chosen === null ? [] : chosen.disallow.filter((d) => d.length > 0),
    allow: chosen === null ? [] : chosen.allow.filter((a) => a.length > 0),
    crawlDelaySeconds: chosen === null ? null : chosen.delay,
    sitemaps,
    fetchedAt: Date.now(),
    unavailable: false,
  };
}

/**
 * Longest-match wins, and an equal-length Allow beats a Disallow, which is
 * what every major crawler does and what hosts expect.
 */
export function isAllowed(rules: RobotsRules, pathname: string): boolean {
  if (rules.unavailable) {
    // We could not read the file. The safe reading is: do not crawl.
    return false;
  }
  let bestDisallow = -1;
  for (const d of rules.disallow) {
    if (matches(d, pathname) && d.length > bestDisallow) bestDisallow = d.length;
  }
  if (bestDisallow < 0) return true;
  let bestAllow = -1;
  for (const a of rules.allow) {
    if (matches(a, pathname) && a.length > bestAllow) bestAllow = a.length;
  }
  return bestAllow >= bestDisallow;
}

function matches(rule: string, pathname: string): boolean {
  if (rule === '/') return true;
  // Support the * and $ extensions the big crawlers honour.
  if (rule.includes('*') || rule.endsWith('$')) {
    const escaped = rule
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\\\$$/, '$');
    return new RegExp(`^${escaped}`).test(pathname);
  }
  return pathname.startsWith(rule);
}

export async function robotsFor(
  origin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RobotsRules> {
  const cached = cache.get(origin);
  if (cached !== undefined && Date.now() - cached.fetchedAt < DAY_MS) return cached;

  let rules: RobotsRules;
  try {
    const res = await fetchImpl(`${origin}/robots.txt`, {
      headers: { 'User-Agent': BOT_USER_AGENT },
    });
    if (res.status === 200) {
      rules = parseRobots(await res.text());
    } else if (res.status === 404) {
      // No robots.txt means no restrictions expressed.
      rules = {
        disallow: [],
        allow: [],
        crawlDelaySeconds: null,
        sitemaps: [],
        fetchedAt: Date.now(),
        unavailable: false,
      };
    } else {
      rules = {
        disallow: [],
        allow: [],
        crawlDelaySeconds: null,
        sitemaps: [],
        fetchedAt: Date.now(),
        unavailable: true,
      };
    }
  } catch {
    rules = {
      disallow: [],
      allow: [],
      crawlDelaySeconds: null,
      sitemaps: [],
      fetchedAt: Date.now(),
      unavailable: true,
    };
  }

  cache.set(origin, rules);
  return rules;
}

/** The single gate every outbound fetch passes through. */
export async function mayFetch(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ allowed: boolean; reason: string; crawlDelaySeconds: number | null }> {
  if (isDenied(url)) {
    return { allowed: false, reason: 'denylisted', crawlDelaySeconds: null };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'invalid_url', crawlDelaySeconds: null };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { allowed: false, reason: 'unsupported_scheme', crawlDelaySeconds: null };
  }
  const rules = await robotsFor(parsed.origin, fetchImpl);
  if (rules.unavailable) {
    return { allowed: false, reason: 'robots_unavailable', crawlDelaySeconds: null };
  }
  if (!isAllowed(rules, parsed.pathname)) {
    return { allowed: false, reason: 'robots_disallow', crawlDelaySeconds: null };
  }
  return { allowed: true, reason: 'ok', crawlDelaySeconds: rules.crawlDelaySeconds };
}

export function __clearRobotsCache(): void {
  cache.clear();
}
