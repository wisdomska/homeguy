# HomeGuy

Rental listings from across Ghana — portals, classifieds, Facebook groups and agent WhatsApp broadcasts — de-duplicated into one searchable index, with **total cash to move in** as a first-class, filterable field.

HomeGuy holds no inventory, takes no payment, and is never a counterparty to a tenancy. It is a search and tracking layer. Every listing keeps the name of its source and a link back to the original.

- Production: https://homeguy.vercel.app (`main`)
- Staging: https://staging-homeguy.vercel.app (`staging`) — `noindex`, separate database

---

## The five rules this codebase is built around

**1. Total cash to move in is `null` the moment the advance is `null`.**

```ts
// src/core/money.ts
totalToMoveIn(rent, advanceMonths, agentFee)
// rent x advanceMonths + agentFee, or null if advanceMonths is null
```

There is no default, no fallback and no `??` anywhere in that path. `src/core/__tests__/no-defaults.test.ts` greps the advance-path files and fails the build if it finds one. "Not stated" is a complete answer; a guessed advance term is a lie about the only number that decides the deal.

**2. The searchable object is a cluster, never a listing.**

Duplicates are the default state of this data. Three agents advertising one room at GH¢700, GH¢800 and GH¢900 is one cluster with three members, each keeping its own price, advance, agent, source, first-seen and last-verified date. Nothing collapses a cluster to one price.

**3. Coverage is uneven, and the product says so.**

A search with no results is one of two different screens. "Your filters are too tight" names the blocking filter and offers the fix. "We track nothing here" says *this isn't you* and offers an alert. Conflating them blames the user for our ingestion gap. `zero_results` records which one it was, and that is the most important metric in the app.

**4. Every byte costs the user money.**

Bundles ≤ 5 GB/month cost GH¢5–10 per GB, and the real rate is 3–6× the headline. So: no component library, no icon package, one self-hosted 22 KB font, no map tiles until the user asks, and a CI job that fails on regression.

**5. Never manufacture urgency.**

No view counts, save counts, "popular", "trending" or countdowns on any user surface — internal analytics only. Ghanaian renters deliberately suppress visible enthusiasm, because showing it raises the asking price. `src/core/__tests__/voice.test.ts` greps for the banned vocabulary.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # every variable is documented in place
npm run dev
```

With no `DATABASE_URL` set, the app reads the deterministic development dataset in `src/core/` and says so on the landing page. See **The dataset** below.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run typecheck` | `tsc --noEmit`, strict, `noUncheckedIndexedAccess` on |
| `npm run lint` | ESLint, including the no-hex-literals rule |
| `npm test` | Vitest — 167 unit tests |
| `npm run e2e` | Playwright against a local build |
| `npm run a11y` | The axe + keyboard subset |
| `npm run build && npm run bundle` | Build, then print and enforce the transfer budget |

---

## Layout

```
src/
  core/          the logic the design export specified, typed and tested
    money.ts       THE MONEY RULE. Read this one first.
    derive.ts      cluster-level derived values
    filters.ts     the five filter sections
    coverage.ts    thin thresholds, and the two zero states
    nearmiss.ts    labelled near-misses
    freshness.ts   the three freshness bands
    cardModel.ts   the result card's view model, pure
    copy.ts        every user-facing string, in one place
    seed.ts        the 17 authored clusters. Keep them awkward.
    generate.ts    the rest of the development dataset
    geo.ts         16 regions, their towns, their real counts
    url.ts         the URL is the state
  ingest/        fetch -> parse -> normalise -> cluster -> verify -> index
    config.ts      source tiers, the kill switch, the denylist
    robots.ts      robots.txt, parsed and honoured on every run
    fetcher.ts     the only thing in the repo that touches the network
    normalise.ts   free Ghanaian text -> enums, null when unsure
    cluster.ts     Contract C, scored and logged
    verify.ts      what makes "Seen 2 days ago" honest
    queue.ts       retries, dead-letters, per-source isolation
    health.ts      the canary: alert on a >50% day-over-day yield drop
    adapters/      one per source, behind one interface, fixture-tested
  components/    presentational only; all logic lives in core
  styles/        tokens.css is the single source of colour
  app/           routes
```

### Routes

| Route | Source in the design export |
| --- | --- |
| `/` | `HomeGuy Web.dc.html:72` LANDING |
| `/start` | `:143` START FLOW, and `Pass 1:1949` |
| `/search` | `:238` RESULTS, and `Pass 1:744-1939` for the states |
| `/place/[slug]` | `:527` DETAIL, and `Pass 1:519` |
| `/saved` `/discarded` `/compare` | `:693` `:748` `:778`, and `Pass 1:36-349` |
| `/digest` | `:825`, grouped as `Pass 1:350` |
| `/me` | `:860` |
| `/cards` | new — the card in all its states, on one page |
| `/rent/[region]/[town]` | new — indexable, real counts |
| `/admin/health` | new — behind Basic auth |
| `/bot` | new — what `HomeGuyBot` is and how to stop it |

`docs/DESIGN-INVENTORY.md` maps every screen, state, copy string and derived value back to the file and line it came from.

