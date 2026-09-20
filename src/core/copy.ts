/**
 * Every user-facing string, in one place, ported verbatim from the design
 * export. The file/line each block came from is noted above it.
 *
 * Brand Guide §12 voice: say the number, name the source, admit the gap,
 * never rush anyone. src/core/__tests__/voice.test.ts fails the build if a
 * banned scarcity word appears in here.
 */

import type { UnitType, WaterSource, MeterArrangement } from './types';

/* ---- vocabulary ------------------------------------------------------ */

export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  chamber_and_hall_self_contain: 'Chamber and hall self-contain',
  chamber_and_hall: 'Chamber and hall',
  single_room_self_contain: 'Single room self-contain',
  single_room: 'Single room',
  self_contain_studio: 'Self-contain studio',
  boys_quarters: "Boys' quarters",
  hostel_bed: 'Hostel bed',
  bedroom_1: '1 bedroom',
  bedroom_2: '2 bedroom',
  bedroom_3: '3 bedroom',
  bedroom_4_plus: '4+ bedroom',
};

export const WATER_LABEL: Record<WaterSource, string> = {
  gwcl: 'GWCL',
  borehole: 'Borehole',
  tanker: 'Tanker',
};

export const METER_LABEL: Record<MeterArrangement, string> = {
  self: 'Self meter',
  shared: 'Shared',
  prepaid: 'Prepaid',
};

export function unitTypeLabel(t: string): string {
  const label = UNIT_TYPE_LABEL[t as UnitType];
  return label === undefined ? t : label;
}

/* ---- landing - Web.dc.html:72-142, 1459-1470 ------------------------- */

export const LANDING = {
  overline: 'EVERY REGION · EVERY SOURCE · ONE HONEST PRICE',
  h1: 'The number that decides the deal, first.',
  sub: 'Listings from portals, classifieds, Facebook groups and agent WhatsApp broadcasts — de-duplicated into one place, with total cash to move in as a field you can actually filter on.',
  whereLabel: 'WHERE',
  wherePlaceholder: 'Any town in Ghana',
  lumpLabel: 'MOST YOU CAN RAISE UPFRONT',
  noMaximum: 'No maximum',
  budgetFirst: 'Work out my budget first',
  browseByRegion: 'BROWSE BY REGION',
  thinPill: 'thin coverage',
  statTrackedBody: 'Clusters we can show you today, across every region we cover.',
  statRegionsBody: (thinRegion: string, n: number) =>
    `Coverage is uneven and we say so — ${thinRegion} has ${n} rentals, and we show that number rather than rounding it up.`,
  statNoFees: 'No fees',
  statNoFeesBody:
    'We hold no inventory, take no payment, and never stand between you and a landlord.',
  cta: (n: number) => `Show ${n} ${n === 1 ? 'home' : 'homes'}`,
  ctaAll: (n: number) => `Search all ${n.toLocaleString('en-US')} rentals`,
} as const;

/* ---- start flow - Web.dc.html:143-237, 1478-1506; Pass 1:1949-2188 --- */

export const START = {
  step: (n: number) => `STEP ${n} OF 3`,
  skipEarly: "I'm not sure yet",
  skipLast: 'Anywhere in Ghana',
  title1: 'What can you pay each month?',
  title2: 'And the lump sum you can raise?',
  title3: 'Where in Ghana?',
  consequence1Empty: "Type an amount and we'll tell you what it reaches.",
  consequence1: (n: number, total: number) =>
    `Reaches ${n.toLocaleString('en-US')} of the ${total.toLocaleString('en-US')} rentals we track.`,
  consequence2Empty: 'Type what you can actually raise today.',
  consequence2: (n: number) =>
    `Reaches ${n.toLocaleString('en-US')} places at this much cash up front.`,
  advanceLessonBare:
    'Most landlords ask 6–12 months up front. The Rent Act caps a monthly tenancy at one month — almost nobody follows it.',
  advanceLesson: (monthly: string, twelve: string) =>
    `Most landlords ask 6–12 months up front. At ${monthly} a month, 12 months is ${twelve}. The Rent Act caps a monthly tenancy at one month — almost nobody follows it.`,
  ladderLabel: 'TYPE IT, OR PICK FROM THE LADDER',
  townPlaceholder: 'Town, area or landmark',
  next: 'Next',
  ctaAnywhere: 'Search anywhere in Ghana',
  thinRegion: (region: string, n: number) =>
    `We're tracking ${n} rentals across ${region}. Coverage here is still thin — most of what's available is never posted online.`,
  thinRegionAlert: 'Tell me when something new is listed here',
  thinRegionFootnote:
    'Anything we pull in from another region will say how far away it is.',
} as const;

