/**
 * Source configuration, including the kill switch.
 *
 * Every source can be turned off here, in code, without a deploy of
 * anything else and without touching the parser. A takedown request is
 * honoured by flipping `enabled` to false and running the purge job; the
 * documented process is in docs/TAKEDOWNS.md and the commitment is 48 hours.
 *
 * Research Dossier §10 constraints that are encoded here rather than
 * written in a README:
 *   C1  meQasa's Terms of Use §2(b) expressly prohibit crawlers. It is not
 *       in this list and must never be added without written permission.
 *   C4  Ghana Property Centre blocks aggregator bots by name. Same.
 *   C3  Only logged-out, accountless access is in scope. No source here
 *       requires or permits an authenticated integration.
 */

export type Tier = 1 | 2 | 3;

export interface SourceConfig {
  id: string;
  name: string;
  tier: Tier;
  kind: 'api' | 'feed' | 'crawl' | 'user_paste' | 'agent_direct';
  /** The kill switch. False means the pipeline skips it entirely. */
  enabled: boolean;
  /** Origin used for robots.txt lookups and host-level politeness. */
  origin: string | null;
  /** Cron expression the scheduler enqueues this source's job on. */
  schedule: string | null;
  /**
   * Whether this source's route permits holding agent contact details.
   * Tier 3 crawling never does - Act 843 has no public-data exemption, and
   * enforcement began January 2026.
   */
  mayStoreContact: boolean;
  /** Why we believe we are allowed to hold this data. Stored per listing. */
  lawfulBasisNote: string;
}

export const SOURCE_CONFIG: SourceConfig[] = [
  // ---- Tier 1: invited and official -----------------------------------
  {
    id: 'agent-form',
    name: 'Agent posted on HomeGuy',
    tier: 1,
    kind: 'agent_direct',
    enabled: true,
    origin: null,
    schedule: null,
    mayStoreContact: true,
    lawfulBasisNote:
      'Posted by the agent through the HomeGuy form. Consent given at submission; deletable on request (Act 843 s.33).',
  },
  {
    id: 'landlord-direct',
    name: 'Landlord submission',
    tier: 1,
    kind: 'agent_direct',
    enabled: true,
    origin: null,
    schedule: null,
    mayStoreContact: true,
    lawfulBasisNote:
      'Submitted by the landlord. Consent given at submission; deletable on request (Act 843 s.33).',
  },
  {
    id: 'partner-feed',
    name: 'Partner feed',
    tier: 1,
    kind: 'feed',
    enabled: false, // No partner has signed yet. Off until one has.
    origin: null,
    schedule: '0 */6 * * *',
    mayStoreContact: true,
    lawfulBasisNote: 'Supplied under a written feed agreement.',
  },

  // ---- Tier 2: user-contributed ---------------------------------------
  {
    id: 'user-paste',
    name: 'Pasted by a HomeGuy user',
    tier: 2,
    kind: 'user_paste',
    enabled: true,
    origin: null,
    schedule: null,
    mayStoreContact: true,
    lawfulBasisNote:
      'Fetched once because a person asked for that specific page. Agent contact retained on the consent path, deletable on request (Act 843 s.33).',
  },

  // ---- Tier 3: permitted crawling -------------------------------------
  {
    id: 'jiji',
    name: 'Jiji',
    tier: 3,
    kind: 'crawl',
    // Off in this deployment. Turning it on is a deliberate act that
    // requires the robots check below to pass on every run.
    enabled: false,
    origin: 'https://jiji.com.gh',
    schedule: '0 2 * * *',
    mayStoreContact: false,
    lawfulBasisNote:
      'Public listing page, crawled with robots.txt permission. No personal data retained; contact is by link-out to the source.',
  },
  {
    id: 'tonaton',
    name: 'Tonaton',
    tier: 3,
    kind: 'crawl',
    enabled: false,
    origin: 'https://tonaton.com',
    schedule: '30 2 * * *',
    mayStoreContact: false,
    lawfulBasisNote:
      'Public listing page, crawled with robots.txt permission. No personal data retained; contact is by link-out to the source.',
  },
];

/**
 * Hosts that must never be fetched, whatever else the config says.
 * A hard stop, not a preference.
 */
export const DENYLIST = [
  'meqasa.com', // Terms of Use §2(b) expressly prohibits crawlers.
  'ghanapropertycentre.com', // Blocks aggregator bots by name.
  'facebook.com', // Membership-gated. The paste route is how this arrives.
  'web.facebook.com',
  'm.facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
];

export const BOT_USER_AGENT = 'HomeGuyBot/1.0 (+https://homeguy.vercel.app/bot)';

/** One request at a time per host, and at least this long between them. */
export const MIN_HOST_INTERVAL_MS = 2000;

export function sourceConfig(id: string): SourceConfig | null {
  return SOURCE_CONFIG.find((s) => s.id === id) ?? null;
}

export function enabledSources(tier?: Tier): SourceConfig[] {
  return SOURCE_CONFIG.filter((s) => s.enabled && (tier === undefined || s.tier === tier));
}

export function isDenied(urlOrHost: string): boolean {
  let host = urlOrHost.toLowerCase();
  try {
    host = new URL(urlOrHost).hostname.toLowerCase();
  } catch {
    // Already a bare host.
  }
  return DENYLIST.some((d) => host === d || host.endsWith(`.${d}`));
}
