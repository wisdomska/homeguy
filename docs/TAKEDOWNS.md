# Takedowns, opt-outs and erasure

Three different requests, three different answers. Confusing them is how an
aggregator ends up either ignoring a legitimate request or deleting a
listing somebody still needs.

| Request | Who makes it | What we do | Commitment |
| --- | --- | --- | --- |
| **Opt-out** | A site that does not want to be indexed | Switch the source off in `src/ingest/config.ts` and purge its listings | Same day |
| **Takedown** | Anyone, about a specific listing | Review, then remove or annotate the listing — never automatically | 48 hours |
| **Erasure** | A data subject, about their own details | Strip name and number, keep the listing and the source link | 30 days (Act 843 s.33); in practice, 48 hours |

---

## 1. Opt-out — a site does not want to be crawled

**The self-serve route, which needs no email to us at all:**

```
User-agent: HomeGuyBot
Disallow: /
```

`src/ingest/robots.ts` re-checks every host's `robots.txt` at most 24 hours
old, before a single request leaves the process. A `Disallow` is a hard
refusal, not a warning, and a `robots.txt` we cannot read is treated as a
refusal too.

**The by-hand route, same day:**

1. Set `enabled: false` on that source in `src/ingest/config.ts`. The
   pipeline skips it entirely and `reverify()` stops contacting it.
2. For a permanent refusal, add the host to `DENYLIST` in the same file.
   That is enforced in `fetchPolitely()` and `mayFetch()`, so no
   configuration mistake downstream can reach it.
3. Run the purge: `npm run ingest:purge -- --source=<id>`.
4. Reply naming what was removed and when.

Two hosts are permanently on the denylist and must never be removed without
written permission:

- **meQasa** — Terms of Use §2(b) expressly prohibits crawlers.
- **Ghana Property Centre** — blocks aggregator bots by name.

Membership-gated networks (Facebook, Instagram, X) are also denylisted. That
content reaches the index only when a person pastes it themselves, which is
Tier 2 and a different act entirely.

---

## 2. Takedown — a specific listing

Reports arrive from the report control on every listing, from `/me#report`,
and by email. They land in the queue at `/admin/reports`.

**No listing is removed automatically.** That sentence is in the product
copy, which means the queue has to be a queue a person actually opens.

1. Open `/admin/reports`. Oldest first.
2. Read the listing and its source. Check whether the complaint is about the
   listing or about the agent.
3. Decide:
   - **Remove** — set `goneAt` on the listing. Where every listing in a
     cluster is gone, the cluster stops appearing in results but the record
     is kept, so the same place resurfacing under a new agent is still
     recognised as the same place.
   - **Annotate** — where the complaint is real but the listing is not
     fraudulent (a stale price, say), mark it and let verification correct
     it.
   - **Dismiss** — with a note. A dismissed report is still a signal; three
     dismissals about one agent is a pattern.
4. Record the outcome in `outcomeNote`.
5. **Tell the reporter what happened to it.** The copy promises this:
   *"Read by a person, usually within two days. We'll tell you what happened
   to it."*

Reports of the pattern that matters most — *"asked me to pay before
viewing"* — are triaged first. That is the dominant scam mechanic in this
market.

---

## 3. Erasure — a person's own details

Under the **Data Protection Act, 2012 (Act 843)**, a data subject may ask us
to stop holding their personal data. The Act has no public-data exemption,
and enforcement began in January 2026.

An erasure is **not** a takedown. The listing may be perfectly legitimate
and useful; what goes is the person.

```ts
// src/ingest/erase.ts
eraseSubject(listings, '+233 24 000 0002')
// -> agentName and agentPhone set to null; the listing and its source link stay
```

1. Verify the requester controls the number or name. A request by SMS from
   the number itself is sufficient; an email claiming to be about someone
   else's number is not.
2. Run the erasure. Record it in `ErasureRequest` with what was affected.
3. Suppress re-ingestion: add the subject to the suppression list so the
   next pass does not simply write the number back.
4. Confirm in writing.

**Most listings never reach this path, because we never held the data.**
Tier 3 crawling sets `mayStoreContact: false`, so a number on a crawled page
is not extracted at all — `jijiAdapter.parse` sets `agentPhone = null`
unconditionally, and there is a test asserting it against a fixture that
does contain a number. Only Tier 1 and Tier 2, where consent was given at
submission, ever hold contact details.

---

## Contact

Put a real address here before the first Tier 3 source is enabled. A bot
that identifies itself with a URL and no way to reach a person is
identifying itself in name only.

`/bot` is the public-facing version of this document.