/* ---- results - Web.dc.html:238-526, 1509-1611; Pass 1:744-1130 ------- */

export const RESULTS = {
  sort: 'Newest first',
  loading: (townLabel: string) => `Checking 6 sources across ${townLabel}…`,
  count: (n: number, lump: string | null, townLabel: string) =>
    `${n} ${n === 1 ? 'place' : 'places'}${lump === null ? '' : ` within ${lump}`} in ${townLabel}`,
  countZeroFilters: 'Nothing matches all your filters.',
  countZeroCoverage: 'Nothing tracked here yet.',
  overDivider: (n: number, lump: string) =>
    `${n} ${n === 1 ? 'place above' : 'places above'} ${lump}`,
  overLabel: (delta: string) => `${delta} OVER YOUR UPFRONT`,
  nearMissHeading: 'Nothing else matched. These are close:',

  thinHead: (tracked: number, townLabel: string) =>
    `That's all ${tracked} we track in ${townLabel}.`,
  thinBody:
    'Most rentals here never reach a website. We check every source daily and will tell you the day something new appears.',
  thinAskAgent: 'Ask an agent to post here',

  zeroFilterHead: (townLabel: string) =>
    `Nothing matches everything you set in ${townLabel}.`,
  zeroFilterBody: (blockName: string, n: number) =>
    `${blockName} is what's blocking it. Dropping it finds ${n}.`,
  zeroFilterBodyGeneric: 'Try loosening one filter.',
  zeroFilterFix: (n: number) => `Drop it · ${n} homes`,
  zeroFilterFixGeneric: 'Clear filters',
  changeArea: 'Change area',
  clearAllFilters: 'Clear all filters',
  postWanted: "Tell us what you're looking for and we'll message you when it appears.",
  postWantedCta: "Post what I'm looking for",

  zeroCoverageHead: (townLabel: string) =>
    `We're tracking nothing in ${townLabel} right now.`,
  zeroCoverageBody:
    "This isn't you. Coverage here is still thin — most rentals in this part of the country are never posted anywhere online. We're adding sources.",
  zeroCoverageNearby: 'What we track nearby, honestly:',
  searchNearbyTown: 'Search a nearby town',
  showAllAnyway: (n: number) => `Show all ${n} anyway`,

  alertOff: (townLabel: string) => `Alert me about ${townLabel}`,
  alertOn: "Alert set — we'll tell you",

  offlineHead: "You're offline",
  offlineBody:
    'Showing the homes from your last search. Saving, notes and discards still work and will sync.',
  offlineBadge: 'Offline',
  offlineSaved: 'Saved · will sync',
  offlineNote: 'Note saved · will sync',
  offlinePending: (n: number) =>
    `${n === 1 ? 'One change is' : `${n} changes are`} waiting to sync. Saving, notes and discards all work offline — nothing you write is lost.`,

  showMap: 'Show map',
  hideMap: 'Hide map',
  pinLine: (shown: number, total: number) =>
    `Showing ${shown} of ${total} pins · tiles loaded once, at your request`,
  mapListEquivalent:
    'Every pin on this map is a card in the list above. The list is complete on its own — nothing here is map-only.',

  checkNow: 'Check these now',
  checkNowBusy: 'Checking…',
  checkNowDone: (n: number) => `Re-checked ${n} ${n === 1 ? 'listing' : 'listings'} just now.`,
  checkNowLimited: 'You have re-checked recently. Try again in a minute.',
} as const;

/* ---- filters - Web.dc.html:272-330, 952-1015; Pass 1:1140-1377 ------- */

