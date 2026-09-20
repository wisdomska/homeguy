# HomeGuy — Design Export Inventory (Phase 0)

No code written. This maps every screen, state, copy string and derived value in the export to the file and line it came from.

**Source folder:** `Desktop/Apps/homeguy-design/` (extracted from `Design pass one_ search and results.zip`)

| Short name used below | File |
|---|---|
| **WEB** | `HomeGuy Web.dc.html` (1,716 lines; markup 33–1039, `<script type="text/x-dc">` 1041–1714) |
| **P1** | `HomeGuy Pass 1 - Search and Results.dc.html` (2,618 lines; a static canvas of 28 mobile frames, 390×844, at `data-screen-label="…"`. Its `x-dc` script, 2609–2616, is a 5-line data-saver stub only) |
| **DOSSIER** | `uploads/HomeGuy-Research-Dossier.pdf` / `dossier.txt` |
| **BRAND** | `uploads/HomeGuy-Brand-Guide.pdf` / `brand.txt` |
| — | `HomeGuy App.dc.html`, `HomeGuy Pass 1 - Spine.dc.html`, `HomeGuy.dc.html` — earlier iterations, reference only |
| — | `support.js` — design runtime, not ported |

**Authority order:** P1 wins on states → WEB wins on route structure, desktop layout and logic → earlier files ignored on conflict → DOSSIER §12 contracts and BRAND §5–§8 outrank both.

---

## 1 · Screen inventory

### 1.1 WEB — routes and markup sections

| # | Section (WEB line) | Target route | Rendered when |
|---|---|---|---|
| 1 | TOP CHROME (35–70) | all | `chromeBar` = `!mob && screen !== 'start'` |
| 1b | Mobile search header (72–…) | `/search` mobile | `chromeMobileHeader` = `mob && screen==='results'` |
| 2 | LANDING (72–142) | `/` | `isHome` |
| 3 | START FLOW (143–237) | `/start` | `isStart` |
| 4 | RESULTS (238–526) | `/search` | `isResults` |
| 5 | DETAIL (527–692) | `/place/[slug]` | `isDetail` |
| 6 | SAVED (693–747) | `/saved` | `isSaved` |
| 7 | DISCARDED (748–777) | `/discarded` | `isDiscarded` |
| 8 | COMPARE (778–824) | `/compare` | `isCompare` |
| 9 | DIGEST (825–859) | `/digest` | `isDigest` |
| 10 | ME (860–951) | `/me` | `isMe` |
| 11 | MOBILE FILTER SHEET (952–1015) | `/search` mobile overlay | `sheetOpen` = `mob && s.sheet` |
| 12 | MOBILE TAB BAR (1016–1038) | all mobile | `tabBar` = `mob && screen ∈ {home,results,saved,discarded,compare,digest,me}` |
| 13 | — (no design source) | `/rent/[region]/[town]` | new, specified in the brief only |

Breakpoints (WEB 1288): `mob < 768`, `tab 768–1023`, `desk ≥ 1024`. Measured from the root element via `ResizeObserver`, not `window.innerWidth` — in the real app this becomes CSS media queries + a container query where the split view needs it.

### 1.2 P1 — the 28 state frames (the states authority)

