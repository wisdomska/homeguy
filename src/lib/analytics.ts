/**
 * Analytics. Cookieless, no consent banner, and small on purpose - an
 * analytics bundle that breaks the data budget is self-defeating when the
 * user is paying GH¢5-10/GB.
 *
 * This file is the whole client payload: one sendBeacon call. Vercel
 * Analytics and Speed Insights are mounted separately and only in
 * production (src/app/layout.tsx).
 *
 * What is measured is what this product lives or dies by, not pageviews.
 * Nothing measured here is ever displayed back to a user: no view counts,
 * no save counts, no "popular". Ghanaian renters suppress visible
 * enthusiasm because showing it raises the asking price.
 */

export type EventName =
  | 'search_performed'
  | 'zero_results'
  | 'low_results'
  | 'filter_applied'
  | 'advance_not_stated_rate'
  | 'cluster_size_distribution'
  | 'saved'
  | 'discarded'
  | 'note_added'
  | 'compare_used'
  | 'check_now_used'
  | 'link_pasted'
  | 'data_saver_enabled'
  | 'near_miss_used'
  | 'report_sent';

export type EventProps = Record<string, string | number | boolean | null>;

export function track(name: EventName, props: EventProps = {}): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ name, props, at: Date.now() });
  try {
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Analytics never breaks the page.
  }
}