export const FILTERS = {
  title: 'Filters',
  sectionPay: 'What I can pay',
  sectionKind: 'What kind of place',
  sectionWork: 'What has to work',
  sectionWhere: 'Where',
  sectionFresh: 'How fresh',
  advanceMonths: 'ADVANCE MONTHS',
  monthlyRent: 'Monthly rent',
  lumpSum: 'Lump sum I can raise',
  ladderNote:
    'Steps of 100 to 2,000, then 250s, then 500s. Top of the ladder is No maximum.',
  includeNotStated: 'Include advance not stated',
  notStatedExplainer: (n: number, townLabel: string) =>
    `${n} listings in ${townLabel} don't state an advance. They're excluded unless you include them under What I can pay.`,
  unitType: 'UNIT TYPE',
  howFresh: 'HOW FRESH',
  fresh7: 'Last 7 days',
  fresh30: 'Last 30 days',
  freshAny: 'Any',
  water: 'WATER',
  polytank: 'Polytank on site',
  meter: 'METER',
  privateToilet: 'Toilet inside, private',
  gated: 'Gated compound',
  zeroTypeNote: (types: string, townLabel: string) =>
    `None of ${types} is listed in ${townLabel} right now. We'll tell you if that changes.`,
  clearAll: 'Clear all',
  apply: (n: number) => `Show ${n} ${n === 1 ? 'home' : 'homes'}`,
  blocked: (blockName: string) => `${blockName} is blocking every result.`,
  filterCount: (n: number) => `${n} ${n === 1 ? 'filter' : 'filters'}`,
} as const;

/* ---- detail - Web.dc.html:527-692, 1616-1664; Pass 1:519-743 --------- */

export const DETAIL = {
  back: 'Back to results',
  overline: 'CASH TO MOVE IN',
  qualifier: (rent: string, months: number) => `to move in · ${rent}/mo × ${months} advance`,
  qualifierNoAdvance: 'per month · advance not stated',
  locationNotStated: (town: string) => `Location not stated · ${town}`,

  secPay: "What you'd pay",
  secPaySubNoAdvance: 'Advance not stated — no total',
  secPaySub: (advance: string, fee: string) => `${advance} advance + ${fee} fee`,
  secPaySubNoFee: (advance: string) => `${advance} advance · agent fee not stated`,
  rowMonthlyRent: 'Monthly rent',
  rowAdvance: 'Advance',
  rowAdvanceValue: (months: number, total: string) => `${months} months · ${total}`,
  rowAgentFee: 'Agent fee',
  rowViewingFee: 'Viewing fee',
  rowCaution: 'Caution deposit',
  rowWithFee: 'With the agent fee',
  rowCashToMoveIn: 'Cash to move in',
  cannotBeCalculated: 'Cannot be calculated',

  secWho: "Who's listing it",
  secWhoSubOne: 'One agent, one price',
  secWhoSub: (n: number, spread: string) => `${n} agents, apart by ${spread} a month`,
  spreadWarning: (spread: string) =>
    `${spread} a month between the cheapest and dearest. Ask each what the advance covers — the fee and caution are often folded in.`,
  advanceNotStatedShort: 'Advance not stated',
  advanceMonths: (n: number) => `${n} months advance`,
  perMonth: (rent: string) => `${rent}/mo`,

  secThere: "What's actually there",
  secThereSub: 'Water, meter, toilet, kitchen, compound',
  rowWaterSource: 'Water source',
  rowWaterDays: 'Days water flows',
  waterDaysValue: (n: number) => `${n} days a week`,
  rowPolytank: 'Polytank',
  rowMeter: 'Meter',
  rowToilet: 'Toilet',
  rowBathroom: 'Bathroom',
  rowKitchen: 'Kitchen',
  rowCompound: 'Compound',
  gatedValue: 'Gated',
  yes: 'Yes',

  secGetting: 'Getting there',
  secGettingSub: 'Landmark directions · map on tap',
  mapStatic: 'Static image · tap for the interactive map · 42 KB',
  directionsCaveat: "Directions as the agent gave them. We haven't walked it.",
  planCaveat: 'Layout from the listing text, not measured',

  secGaps: "What's not stated",
  secGapsSub: (n: number) => `${n} things nobody has answered`,
  gapsIntro:
    'Nobody has said anything about these. They are the questions worth asking before you spend money travelling.',
  askAgent: 'Ask the agent about these',
  askAgentFoot: 'Opens WhatsApp with the questions already written. You send it, not us.',

  photosLoad: (n: number, kb: number) => `Load ${n} photos · ${kb} KB`,
  photosNone: 'No photo on any of these listings',
  photosOffline: "Photos load when you're back on data",

  whatsappAgent: (name: string) => `WhatsApp ${name}`,
  call: 'Call',
  contactUnavailable: 'Open the original listing',
  contactUnavailableNote:
    "This place reached us by crawling a public page. Ghana's Data Protection Act, 2012 does not let us hold the agent's number from that route, so we send you to the source instead.",
  neverPayment: 'HomeGuy never asks you for payment.',
  aboutAgentLink: 'About this agent, and reporting',
  reportListing: 'Report this listing',
  seenOn: (sources: string) => `Seen on ${sources}`,
  sourceLink: 'Open the original listing',
} as const;