| Frame (P1 line) | Group | What it adds over WEB |
|---|---|---|
| Shortlist (36) | 7A | ratings, contact-status cycle, per-card note |
| Discarded (138) | 7A | "Why I said no", discard date, "seen again … kept out" |
| Compare (221) | 7A | 4 columns incl. a **Note** row WEB omits |
| Digest (350) | 7A | `TODAY` / `YESTERDAY` groups, "Taken", "Price changed · was …", "See all 14 changes" |
| Trust surface (429) | 7A | **whole screen absent from WEB** — agent licence, response rate, listings live, viewing fee |
| Detail collapsed (519) | 6A | 5 collapsed goal-named sections above the fold |
| Detail expanded (609) | 6A | full row set incl. **Bathroom** row WEB drops |
| Zero by filter (754) | 5A | named blocking filter + "Post what I'm looking for" |
| Zero by coverage (820) | 5A | "Show all 6 anyway" + a **nearby-coverage table** |
| Low results (870) | 5A | **labelled near-miss set** — absent from WEB |
| Offline last search (1023) | 5A | per-card "Offline", "Saved · will sync", "Note saved · will sync", sync-count footer |
| Filter collapsed (1140) | 4A | **five** filter sections, all shut |
| Filter expanded (1199) | 4A | monthly-rent range + ladder-step copy |
| Filter zero results (1292) | 4A | disabled apply, blocking filter named, "Widen to 3km" |
| Results full (1388) | 3A | three freshness bands in one list |
| Results mixed (1530) | 3A | no-advance + no-photo + no-location in one list |
| Results thin coverage (1643) | 3A | "That's all 23 we have here." + "Ask an agent to post here" |
| Results loading (1745) | 3A | Rings skeleton, "Checking 6 sources…" |
| Results offline (1823) | 3A | cached-count banner |
| (chip rail, 1880-ish) | 3A | applied-chip spec incl. the greyscale rationale |
| Step 1 empty (1949) | 2A | keypad, empty consequence line |
| Step 1 part-entered (1996) | 2A | "About 1 in 4 rooms we track in Kumasi — 486 of 1,940." |
| Step 2 lump sum (2043) | 2A | advance lesson |
| Step 3 Greater Accra (2094) | 2A | region drill-down with per-area counts |
| Step 3 Upper East (2142) | 2A | thin-coverage region variant + cross-region suggestion |
| Search entry (2198) | 1A | earlier spine; superseded |
| Results list (2268) | 1A | earlier spine; superseded — but carries `CASH TO MOVE IN` overline and `Tap · 28 KB` |
| Filter sheet (2402) | 1A | earlier; superseded by 4A |
| Cluster detail (2496) | 1A | earlier; superseded by 6A |

Screenshots (`screenshots/`): `web-desktop.png`, `web-results.png`, `web-detail.png`, `01–04-flow.png` — pixel ground truth to diff against.

---

## 2 · State inventory, per screen

**Result card — 8 states** (Phase 8 step 4 asks for all eight on one page):

| State | Source | Trigger |
|---|---|---|
| Full | WEB 1256 `card()`, P1 1388 | all fields present |
| Missing advance | WEB 1268–1269, 1279; P1 1530 | `adv == null` → figure becomes `fmt(rent)`, qualifier `per month · advance not stated`, badge `Advance not stated` |
| Missing photo | WEB 1272–1276; P1 1643 | `photos === 0` → `noPhotoLabel: 'No photo'` |
| Missing landmark | WEB 1264–1265; P1 1530 (`t3`) | `place == null` → `Location not stated · {town}`, ink `dust/500` |
| Clustered | WEB 1277–1278 | `agents.length > 1` → `3 agents · 1,200–1,800` |
| Stale | WEB 1249–1254 `freshBits` | `seen > 30` → ember band |
| Loading | WEB 385–402 skeletons | `s.loading` (900 ms, WEB 1221) |
| Data-saver | WEB 1261 `hasPhoto` | `dataSaver || offline` → text-only |

Two more the card must also survive: **away/near-miss** (`away`, WEB 1262, `awayLabel` `{town} · {dist}km away`) and **over budget** (`over`, WEB 1280, `{Δ} OVER YOUR UPFRONT`).

**`/search` states:** loading · full · mixed · thin coverage (`thin`, WEB 1565: `base.length > 0 && < 6`) · zero-by-filter (`zeroFilter`, 1567) · zero-by-coverage (`zeroCoverage`, 1572) · low-results-with-near-misses (P1 870 only) · offline (WEB `offline`, banner 348–357) · over-budget section (`hasOver`, 1556) · chip rail (mobile, `chipRail` 1591) · map off/on (`mapOn`) · filter panel open (desktop) / sheet open (mobile).

**`/start` states:** step 1 empty · step 1 part-entered · step 2 · step 3 region drill (rich) · step 3 thin-coverage region · mobile keypad vs desktop ladder (`showKeypad` / `wideEntry`, WEB 1497–1498).