---

## The dataset

This deployment runs on a **development dataset**, and the landing page says so.

- `src/core/seed.ts` holds **17 hand-authored clusters** ported directly from the design export. Each one exists to break something: three agents who disagree on price, a cluster with no stated advance and no fee, one with no landmark, one with no photo, two stale ones, three reachable only through a hub town.
- `src/core/generate.ts` produces the rest **deterministically**, so that `geo.ts` declaring "Ahodwo holds 214 clusters" and the index actually holding 214 are the same statement. `src/core/__tests__/seed.test.ts` asserts that equivalence for every town.

That is the point: **every count rendered anywhere in the product is a count of rows.** Nothing is rounded, there is no "100+", and there is no "many".

No live source is enabled. The Tier 3 adapters run against saved fixtures in CI and are switched off in `src/ingest/config.ts`.

---

## How listings get in

Users search HomeGuy's own index. Nothing fetches an external site during a search — a live fan-out scraper would take 8–20 seconds per query, get the bot banned within days, make de-duplication impossible and create real legal exposure. Freshness is the pipeline's job.

**Tier 1 — invited and official.** Agent self-serve posting, landlord direct submission, partner feeds. The long-term foundation; the ingestion interface is built first and outreach follows.

**Tier 2 — user-contributed.** The paste-a-link field on `/me`. One page fetched because a person asked for it is a completely different act from crawling a site. It is the highest-signal, lowest-risk channel we have, and it is the route by which membership-gated content legitimately arrives.

**Tier 3 — permitted crawling.** Scheduled, polite, robots-respecting, and off by default. Enforced in code, not in a README:

- `robots.txt` parsed and honoured on every run, cached, re-checked daily. If it cannot be read, we do not crawl.
- `User-Agent: HomeGuyBot/1.0 (+https://homeguy.vercel.app/bot)`, with that page live.
- One request at a time per host, ≥2s apart, exponential backoff on 429/503, **hard stop on 403**.
- A denylist enforced in code: meQasa (ToU §2(b) prohibits crawlers), Ghana Property Centre (blocks aggregator bots by name), and every membership-gated network.
- Nothing behind a login, a paywall or a CAPTCHA is ever fetched, and no challenge is ever solved.
- A per-source kill switch in `src/ingest/config.ts`. Takedown process: `docs/TAKEDOWNS.md`, 48 hours.

### Personal data

Agent names and phone numbers are personal data under Ghana's **Data Protection Act, 2012 (Act 843)**, which has no public-data exemption and whose enforcement began in January 2026.

Each source config carries `mayStoreContact`, and each listing stores its own `lawfulBasisNote`. **Tier 3 is always false** — a number crawled from a public page is not ours to hold, so those clusters link out to the source instead of offering a WhatsApp button. Deletion on request is implemented in `src/ingest/erase.ts` from day one, not retrofitted.

> This is a visible difference from the design export, which shows a contact button on every detail page. It is deliberate. See `docs/DESIGN-INVENTORY.md` §8.

---

## Branches and environments

```
feat/*  fix/*  ──PR──▶  staging  ──PR──▶  main
                        (preview)         (production)
```

- `main` → production, `homeguy.vercel.app`. Protected: PR required, CI green, one approval, no direct pushes.
- `staging` → the integration branch and long-lived test environment. Protected: PR required, CI green.
- Every PR gets its own preview deployment, commented on the PR.
- **Preview and staging are `noindex`** — `X-Robots-Tag` in `next.config.ts` and `middleware.ts`, plus a full `Disallow` in `robots.ts` whenever `VERCEL_ENV !== 'production'`. An indexed staging copy of a listings site splits authority and puts stale prices in front of live ones.
- Three databases: local, staging, production. Staging never points at production data.

Conventional commits; `CHANGELOG.md` is generated from them.

### CI — all five must pass before merge

`typecheck` · `lint` · `unit tests` · `Playwright E2E against the preview deployment` · `axe accessibility` · `bundle size, failing on regression`

---

## Budgets, measured

| Budget | Limit | Actual |
| --- | ---: | ---: |
| `/search` JS, gzipped | 120 KB | **114.8 KB** |
| First 20-card page, total transfer | 400 KB | **142.8 KB** |
| Self-hosted font | — | 21.8 KB |
| Map tile requests before the user asks | 0 | **0** |

100.6 KB of the `/search` figure is the Next.js App Router baseline shared by every route; roughly 14 KB is ours. `npm run bundle` prints this table and exits non-zero on regression.

---

## Accessibility

WCAG 2.1 AA, verified by axe in CI across fifteen routes plus a keyboard run of search → filter → detail → save. Targets ≥44×44 everywhere including desktop. The filter sheet is a native `<dialog>`, so focus is trapped, Escape closes it and focus returns to the trigger. The result count is `aria-live="polite"`. Every status conveyed by colour also carries text. The map states its list-only equivalent on screen.

---

## Licence and posture

HomeGuy sends traffic to sources and never presents their listings as its own. If you run a site we index and would rather send a feed than be crawled — that is our preference too. See `/bot`.