/* ---- trust surface - Pass 1:429-508 ---------------------------------- */

export const TRUST = {
  heading: 'About this agent',
  licenceFound: 'Licence found on the REAC register',
  licenceUnchecked: 'Licence not checked',
  licenceChecked: (date: string, licence: string) =>
    `Checked ${date} · licence ${licence}. We check the register ourselves; nobody pays for this badge.`,
  replies: (replied: number, sent: number) => `Replies to ${replied} of ${sent} messages`,
  repliesWindow: (window: string) => `Usually within ${window}`,
  listingsLive: 'Listings live now',
  sample:
    'Response figures come from messages sent through HomeGuy. Small sample — read it as a hint, not a guarantee.',
  neverHeading: 'What we will never do',
  never1: 'Ask you for payment. Not for viewings, not for access, not ever.',
  never2: 'Hold your money, or stand between you and a landlord.',
  never3: 'Call a listing verified because someone paid us.',
  ghanaCard:
    'A photo of a Ghana Card is not proof of identity — anyone can forward one. See it physically, at the property, before money moves.',
} as const;

/* ---- saved / discarded / compare - Web.dc.html:693-824, 1676-1691 ---- */

export const SAVED = {
  title: 'Saved',
  compare: 'Compare',
  discardedLink: (n: number) => `${n} discarded`,
  tabs: ['All', 'Not contacted', 'Contacted', 'Viewing booked'] as const,
  ratings: ['Good', 'Ok', 'Poor'] as const,
  notePlaceholder: 'Add a note — what you saw, what to ask',
  emptyAll:
    'Nothing saved yet. Tap the heart on a place and it waits here — with your notes, offline, for as long as the search takes.',
  emptyTab: (tab: string) => `Nothing in ${tab} yet.`,
  discard: 'Discard',
  backToResults: 'Back to results',
} as const;

export const DISCARDED = {
  title: 'Discarded',
  line: (n: number) =>
    `${n} places you've said no to. They stay out of your results until you put one back.`,
  empty:
    'Nothing discarded yet. Saying no is worth recording — the same place comes back around under another agent.',
  notePrefix: 'Why I said no: ',
  notePlaceholder: 'Add why you said no — you will forget',
  putBack: 'Put back',
} as const;

export const COMPARE = {
  title: 'Compare',
  share: 'Share',
  line: (n: number) => `${n} of 4 places. Notes and ratings come from your shortlist.`,
  empty: 'Save two or more places and they line up here.',
  foot: 'Share sends a plain image of this table, or a link. No account needed to open it.',
  place: 'PLACE',
  keys: [
    'Cash to move in',
    'Monthly',
    'Advance',
    'Type',
    'Water',
    'Meter',
    'Toilet',
    'Rating',
    'Note',
  ] as const,
  notRated: 'Not rated',
  noNote: 'No note yet',
} as const;

/* ---- digest - Web.dc.html:825-859, 1673 ------------------------------ */