**`/saved`:** empty (no saves) · empty-by-tab · populated · 4 tabs (All / Not contacted / Contacted / Viewing booked).
**`/discarded`:** empty · populated.
**`/compare`:** fewer than 2 · 1–4 columns (`slice(0,4)`, WEB 1410).
**`/digest`:** empty (groups filtered out, WEB 1436) · TODAY / THIS WEEK groups.
**`/me`:** no account / account · saver on/off · offline on/off · saved searches empty/list · link empty / typed / added · report unselected / selected / sent.

---

## 3 · Derived values — the spec to port into typed modules

All line refs in WEB.

| Value | Line | Definition | Note for the port |
|---|---|---|---|
| `fmt(n)` | 1217 | `'GH¢' + n.toLocaleString('en-US')` | no space after `GH¢` (BRAND §8) |
| `tcmi(l)` | 1218 | `adv == null ? null : rent * adv` | advance-only subtotal |
| **`tcmiFull(l)`** | **1219** | **`adv == null ? null : rent * adv + comm`** | **the money rule. Integer minor units; no `??`, no `\|\|`, no default** |
| `townCount(n)` | 1226 | count of listings in a town | drives the "thin coverage" pill (`< 5`, line 1331) |
| `inTowns(l, t)` | 1227 | `!t.length \|\| t.includes(l.town) \|\| (l.hub && t.includes(l.hub))` | hub-town fallback is how near-misses enter |
| `pass(l, o)` | 1229–1238 | town → type → advance → freshness, in that order. **`adv == null` is excluded unless `includeNotStated`** | Contract B |
| `matching(o)` | 1239 | `listings.filter(pass)` | used for every live count |
| `base` | 1293 | `matching()` | drives `countLine`, apply-button label, zero logic |
| `affordable` | 1294 | `t == null \|\| !lump \|\| t <= lump` | null-TCMI is **never** filtered out by budget |
| `over` | 1295 | `t != null && lump && t > lump` | rendered below a divider, not hidden |
| `trackedHere` | 1296 | listings in the town set, ignoring filters | **the discriminator between the two zero screens** |
| `blockName/blockCount/blockFix` | 1298–1306 | try dropping each filter; keep the one that yields the most | names the blocking filter |
| `ladderVals()` | 1241 | 2000→5000 by 1000; 5000→10000 by 2500; 10000→20000 by 5000 | P1 1199 states a different ladder (100s to 2000, then 250s, then 500s) — **conflict, see §6** |
| `freshBits(l)` | 1249–1254 | ≤7d palm; ≤30d dust; >30d ember. Label shortens (`2d`/`2w`) when clustered | colour + text, never colour alone |
| `plan(l)` | 1193–1200 | per-unit-type floor-plan glyph ratios | replaces photography when absent |
| `sessionKb` | 1458 | `42 + affordable.length * (dataSaver ? 3 : 18)` | design's own byte estimate |
| `pinList` | 1450 | `affordable.slice(0, 40)` | DOSSIER §11 caps labelled markers at ~50 |
| `digestGroups` | 1428–1436 | `seen ≤ 3` → TODAY; `4–9` → THIS WEEK | P1 350 uses TODAY / YESTERDAY |
| `compareCols` | 1410 | `savedList.slice(0, 4)` | 8 rows in WEB, 9 in P1 (adds Note) |
| `gaps` | 1345–1353 | one entry per null attribute + always Viewing fee + Caution deposit | feeds "What's not stated" |
| `stockApproved` | 1191 | `false` | all photography is off in the export; the plan-glyph + tint path is the real one |

**URL sync** (WEB 1083–1094, read at 1069–1078): `area` (comma list) · `lumpMax` · `type` (slugged, `[^a-z]+ → _`) · `advance` (comma list) · `seen`. Design uses `location.hash`; the app moves these to the query string, server-readable.

---

## 4 · Copy inventory

Verbatim strings, grouped. WEB line unless marked P1.

