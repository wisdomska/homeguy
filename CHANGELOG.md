# Changelog

Generated from conventional commits.

## [0.1.0] — 2026-09-20

### Features

- **core:** total cash to move in, null whenever the advance is null
- **core:** cluster derivation that never collapses disagreeing prices
- **core:** five-section filter model with batch apply
- **core:** the two zero states, distinguished by cause
- **core:** labelled near-misses
- **core:** the 17 authored seed clusters and a deterministic generator, so every rendered count is a count of rows
- **ui:** the result card in ten states, at identical dimensions
- **ui:** landing, start flow, search, detail, saved, discarded, compare, digest, me
- **ui:** indexable `/rent/[region]/[town]` pages
- **ui:** `/cards` — the card in every state on one page
- **ingest:** adapter interface with fixture-based tests
- **ingest:** robots.txt parsing, polite fetcher, per-source kill switch, denylist
- **ingest:** clustering, scored and logged
- **ingest:** verification job and the "Check these now" action
- **ingest:** queue with retries, dead-lettering and per-source isolation
- **ingest:** yield canary alerting on a >50% day-over-day drop
- **ingest:** deletion on request under Act 843 s.33
- **a11y:** WCAG 2.1 AA, axe in CI, full keyboard flow
- **perf:** self-hosted font, zero map tiles until asked, enforced bundle budget
- **ops:** `/admin/health`, the report queue, `/bot`

### Tests that gate the build

- `totalToMoveIn` is null whenever `advanceMonths` is null
- no `??`, no `||` fallback and no inferred advance anywhere in the advance path
- white on clay appears nowhere
- no hex literals in components
- no scarcity or social-proof vocabulary on any user surface