export const DIGEST = {
  title: 'Since you last looked',
  line: (changes: number, townLabel: string, days: number) =>
    `${changes} changes in ${townLabel} · you were last here ${days} days ago`,
  empty:
    'Nothing has changed in the places you follow since you were last here. We check every source daily.',
  groupToday: 'TODAY',
  groupYesterday: 'YESTERDAY',
  groupThisWeek: 'THIS WEEK',
  tagTaken: 'Taken · from your search',
  tagPriceChanged: (was: string) => `Price changed · was ${was}/mo`,
  tagNoAdvance: 'Advance not stated',
  foot: "We don't send push notifications — they don't arrive on most phones here. Everything new waits for you on this page, and goes out by WhatsApp or email if you've given us a number.",
} as const;

/* ---- me - Web.dc.html:860-951, 1678-1712 ----------------------------- */

export const ME = {
  title: 'Me',
  account: 'Account',
  noAccount: 'No account — this browser only',
  noAccountSub:
    'Everything you save lives in this browser. Add a number and it survives a lost or wiped phone.',
  accountSub: 'Your shortlist and notes sync to this number, and the digest goes there.',
  phonePrefix: '+233',
  phonePlaceholder: '24 000 0000',
  saveNumber: 'Save my number',
  signOut: 'Sign out',

  data: 'Data',
  dataSaver: 'Data saver',
  dataSaverOn: 'On — text-only cards, photos load only when you tap.',
  dataSaverOff: 'Off — one 20 KB thumbnail per card.',
  offlineDemo: 'Offline mode (demo)',
  offlineDemoSub: 'Saving, notes and discards keep working.',
  budget: (kb: number, cards: number) =>
    `This session: about ${kb} KB for ${cards} cards. Budget is 400 KB for a first 20-card page.`,

  savedSearches: 'Saved searches',
  savedSearchSub: 'Alert on · new matches go to your Digest',
  saveSearch: 'Save this search',
  searchSaved: 'This search is saved',
  savedSearchFoot:
    "New matches go to your Digest, and by WhatsApp or email if you've given us a number.",

  addListing: 'Add a listing you found',
  addListingSub:
    "Paste a link from Facebook, Jiji or a WhatsApp broadcast. We'll read it, check whether we already track the place under another agent, and add it to your results.",
  linkPlaceholder: 'Paste a link, or the whole message',
  addLink: 'Add it to my search',
  linkAdded:
    "Added. We keep the source link on the card, and we don't contact the agent on your behalf.",
  linkQueued: (host: string) =>
    `Queued. We'll fetch that one page from ${host}, parse it, and check whether we already track the place.`,
  linkRejectedLogin:
    "That page needs a login, so we can't fetch it. Paste the text of the message instead and we'll read that.",
  linkRejectedInvalid: "That doesn't look like a link or a listing message.",

  neverHeading: 'What we will never do',
  neverBody:
    'Ask you for payment. Hold your money. Stand between you and a landlord. Call a listing verified because someone paid us.',

  report: 'Report a listing',
  reportReasons: [
    'Asked me to pay before viewing',
    'Already taken',
    'Price is wrong',
    "Place doesn't exist",
    'Something else',
  ] as const,
  sendReport: 'Send report',
  reportSent: 'Report sent',
  reportFoot:
    'Reports are read by a person, usually within two days. No listing is removed automatically.',
  reportFootSent:
    "Read by a person, usually within two days. We'll tell you what happened to it.",
} as const;

/* ---- nav - Web.dc.html:1016-1038 ------------------------------------- */

export const NAV = {
  search: 'Search',
  saved: 'Saved',
  savedWithCount: (n: number) => `Saved · ${n}`,
  digest: 'Digest',
  me: 'Me',
  anywhere: 'Anywhere in Ghana',
} as const;

/** Card badges. Web.dc.html:1256-1291 */
export const CARD = {
  clusterLabel: (n: number, low: string, high: string) => `${n} agents · ${low}–${high}`,
  advanceNotStated: 'Advance not stated',
  noPhoto: 'No photo',
  photoCount: (n: number) => `${n} photos`,
  away: (town: string, km: number) => `${town} · ${km}km away`,
  qualifier: (rent: string, months: number) => `to move in · ${rent}/mo × ${months} adv.`,
  qualifierNoAdvance: 'per month · advance not stated',
  locationNotStated: (town: string) => `Location not stated · ${town}`,
  sourceCount: (n: number) => `${n} ${n === 1 ? 'source' : 'sources'}`,
} as const;