### Landing (WEB 72–142)
- Overline: `EVERY REGION · EVERY SOURCE · ONE HONEST PRICE`
- H1: `The number that decides the deal, first.`
- Sub: `Listings from portals, classifieds, Facebook groups and agent WhatsApp broadcasts — de-duplicated into one place, with total cash to move in as a field you can actually filter on.`
- Field labels: `WHERE` / `MOST YOU CAN RAISE UPFRONT`; placeholder `Any town in Ghana`; ladder top `No maximum`
- CTA (1466): `Show {n} home(s)` / `Search all {n} rentals`; secondary `Work out my budget first`
- Stats (1461–1464): `{n} tracked` — `Clusters we can show you today, across every region we cover.` · `9 regions` — `Coverage is uneven and we say so — Upper East has 23 rentals, not 2,300.` · `No fees` — `We hold no inventory, take no payment, and never stand between you and a landlord.`
- `BROWSE BY REGION`; chips `{region} · {n}`; town-row pill `thin coverage`

### Start (WEB 143–237, 1478–1506; P1 1949–2188)
- `STEP {n} OF 3`; skip `I'm not sure yet` (steps 1–2) / `Anywhere in Ghana` (step 3)
- Titles: `What can you pay each month?` · `And the lump sum you can raise?` · `Where in Ghana?`
- Consequence, step 1: `Type an amount and we'll tell you what it reaches.` → `Reaches {n} of the {N} rentals we track.` (P1 1996 variant: `About 1 in 4 rooms we track in Kumasi — 486 of 1,940.`)
- Consequence, step 2: `Type what you can actually raise today.` → `Reaches {n} places at this much cash up front.`
- Advance lesson (1494): `Most landlords ask 6–12 months up front. At {GH¢x} a month, 12 months is {GH¢y}. The Rent Act caps a monthly tenancy at one month — almost nobody follows it.`
- Desktop label: `TYPE IT, OR PICK FROM THE LADDER`; placeholder `Town, area or landmark`
- Keypad: `1 2 3 4 5 6 7 8 9 000 0 ⌫`
- CTA: `Next` / `Show {n} home(s)` / `Search anywhere in Ghana`
- P1 2142 thin-region block: `We're tracking 23 rentals across Upper East. Coverage here is still thin — most of what's available is never posted online.` · `Tell me when something new is listed here` · `Also search Upper West · 31 and North East · 19` · `Anything we pull in from another region will say how far away it is.`

### Results (WEB 238–526, 1509–1611)
- `countLine` (1543): `{n} place(s) [within GH¢x] in {townLabel}` · zero-by-filter `Nothing matches all your filters.` · zero-by-coverage `Nothing tracked here yet.`
- Sort: `Newest first`
- Loading (1546): `Checking 6 sources across {townLabel}…`
- Over-budget divider: `{n} place(s) above {GH¢lump}`; card overline `{GH¢Δ} OVER YOUR UPFRONT`
- Thin (1566): `That's all {trackedHere} we track in {townLabel}.` + `Most rentals here never reach a website. We check every source daily and will tell you the day something new appears.` (P1 1643 adds `Ask an agent to post here`)
- Zero-by-filter (1568–1570): `Nothing matches everything you set in {townLabel}.` · `{blockName} is what's blocking it. Dropping it finds {blockCount}.` · CTA `Drop it · {n} homes` · `Change area` · `Clear all filters` (P1 754 adds `Tell us what you're looking for and we'll message you when it appears.` / `Post what I'm looking for`)
- Zero-by-coverage (1573–1574): `We're tracking nothing in {townLabel} right now.` · `This isn't you. Coverage here is still thin — most rentals in this part of the country are never posted anywhere online. We're adding sources.` · `Search a nearby town` (P1 820 adds `Show all 6 anyway` and the nearby-coverage table)
- Alert (1575–1579): `Alert me about {townLabel}` ↔ `Alert set — we'll tell you`
- Offline banner (352–355): `You're offline` / `Showing the homes from your last search. Saving, notes and discards still work and will sync.`
- Map: `Show map` / `Hide map`; `Showing {n} of {N} pins · tiles loaded once, at your request`
- Filter panel: `ADVANCE MONTHS` · `Include advance not stated` · `UNIT TYPE` · `HOW FRESH` (`Last 7 days` / `Last 30 days` / `Any`) · `Clear all` · apply `Show {n} home(s)` · blocked `{blockName} is blocking every result.` · zero-type note (1599): `None of {types} is listed in {townLabel} right now. We'll tell you if that changes.`
- Sheet titles (P1 1140): `What I can pay` · `What kind of place` · `What has to work` · `Where` · `How fresh`
- P1 1140 not-stated explainer: `86 listings in Ahodwo don't state an advance. They're excluded unless you include them under What I can pay.`
- P1 chip-rail spec: `Unselected chips in the sheet carry a dust-500 hairline and no dot. Applied chips carry the 2px clay edge, the filled dot and the ×, so the state survives sunlight and greyscale.`

