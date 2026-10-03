/**
 * The polite fetcher. Nothing in the pipeline reaches the network except
 * through this function.
 *
 * The rules, enforced here rather than remembered:
 *   - identify honestly as HomeGuyBot/1.0, with /bot live and explaining
 *     how to opt out
 *   - one request at a time per host, at least 2s apart (or the host's own
 *     Crawl-delay, whichever is longer)
 *   - exponential backoff on 429 and 503
 *   - a hard stop on 403, and on a bot challenge whatever its status code
 *     (Cloudflare's "Just a moment..." page, a "Human Verification" wall):
 *     we do not retry past a refusal and we do not try to solve one
 *   - never follow a redirect into a denylisted host
 *   - never fetch anything behind a login, a paywall or a CAPTCHA
 */

import { BOT_USER_AGENT, MIN_HOST_INTERVAL_MS, isDenied } from './config';
import { mayFetch } from './robots';

export interface FetchResult {
  ok: boolean;
  status: number;
  url: string;
  body: string | null;
  /** Set when we refused before making a request. */
  refusedReason: string | null;
  /** True when this host has hard-stopped us and is now blocked for the run. */
  hardStopped: boolean;
}

/** A host that has not answered in this long is not going to. */
const REQUEST_TIMEOUT_MS = 15_000;

const lastRequestAt = new Map<string, number>();
const hostQueues = new Map<string, Promise<unknown>>();
const hardStops = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Serialise all work for one host: one request at a time, never parallel. */
function perHost<T>(host: string, task: () => Promise<T>): Promise<T> {
  const previous = hostQueues.get(host) ?? Promise.resolve();
  const next = previous.then(task, task);
  hostQueues.set(
    host,
    next.catch(() => undefined),
  );
  return next;
}

export async function fetchPolitely(
  url: string,
  options: {
    fetchImpl?: typeof fetch;
    maxRetries?: number;
    /** Only set by the reverification job, which uses conditional GETs. */
    ifModifiedSince?: string | null;
  } = {},
): Promise<FetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? 3;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, status: 0, url, body: null, refusedReason: 'invalid_url', hardStopped: false };
  }

  const host = parsed.hostname.toLowerCase();

  if (hardStops.has(host)) {
    return { ok: false, status: 403, url, body: null, refusedReason: 'hard_stopped', hardStopped: true };
  }

  const verdict = await mayFetch(url, fetchImpl);
  if (!verdict.allowed) {
    return {
      ok: false,
      status: 0,
      url,
      body: null,
      refusedReason: verdict.reason,
      hardStopped: false,
    };
  }

  const interval = Math.max(
    MIN_HOST_INTERVAL_MS,
    verdict.crawlDelaySeconds === null ? 0 : verdict.crawlDelaySeconds * 1000,
  );

  return perHost(host, async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const since = Date.now() - (lastRequestAt.get(host) ?? 0);
      if (since < interval) await sleep(interval - since);
      lastRequestAt.set(host, Date.now());

      const headers: Record<string, string> = {
        'User-Agent': BOT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      };
      if (options.ifModifiedSince != null) {
        headers['If-Modified-Since'] = options.ifModifiedSince;
      }

      let res: Response;
      try {
        res = await fetchImpl(url, {
          headers,
          redirect: 'follow',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        if (attempt === maxRetries) {
          return { ok: false, status: 0, url, body: null, refusedReason: 'network', hardStopped: false };
        }
        await sleep(interval * 2 ** attempt);
        continue;
      }

      // A redirect into a denylisted host is a refusal, not a success.
      if (isDenied(res.url)) {
        return {
          ok: false,
          status: res.status,
          url: res.url,
          body: null,
          refusedReason: 'redirect_to_denylisted',
          hardStopped: false,
        };
      }

      // A bot challenge is the host saying no, whatever status it arrives
      // with: Jiji serves Cloudflare's interstitial as a 403, Tonaton its
      // "Human Verification" page as a 405. Treated exactly like a 403, and
      // stopped for the rest of the run, so a pass over hundreds of URLs on
      // a host that is refusing us costs one request, not hundreds.
      if (!res.ok && (await isChallenge(res))) {
        hardStops.add(host);
        return { ok: false, status: res.status, url, body: null, refusedReason: 'challenged', hardStopped: true };
      }

      // A hard stop. We do not argue with a 403.
      if (res.status === 403) {
        hardStops.add(host);
        return { ok: false, status: 403, url, body: null, refusedReason: 'forbidden', hardStopped: true };
      }

      if (res.status === 429 || res.status === 503) {
        if (attempt === maxRetries) {
          return {
            ok: false,
            status: res.status,
            url,
            body: null,
            refusedReason: 'throttled',
            hardStopped: false,
          };
        }
        const retryAfter = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : interval * 2 ** (attempt + 1);
        await sleep(wait);
        continue;
      }

      if (res.status === 304) {
        return { ok: true, status: 304, url, body: null, refusedReason: null, hardStopped: false };
      }

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          url,
          body: null,
          refusedReason: `http_${res.status}`,
          hardStopped: false,
        };
      }

      const body = await res.text();

      // Anything that turns out to be a login wall or a challenge is
      // dropped rather than parsed. We do not work around either.
      if (looksGated(body)) {
        return {
          ok: false,
          status: res.status,
          url,
          body: null,
          refusedReason: 'gated',
          hardStopped: false,
        };
      }

      return { ok: true, status: res.status, url: res.url, body, refusedReason: null, hardStopped: false };
    }

    return { ok: false, status: 0, url, body: null, refusedReason: 'exhausted', hardStopped: false };
  });
}

const GATE_MARKERS = [
  'captcha',
  'g-recaptcha',
  'cf-challenge',
  'please log in',
  'log in to continue',
  'sign in to continue',
  'create an account to view',
  'subscribe to read',
];

export function looksGated(html: string): boolean {
  const head = html.slice(0, 8000).toLowerCase();
  return GATE_MARKERS.some((m) => head.includes(m));
}

const CHALLENGE_MARKERS = [
  'just a moment...',
  'cf-browser-verification',
  'challenge-platform',
  'human verification',
  'verify you are human',
  'attention required!',
];

/**
 * Whether a refused response is a bot challenge rather than an ordinary
 * error. Reads a clone, so the caller can still use the original.
 */
async function isChallenge(res: Response): Promise<boolean> {
  if (res.headers.get('cf-mitigated') === 'challenge') return true;
  let text: string;
  try {
    text = await res.clone().text();
  } catch {
    return false;
  }
  return looksChallenged(text);
}

export function looksChallenged(html: string): boolean {
  const head = html.slice(0, 8000).toLowerCase();
  return CHALLENGE_MARKERS.some((m) => head.includes(m));
}

export function __resetFetcher(): void {
  lastRequestAt.clear();
  hostQueues.clear();
  hardStops.clear();
}
