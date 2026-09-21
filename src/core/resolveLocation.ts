/**
 * Free-text location search.
 *
 * A dropdown can only offer what we already cover, which quietly tells the
 * user that anywhere missing from it does not exist. People type "Ahodwo",
 * "kumasi", "East Legon Accra", "Dzorwulu" — and the honest answer to the
 * last one is "we track nothing there yet", not "that place is not real".
 *
 * So the field takes anything, and an unmatched query lands on the
 * zero-by-coverage screen with the query preserved, which is the screen
 * that already says the gap is ours.
 */

import { REGIONS, TOWNS } from './geo';
import type { Region, Town } from './types';

export interface LocationMatch {
  /** Town slugs to search. Empty when nothing matched. */
  towns: string[];
  /** What to show the user we understood them to mean. */
  label: string;
  /** The raw query, kept so the zero screen can repeat it back. */
  query: string;
  /** How we got there, so the UI can say the right thing. */
  kind: 'exact' | 'prefix' | 'fuzzy' | 'region' | 'none';
  /** Near alternatives when nothing matched, or when the match was loose. */
  suggestions: Array<{ slug: string; name: string; sub: string }>;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Levenshtein, capped — we only care about "close enough to be a typo". */
function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(
        (prev[j] ?? 0) + 1,
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length] ?? cap + 1;
}

function suggestionsFor(towns: Town[]): LocationMatch['suggestions'] {
  return towns.map((t) => ({ slug: t.slug, name: t.name, sub: t.sub }));
}

/**
 * Resolve whatever the person typed.
 *
 * Order: an exact town or region name, then a prefix, then a typo, then
 * the city or region named inside a longer phrase ("east legon accra").
 */
export function resolveLocation(
  raw: string,
  countFor: (townSlug: string) => number,
): LocationMatch {
  const query = raw.trim();
  const q = norm(query);

  if (q.length === 0) {
    return { towns: [], label: 'Anywhere in Ghana', query, kind: 'none', suggestions: [] };
  }

  const byCount = (a: Town, b: Town) => countFor(b.slug) - countFor(a.slug);

  // --- a region, which means every town in it ---
  const region: Region | undefined = REGIONS.find(
    (r) => norm(r.name) === q || norm(r.slug) === q,
  );
  if (region !== undefined) {
    const inRegion = TOWNS.filter((t) => t.regionId === region.id).sort(byCount);
    return {
      towns: inRegion.map((t) => t.slug),
      label: region.name,
      query,
      kind: 'region',
      suggestions: suggestionsFor(inRegion.slice(0, 6)),
    };
  }

  // --- an exact town ---
  const exact = TOWNS.filter((t) => norm(t.name) === q || t.slug === q);
  if (exact.length > 0) {
    const best = [...exact].sort(byCount);
    return {
      towns: best.map((t) => t.slug),
      label: best.map((t) => t.name).join(' + '),
      query,
      kind: 'exact',
      suggestions: [],
    };
  }

  // --- a prefix: "ahod" -> Ahodwo ---
  const prefix = TOWNS.filter((t) => norm(t.name).startsWith(q)).sort(byCount);
  if (prefix.length > 0) {
    const top = prefix[0];
    if (top !== undefined) {
      return {
        towns: [top.slug],
        label: top.name,
        query,
        kind: 'prefix',
        suggestions: suggestionsFor(prefix.slice(1, 5)),
      };
    }
  }

  // --- the town named inside a longer phrase: "a room in Tamale" ---
  const directMention = TOWNS.filter((t) => {
    const n = norm(t.name);
    return n.length >= 3 && q.includes(n);
  }).sort(byCount);
  if (directMention.length > 0) {
    const top = directMention[0];
    if (top !== undefined) {
      return {
        towns: [top.slug],
        label: top.name,
        query,
        kind: 'fuzzy',
        suggestions: suggestionsFor(directMention.slice(1, 5)),
      };
    }
  }

  // --- a city named in the sub line: "kumasi", "accra" ---
  const cityWord = TOWNS.filter((t) => {
    const city = norm(t.sub).split(' ')[0];
    return city !== undefined && city.length > 2 && (q === city || q.includes(city));
  }).sort(byCount);
  if (cityWord.length > 0) {
    return {
      towns: cityWord.map((t) => t.slug),
      label: query,
      query,
      kind: 'fuzzy',
      suggestions: suggestionsFor(cityWord.slice(0, 6)),
    };
  }

  // --- a typo ---
  const typo = TOWNS.map((t) => ({ t, d: editDistance(q, norm(t.name)) }))
    .filter((x) => x.d <= 2)
    .sort((a, b) => a.d - b.d || countFor(b.t.slug) - countFor(a.t.slug));
  const closest = typo[0];
  if (closest !== undefined) {
    return {
      towns: [closest.t.slug],
      label: closest.t.name,
      query,
      kind: 'fuzzy',
      suggestions: suggestionsFor(typo.slice(1, 5).map((x) => x.t)),
    };
  }

  // --- nothing. Not an error: a coverage gap, and we say so. ---
  return {
    towns: [],
    label: query,
    query,
    kind: 'none',
    suggestions: suggestionsFor(
      [...TOWNS].filter((t) => countFor(t.slug) > 0).sort(byCount).slice(0, 6),
    ),
  };
}