### Detail (WEB 527–692, 1616–1664; P1 519/609)
- Overline `CASH TO MOVE IN`; figure `{GH¢tcmi}` or `{GH¢rent}`; qualifier `to move in · GH¢x/mo × {n} advance` or `per month · advance not stated`
- Section titles: `What you'd pay` · `Who's listing it` · `What's actually there` · `Getting there` · `What's not stated`
- Pay rows: `Monthly rent` · `Advance` (`{n} months · GH¢x` | `Not stated`) · `Agent fee` · `Viewing fee` · `Caution deposit` · `With the agent fee` | **`Cash to move in` → `Cannot be calculated`**
- Cluster sub: `One agent, one price` | `{n} agents, apart by {GH¢Δ} a month`; warning: `{GH¢Δ} a month between the cheapest and dearest. Ask each what the advance covers — the fee and caution are often folded in.`
- Attribute rows: `Water source` · `Days water flows` · `Polytank` · `Meter` · `Toilet` · `Kitchen` · `Compound` (P1 609 also `Bathroom`)
- Getting there: `Static image · tap for the interactive map · 42 KB` · `Layout from the listing text, not measured` (P1: `Directions as the agent gave them. We haven't walked it.`)
- Gaps: `{n} things nobody has answered` · `Ask the agent about these` · `Opens WhatsApp with the questions already written. You send it, not us.`
- Photo note: `Load {n} photos · {n×26} KB` / `No photo on any of these listings` / `Photos load when you're back on data`
- Footer: `WhatsApp {cheapestAgent}` · `Call` · `HomeGuy never asks you for payment.`

### Saved / Discarded / Compare
- `Saved` · `Compare` · `{n} discarded`; tabs `All · n` / `Not contacted · n` / `Contacted · n` / `Viewing booked · n`; ratings `Good` / `Ok` / `Poor`
- Note placeholder: `Add a note — what you saw, what to ask`
- Empty (1682): `Nothing saved yet. Tap the heart on a place and it waits here — with your notes, offline, for as long as the search takes.` / `Nothing in {tab} yet.`
- Discarded (1685): `{n} places you've said no to. They stay out of your results until you put one back.` / `Nothing discarded yet. Saying no is worth recording — the same place comes back around under another agent.`; note prefix `Why I said no: …`; `Put back`
- Compare (1690–1691): `{n} of 4 places. Notes and ratings come from your shortlist.` / `Save two or more places and they line up here.`; `Share sends a plain image of this table, or a link. No account needed to open it.`; rows `Cash to move in · Monthly · Advance · Type · Water · Meter · Toilet · Rating` (+ `Note` in P1)

### Digest
- `Since you last looked` · `{n} changes in {townLabel} · you were last here 5 days ago`
- Tags: `Taken · from your search` / `Advance not stated` (P1: `Price changed · was GH¢750/mo`, `See all 14 changes`)
- Footer: `We don't send push notifications — they don't arrive on most phones here. Everything new waits for you on this page, and goes out by WhatsApp or email if you've given us a number.`

