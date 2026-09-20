/**
 * An in-process ring buffer for analytics events, so /admin/health has
 * something real to show without a database attached. In production these
 * go to the warehouse; the shape does not change.
 *
 * Nothing stored here identifies a person.
 */
export interface StoredEvent {
  name: string;
  props: Record<string, unknown>;
  at: number;
}

const MAX = 2000;
const events: StoredEvent[] = [];

export function recordEvent(name: string, props: Record<string, unknown>): void {
  events.push({ name, props, at: Date.now() });
  if (events.length > MAX) events.splice(0, events.length - MAX);
}

export function recentEvents(name?: string, sinceMs = 7 * 86_400_000): StoredEvent[] {
  const cutoff = Date.now() - sinceMs;
  return events.filter((e) => e.at >= cutoff && (name === undefined || e.name === name));
}

export function eventCounts(sinceMs = 7 * 86_400_000): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of recentEvents(undefined, sinceMs)) {
    out[e.name] = (out[e.name] ?? 0) + 1;
  }
  return out;
}

/** Zero-result rate by town, split by cause. The number that matters most. */
export function zeroResultsByTown(sinceMs = 7 * 86_400_000): Array<{
  town: string;
  filters: number;
  coverage: number;
}> {
  const map = new Map<string, { filters: number; coverage: number }>();
  for (const e of recentEvents('zero_results', sinceMs)) {
    const town = String(e.props['towns'] ?? 'anywhere');
    const cause = String(e.props['cause'] ?? 'filters');
    const row = map.get(town) ?? { filters: 0, coverage: 0 };
    if (cause === 'coverage') row.coverage += 1;
    else row.filters += 1;
    map.set(town, row);
  }
  return [...map.entries()]
    .map(([town, v]) => ({ town, ...v }))
    .sort((a, b) => b.coverage + b.filters - (a.coverage + a.filters));
}
