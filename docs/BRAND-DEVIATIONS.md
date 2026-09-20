# Where the build departs from the design export, and why

Everything here is a deliberate decision with a reason. Nothing on this list
was a convenience.

The rule from the Brand Guide's own closing page applies: *"if a design
needs a colour, a size or a word that is not in this guide, the answer is
not to invent one quietly. It is to decide it here, write it down, and let
everything downstream inherit it."* This file is that writing-down.

---

## 1. One contrast figure in the Brand Guide is wrong

**Brand Guide §7** states that white on clay/500 is **2.80:1**.

Computed against `#EC6410`, white is **3.28:1**. The 2.80 figure belongs to
the *older* orange in Research Dossier §13 — `#F97316`, which measures
2.74:1 against paper and 2.80:1 against white. It was carried over when the
palette changed to clay.

Every other figure in §7 checks out exactly:

| Pairing | Guide | Computed |
| --- | ---: | ---: |
| ink on clay/500 | 5.73 | **5.73** |
| clay/500 on paper | 3.21 | **3.21** |
| clay/700 on paper | 6.57 | **6.57** |
| ink on paper | 18.38 | **18.38** |
| white on clay/500 | 2.80 | **3.28** |

**It changes nothing that matters.** 3.28 is still below the 4.5 AA floor
for normal text, so white on clay still fails and the ink label is still the
fix. `src/core/__tests__/contrast.test.ts` asserts the real value and the
real rule.

## 2. Crawled listings have no contact button

The design shows `WhatsApp {agent}` and `Call` on every detail page.

Ghana's Data Protection Act, 2012 (Act 843) has no public-data exemption,
and Research Dossier §10 C2 is explicit: *"Never display scraped agent
contact details. Contact is brokered or the user is linked out."*

So contact affordances appear only where the route that brought us the
listing permits holding a number — Tier 1 (the agent posted it) and Tier 2
(a person pasted it, with the consent path). A Tier 3 crawled cluster shows
**Open the original listing** and a plain sentence saying why.

This is the largest visible difference from `screenshots/web-detail.png`.

## 3. No listing imagery is rehosted

The design's own logic disables every stock photo (`stockApproved = false`,
`HomeGuy Web.dc.html:1191`), and the plan-glyph-plus-tint treatment is what
actually renders in the export.

We keep that as the real treatment rather than a placeholder, because
rehosting a portal's photography is a copyright problem that the brief's own
rule — *"we never present their listing as ours"* — already implies. A card
shows the honest photo count and links back to the source for the pictures.

The thumbnail pipeline exists in full: `Cluster.thumbnailUrl` is nullable,
the card renders a lazy 192px WebP with explicit dimensions when one is
present, and data saver suppresses the request entirely. It is simply null
everywhere until image ingestion is switched on, which is why the first-page
transfer figure is 142.8 KB rather than close to the 400 KB budget.

## 4. The filter sheet has five sections, not three

`HomeGuy Web.dc.html` has three filters: advance, unit type, freshness.
`HomeGuy Pass 1 - Search and Results.dc.html:1140` has five, adding a
monthly-rent range, "What has to work" (water, meter, toilet, gate) and
"Where".

The brief makes Pass 1 the authority on states, and Research Dossier §11 is
explicit that anything shown on a card must be filterable — Baymard found
38% of sites fail this, and users rescan the panel convinced it "must be
there", then abandon. Five sections.

## 5. Filters batch-apply, and the count comes from the server

The design recomputes the "Show 24 homes" count in the browser over
seventeen listings. A real index is far too large for that.

Instead the sheet debounces one small request to `/api/count`. Putting an
estimate on that button would put a number on screen that is not real, which
is the one thing this product cannot do. The request is ~180 bytes and the
response is two integers.

## 6. Nine regions became sixteen

The design seeds nine regions with counts. Ghana has sixteen, and the brief
says coverage is deliberately and visibly uneven.

All sixteen are present. Nine carry the design's counts exactly, North East
carries the 19 the start flow quotes (`Pass 1:2142`), and **six carry zero**
— which makes the zero-by-coverage screen reachable from the region browser,
not just from one town.

## 7. The digest models events the dataset cannot yet produce

`Pass 1:350` shows `Taken` and `Price changed · was GH¢750/mo`. Neither is
derivable from the design's data model, which has no event log.

`ListingEvent` in `prisma/schema.prisma` is that log, and the verification
job writes it. With no source enabled there are no such events yet, so the
digest shows what it knows and says so rather than padding itself with "new"
items that are merely old.

## 8. Google Fonts is gone

The export loads Space Grotesk from `fonts.googleapis.com`. That is a
third-party round trip on a connection that cannot spare one, on a device
whose owner is paying 3–6× the headline rate for data.

Self-hosted, latin subset, one variable file covering 400–700,
`font-display: swap`. 21.8 KB, preloaded, `immutable` for a year.

## 9. `comm: 0` became `agentFee: null`

Two clusters in the design seed carry `comm: 0` (`a5`, `b3`). Zero and
"nobody said" are different claims, and the design's own detail row already
renders `0` as "Not stated" (`Web.dc.html:1357`).

In the schema `agentFee` is `number | null` and those become `null`.
Contract B: never infer, and never encode an unknown as a value.

## 10. Filters live in the query string, not the hash

The design syncs to `location.hash`. The app uses the query string so the
server can read it, so the page is renderable without JavaScript, and so a
pasted link reproduces the exact result set — which matters here
specifically because searches get forwarded in WhatsApp groups.

The parameter names are the design's own: `area`, `lumpMax`, `type`,
`advance`, `seen`.