### Me
- `Account`: `No account — this browser only` / `Everything you save lives in this browser. Add a number and it survives a lost or wiped phone.` · `+233` · placeholder `24 000 0000` · `Save my number` / `Sign out`
- `Data saver`: `On — text-only cards, photos load only when you tap.` / `Off — one 20 KB thumbnail per card.`
- `Offline mode (demo)` — `Saving, notes and discards keep working.`
- `This session: about {n} KB for {m} cards. Budget is 400 KB for a first 20-card page.`
- `Saved searches` · `Alert on · new matches go to your Digest` · `Save this search` / `This search is saved` · `New matches go to your Digest, and by WhatsApp or email if you've given us a number.`
- `Add a listing you found` — `Paste a link from Facebook, Jiji or a WhatsApp broadcast. We'll read it, check whether we already track the place under another agent, and add it to your results.` · placeholder `Paste a link, or the whole message` · `Add it to my search` · `Added. We keep the source link on the card, and we don't contact the agent on your behalf.`
- `What we will never do` — `Ask you for payment. Hold your money. Stand between you and a landlord. Call a listing verified because someone paid us.` · `A photo of a Ghana Card is not proof of identity — anyone can forward one. See it physically, at the property, before money moves.`
- `Report a listing` — reasons: `Asked me to pay before viewing` · `Already taken` · `Price is wrong` · `Place doesn't exist` · `Something else`; `Send report` / `Report sent`; `Reports are read by a person, usually within two days. No listing is removed automatically.` / `Read by a person, usually within two days. We'll tell you what happened to it.`

### Trust surface (P1 429 only — no WEB equivalent)
`About this agent` · `Licence found on the REAC register` · `Checked 14 Sep 2026 · licence 4471. We check the register ourselves; nobody pays for this badge.` · `Replies to 7 of 10 messages` · `Usually within 4 hours` · `Listings live now` · `Viewing fee — Not stated` · `Response figures come from 10 messages sent through HomeGuy. Small sample — read it as a hint, not a guarantee.`

---

## 5 · Seed data (WEB 1095–1189) — port verbatim

**17 listings.** Deliberate edge cases to preserve:

| id | town | hub/dist | why it exists |
|---|---|---|---|
| `a1` | Ahodwo | — | **3 agents disagreeing 700/800/900, one with `adv: null`** |
| `a3` | Ahodwo | — | 2 agents, both stale (`seen: 44`) |
| `a5` | Ahodwo | — | **`adv: null`, `comm: 0`, `photos: 0`, all attributes null** |
| `a7` | Bantama | Ahodwo, 4.2km | near-miss via hub |
| `a8` | Nhyiaeso | Ahodwo, 1.6km | near-miss via hub; `adv: 6` |
| `e1` | East Legon | — | **3 agents 1200/1500/1800, one `adv: null`, one `adv: 6`** |
| `t3` | Tamale | — | **`place: null` — no landmark**, `photos: 0` |
| `b3` | Bolgatanga | — | **`adv: null`**, `photos: 1` |
| `n1` | Navrongo | Bolgatanga, 28km | cross-town near-miss at distance |

Town counts from this seed: Ahodwo 6 · Bantama 1 · Nhyiaeso 1 · East Legon 2 · Tamale 3 · Bolgatanga 3 · Navrongo 1 · **Wa 0** (listed in `towns` at 1180 with no listings — the zero-by-coverage case).

**Towns** (1172–1181) with `sub` strings: `Ahodwo`/`Bantama`/`Nhyiaeso` `Kumasi · area, Ashanti` · `East Legon` `Accra · area, Greater Accra` · `Tamale` `town, Northern` · `Bolgatanga`/`Navrongo` `town, Upper East` · `Wa` `town, Upper West`.

**Region counts** (1183–1187): Greater Accra 4,182 · Ashanti 1,940 · Western 612 · Central 488 · Eastern 402 · Northern 214 · Volta 186 · Upper West 31 · Upper East 23. *Nine regions in the seed; the product covers sixteen — the other seven are real regions with zero coverage, which is itself a displayable state.*

**Unit types** (1189): `Chamber and hall self-contain` · `Chamber and hall` · `Single room self-contain` · `Single room` · `Boys' quarters` · `Hostel bed`. The last two have zero listings everywhere — they drive the disabled-chip and `zeroTypeNote` states. DOSSIER §12 adds `self-contain studio` and `1/2/3/4+ bedroom` to the enum.

---

## 6 · Conflicts found, and how I propose to resolve them

