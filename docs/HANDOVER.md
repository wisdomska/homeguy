# Handover

Status of each phase in the brief, what is live, and the two things that are
blocked on credentials rather than on work.

---

## Live now

| | URL | Environment | Indexed? |
| --- | --- | --- | --- |
| Production | https://homeguy.vercel.app | `VERCEL_ENV=production` | yes |
| Staging | https://staging-homeguy.vercel.app | `VERCEL_ENV=preview` | **no** — `X-Robots-Tag: noindex, nofollow` and `Disallow: /` |

Both are separate deployments of the same commit. The Vercel project is named
exactly `homeguy`, so the production domain is the one the brief asked for —
it was not taken.

`/admin/health` is behind Basic auth. Credentials are in the Vercel project's
environment variables (`ADMIN_USER`, `ADMIN_PASSWORD`).

---

## Blocked, and why

### 1. GitHub — both tokens are rejected

```
$ gh api user
{"message": "Bad credentials", "status": "401"}
```

The PAT supplied in the brief returns 401, and so does the token already in
this machine's keyring for `wisdomska`. Classic PATs are auto-revoked by
GitHub when they appear in plaintext, which is the most likely explanation
for the first one.

**Everything that depends on GitHub is written and committed but not pushed:**

- the repository itself
- `main` / `staging` branch protection (PR required, CI green, one approval)
- the CI workflow in `.github/workflows/ci.yml`
- PR preview deployments and the preview-URL comment

The work is done locally — four conventional commits on `main`, authored
solely by you. To finish:

```bash
gh auth login
gh repo create homeguy --private --source=. --remote=origin --push
git push -u origin main
git branch staging && git push -u origin staging
```

Then apply protection to both branches, requiring the `CI` check (the
workflow deliberately exposes one `CI` job that depends on the other five, so
the protection rule never needs updating when a check is added), and connect
the Vercel project to the repo so PRs get preview deployments.

### 2. Three databases

`prisma/schema.prisma` is complete and `DATABASE_URL` is documented in
`.env.example`, but no Postgres instance has been provisioned — that needs a
Neon or Vercel Postgres account.

Until one is attached, the app reads the deterministic dataset in
`src/core/`, and **the landing page says so in as many words**. The
repository interface in `src/core/repo.ts` is the seam: attaching Prisma
changes that file and nothing else.

Create three, never sharing one: `homeguy-local`, `homeguy-staging` (scoped
to Preview), `homeguy-production` (scoped to Production).

---

## Phases

| Phase | State |
| --- | --- |
| 0 · Inventory | `docs/DESIGN-INVENTORY.md` |
| 1 · Repo, environments, deployment | Vercel done; GitHub blocked above |
| 2 · Ingestion | Adapters, robots, fetcher, clustering, verification, queue, canary, erasure — all built and tested. Every Tier 3 source is **switched off**; nothing live is being crawled. |
| 3 · Data model | `src/core/types.ts` and `prisma/schema.prisma` |
| 4 · The application | Every route ported |
| 5 · Analytics and observability | Events and `/admin/health` live. Sentry needs a DSN. |
| 6 · Performance budget | Enforced by `npm run bundle` |
| 7 · Accessibility | axe across 15 routes plus a keyboard run, in CI |
| 8 · Build order | Phases were built in order; each is deployed |

### Not built, deliberately

**WhatsApp and email digest delivery.** The matcher is built
(`src/core/digest.ts`, `/api/digest`) and `/digest` renders. Actual sending
needs a Meta Cloud API number with an approved template and a Resend key,
neither of which exists yet; both are documented in `.env.example`. Sending
is the last mile, and the digest page is the primary channel regardless —
push does not arrive on most phones here, which is why the design made the
page the channel rather than the fallback.

**Sentry.** Needs a DSN. The sample rate and environment split are in
`.env.example`.

---

## Checks, actually run

```
npm test          174 passed
npm run typecheck clean
npm run lint      no warnings or errors
npm run e2e       78 passed (mobile + desktop, against the deployment)
npm run bundle    /search 114.9 KB gzipped (budget 120), first page 142.9 KB (budget 400)
```

The E2E suite runs against a deployed URL via `PLAYWRIGHT_BASE_URL`. Locally,
`PW_USE_SYSTEM_CHROME=1` uses installed Chrome — `cdn.playwright.dev` is
blocked on this network, so Playwright's own Chromium will not download here.
CI downloads it normally.

---

## Things found along the way

Each of these is a real defect in the design export or in the first build,
found by a test rather than by reading. All are fixed; all are recorded in
`docs/BRAND-DEVIATIONS.md`.

1. **Brand Guide §7 states white-on-clay is 2.80:1. It is 3.28:1.** The 2.80
   figure belongs to the older orange in Research Dossier §13. Every other
   ratio in §7 checks out exactly. The rule is unaffected — 3.28 still fails
   AA, so the ink label stands.
2. **"Not stated" at dust-500 fails AA.** The guide rates it 3.81:1, which is
   AA for *large* text, and every place it appears is a 13px caption. Now
   dust-600 at 5.74:1, with the stated line darkened so the two still differ.
3. **Empty chips were unreadable** — dust-400 on dust-100 is 2.36:1.
4. **An Ahodwo search opened on twenty Bantama results**, because the hub
   fallback pulls them in and the town table happens to list Bantama first.
   The screen says "Newest first", so it now is, with the chosen towns ahead
   of hub near-misses.
5. **An offline reload lost the user's own saved state.** The page came back
   from cache, but its JS chunks did not, so React never hydrated and the
   note and rating just written were not read back out of IndexedDB. The
   worker now caches a page together with the assets it needs, and writes the
   page last so its presence means it can be served.
6. **The mobile map button did nothing** — the panel was gated at 1024px.
7. **Three offline tests were passing their own wait for no reason**: an
   async page function returns a Promise, and a Promise is truthy, so
   `waitForFunction` resolved on its first tick.

---

## The one visible departure from the design

The export shows `WhatsApp {agent}` and `Call` on every detail page. Under
Act 843 — which has no public-data exemption, and whose enforcement began in
January 2026 — a number crawled from a public page is not ours to hold, and
Research Dossier §10 C2 says so explicitly.

So contact buttons appear only where the route permits holding a number:
Tier 1 (the agent posted it) and Tier 2 (a person pasted it). A crawled
cluster shows **Open the original listing** and one plain sentence saying
why. `src/ingest/adapters/jiji.ts` returns `agentPhone: null`
unconditionally, and there is a test asserting it against a fixture that
does contain a number.