| # | Conflict | Resolution |
|---|---|---|
| C-1 | **Filter model.** WEB has 3 filters (advance, type, fresh). P1 4A has 5 sections (+ monthly-rent range, + "What has to work" attributes, + "Where"/radius). | P1 wins — brief says P1 is the authority on states, and DOSSIER §11 ("anything shown on a card must be filterable") requires the attribute filters. Build 5 sections; WEB's 3 are a subset. |
| C-2 | **Ladder steps.** WEB `ladderVals()` = 1000/2500/5000 steps from 2,000. P1 1199 = "Steps of 100 to 2,000, then 250s, then 500s" for **monthly rent** (a different field). | Not actually a conflict: WEB's ladder is the lump sum, P1's is monthly rent. Implement both. |
| C-3 | **Digest grouping.** WEB `TODAY` / `THIS WEEK`. P1 `TODAY` / `YESTERDAY` + change types (taken, price changed). | P1 wins on states → use TODAY/YESTERDAY/THIS WEEK with real event types, not just `seen` buckets. |
| C-4 | **Low results.** WEB has `thin` (1–5 results) only. P1 870 has a full **labelled near-miss set** with per-card reasons (`GH¢150 over budget`, `12-month advance, you set 6`, `Adenta, not East Legon`). | P1 wins. WEB's `over` section is one case of this; generalise to a reason-labelled near-miss engine. |
| C-5 | **Trust surface.** Whole screen exists in P1, absent from WEB routes. | Add as a section on `/place/[slug]` (WEB's `About this agent, and reporting` link at 629 points at it) plus the trust block in `/me`. |
| C-6 | **Compare rows.** WEB 8 rows, P1 9 (adds `Note`). | P1. |
| C-7 | **Detail attribute rows.** WEB omits `Bathroom`; P1 609 and DOSSIER §12 both have it. | Include `Bathroom` — the schema in the brief has it too. |
| C-8 | **Brand palette.** DOSSIER §13 lists an older orange ramp (`#F97316` etc.). BRAND §6 supersedes with Clay/Dust/Palm/Ember. | BRAND wins; the brief's token list matches BRAND exactly. `#F97316` never appears in the build. |
| C-9 | **`comm: 0`** on `a5`/`b3` (WEB 1121, 1153) means "no fee" but is indistinguishable from "not stated" — and the detail row at 1357 renders `0` as `Not stated`. | In the schema, `agentFee` is `number \| null`; the seed's `0` becomes `null`. Contract B: never infer. |
| C-10 | **Fonts.** Both files load Space Grotesk from Google Fonts (WEB 11–13). | Removed — self-hosted, latin subset, 400/500/700, `font-display: swap`, per the brief. |
| C-11 | **Photography.** `stockApproved = false` (WEB 1191) disables every Unsplash URL; the plan-glyph + gradient tint is what actually renders. | Ship the plan-glyph path as the real no-photo/data-saver treatment. Real thumbnails come from ingestion, ≤20KB WebP @192px. |
| C-12 | **Region coverage.** Seed has 9 regions; product claims 16. Landing stat says `9 regions`. | Seed all 16 with real names; 7 carry zero coverage. The landing stat becomes a real count of regions-with-coverage, still rendered exactly (no rounding). |

---

## 7 · Binding constraints extracted (DOSSIER §10, §12; BRAND §5–§8)

**§10 hard constraints** — C1 meQasa never a source (ToU §2(b) prohibits crawlers) · C2 Act 843, no public-data exemption, enforcement from Jan 2026 → never display crawled agent contact details · C3 only logged-out, accountless access · C4 GPC blocks aggregator bots by name → design for graceful source loss · C5 data costs 3–6× headline, GH¢5–10/GB bundles · C6 4,289 fibre cuts H1 2026 → offline-first, every write survives · C7 push renders for ~10–20% on Transsion devices → digest is the alert channel · C8 WhatsApp proactive is paid templates only · C9 GhanaPostGPS never required, never a map primitive · C10 geocoding informal areas fails (OSM footprint agreement 8–11% in Accra) → pin + neighbourhood + landmark · C11 duplicates are the default state → the searchable object is a cluster · C12 <40MB, ≤90MB RAM, cold start <5s.

**§10 sourcing stages** — 1: manual curation + paste-a-link (weeks 1–12) · 2: WhatsApp-native agent self-listing (months 2–6) · 3: partner feeds (months 4–12), approach meQasa last and only for written permission · 4: narrow, logged-out, robots-respecting crawling only if a gap remains. This maps cleanly onto the brief's Tier 1/2/3.

**§12 contracts** — A: result card must-show / must-never-show (TCMI largest; never view counts, countdowns, scarcity, a computed TCMI without a stated advance, a single price for a disagreeing cluster, crawled phone numbers, or "verified" for anything self-attested) · B: not-stated is first-class, every row renders, never infer/default/estimate · C: the searchable object is a canonical property, every source listing keeps its own price/advance/first-seen/last-verified, divergence surfaced as a caution · D: one thumbnail per card, no tiles until requested, <500KB for a 20-card session, saver toggle visible, save/note/rate/discard succeed in aeroplane mode · E: REAC badge only on a real register check, report control everywhere with a real acknowledged loop, "HomeGuy never asks you for payment", "a photographed ID is not proof".

**BRAND §7 contrast, already computed** — body `dust/900` on paper 18.38:1 · secondary `dust/600` 5.74:1 · link `clay/700` 6.57:1 · **primary button: ink on `clay/500` 5.73:1; white on `clay/500` is 2.80:1 and fails** · accent on dark `clay/400` 7.09:1 · verified `palm/700` on `palm/50` 4.84:1 · stale `ember/700` on `ember/50` 5.65:1 · not-stated `dust/500` 3.81:1 (AA large) · form borders `dust/500` minimum, `dust/200` is decorative only at 1.27:1. Four hard rules: clay ≤400 never small text on light · clay/500 fills carry a clay/700 1px edge · borders `dust/500`+ · colour never alone.

**BRAND §8 type** — Space Grotesk only. Display 56/700/−3.5% · H1 40/700/−3% · H2 28/500/−2% · H3 22/500/−1% · Body L 18/400 · Body 16/400 · Caption 13/500 · Overline 12/700/+10%. Tabular lining numerals on every figure. `GH¢` tight to the figure. Never below 16px for body. Radius: 2mm controls / 3mm cards / 5mm app icon / full for badges. **No shadows anywhere.**

**BRAND §12 voice** — say the number; name the source; admit the gap; never rush anyone. Banned: "great value", "verified listing ✓", "price on request", "12 people are viewing this", "hurry", "best deal".

---

## 8 · What the design does *not* answer (open, and how I intend to proceed)

1. **`/rent/[region]/[town]`** has no design source. I will compose it from landing + results primitives: real counts, an indexable town description, and the same two zero states.
2. **`/admin/health`** has no design source. Plain tables in the same token set, behind auth.
3. **Sixteen regions** — the seed has nine. I will seed all sixteen with the nine real counts and zero for the rest.
4. **`comm: 0` vs null** — resolved as C-9 above; flagging it because it changes a displayed value.
5. **Digest event types** — P1 shows `taken` and `price changed`; neither exists in the WEB data model. The schema needs a listing-event log to produce them honestly.
6. **Agent contact** — the design shows `WhatsApp {agent}` and `Call`. Under C2 + the brief's Tier rules, crawled numbers can never populate these; only Tier 1/2 consented contacts can. Crawled clusters will show the source link-out instead. This is a visible product difference from the mockup and I will implement it that way unless told otherwise.

---

## 9 · Proposed build artefacts from this inventory (Phase 2 onward, not yet built)

- `packages/core/money.ts` — `tcmiFull`, `tcmi`, `fmt`, integer minor units, no defaults in the advance path
- `packages/core/filters.ts` — `pass`, `matching`, `inTowns`, `blockingFilter`, near-miss reasons
- `packages/core/freshness.ts` — `freshBits` bands
- `packages/core/coverage.ts` — `townCount`, thin thresholds (`< 5` pill, `< 6` thin block), `trackedHere`
- `packages/tokens/` — every BRAND value as a CSS custom property; lint rule bans hex literals in components; test bans white-on-clay
- `packages/core/copy.ts` — every string above, one place, typed

---

*Inventory complete. Nothing has been built yet — awaiting go-ahead for Phase 1 (repo, branches, CI, Vercel project `homeguy`, both environments, noindex, placeholder deploy).*
