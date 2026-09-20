'use client';

/**
 * The shortlist, the discard bucket, notes, ratings and contact status.
 *
 * All of it works anonymously from the first visit, with the network off.
 * A phone number exists only to sync across devices and receive the digest,
 * and is offered after the user has something worth keeping - never as a
 * gate. Web.dc.html:1679: "Everything you save lives in this browser. Add a
 * number and it survives a lost or wiped phone."
 */

import { useCallback, useEffect, useState } from 'react';
import { STORE_ENTRIES, STORE_PREFS, STORE_QUEUE, idbDelete, idbGet, idbGetAll, idbPut } from './idb';

export type Verdict = 'saved' | 'discarded';
export type Rating = 'Good' | 'Ok' | 'Poor';
export type ContactStatus = 'Not contacted' | 'Contacted' | 'Viewing booked';

export interface Entry {
  clusterId: string;
  verdict: Verdict;
  rating: Rating | null;
  status: ContactStatus;
  note: string | null;
  updatedAt: number;
  /** true until the sync queue has drained this change to the server. */
  pending: boolean;
}

export interface QueuedChange {
  id?: number;
  clusterId: string;
  entry: Omit<Entry, 'pending'>;
  queuedAt: number;
}

function emptyEntry(clusterId: string, verdict: Verdict): Entry {
  return {
    clusterId,
    verdict,
    rating: null,
    status: 'Not contacted',
    note: null,
    updatedAt: Date.now(),
    pending: true,
  };
}

/* ---- the store ------------------------------------------------------- */

type Listener = (entries: Entry[]) => void;

let cache: Entry[] | null = null;
const listeners = new Set<Listener>();

function emit() {
  const snapshot = cache === null ? [] : cache;
  for (const l of listeners) l(snapshot);
}

async function load(): Promise<Entry[]> {
  if (cache !== null) return cache;
  cache = await idbGetAll<Entry>(STORE_ENTRIES);
  return cache;
}

/**
 * Write locally, then queue. The local write is what makes save, note, rate
 * and discard succeed with the network disabled - it never waits on a fetch.
 */
async function write(entry: Entry): Promise<void> {
  const next = { ...entry, updatedAt: Date.now(), pending: true };
  const list = await load();
  const i = list.findIndex((e) => e.clusterId === next.clusterId);
  if (i >= 0) list[i] = next;
  else list.push(next);
  emit();
  await idbPut(STORE_ENTRIES, next);
  const { pending: _pending, ...rest } = next;
  await idbPut<QueuedChange>(STORE_QUEUE, {
    clusterId: next.clusterId,
    entry: rest,
    queuedAt: Date.now(),
  });
  void drainQueue();
}

async function remove(clusterId: string): Promise<void> {
  const list = await load();
  const i = list.findIndex((e) => e.clusterId === clusterId);
  if (i >= 0) list.splice(i, 1);
  emit();
  await idbDelete(STORE_ENTRIES, clusterId);
}

/* ---- the sync queue -------------------------------------------------- */

let draining = false;

export async function drainQueue(): Promise<number> {
  if (draining) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  draining = true;
  let sent = 0;
  try {
    const queued = await idbGetAll<QueuedChange>(STORE_QUEUE);
    for (const q of queued) {
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(q.entry),
        });
        if (!res.ok) break;
        if (q.id !== undefined) await idbDelete(STORE_QUEUE, q.id);
        sent += 1;
        const list = await load();
        const e = list.find((x) => x.clusterId === q.clusterId);
        if (e !== undefined) e.pending = false;
      } catch {
        // Still offline, or the request failed. The change stays queued.
        break;
      }
    }
    if (sent > 0) {
      const list = await load();
      for (const e of list) await idbPut(STORE_ENTRIES, e);
      emit();
    }
  } finally {
    draining = false;
  }
  return sent;
}

export async function pendingCount(): Promise<number> {
  const queued = await idbGetAll<QueuedChange>(STORE_QUEUE);
  return queued.length;
}

/* ---- the hook -------------------------------------------------------- */

export function useShortlist() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    listeners.add(setEntries);
    void load().then((e) => {
      if (!live) return;
      setEntries([...e]);
      setReady(true);
    });
    const onOnline = () => void drainQueue();
    window.addEventListener('online', onOnline);
    void drainQueue();
    return () => {
      live = false;
      listeners.delete(setEntries);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const entryFor = useCallback(
    (clusterId: string): Entry | null =>
      entries.find((e) => e.clusterId === clusterId) ?? null,
    [entries],
  );

  const save = useCallback(
    async (clusterId: string) => {
      const existing = entries.find((e) => e.clusterId === clusterId);
      await write(
        existing === null || existing === undefined
          ? emptyEntry(clusterId, 'saved')
          : { ...existing, verdict: 'saved' },
      );
      setEntries([...(cache ?? [])]);
    },
    [entries],
  );

  const discard = useCallback(
    async (clusterId: string) => {
      const existing = entries.find((e) => e.clusterId === clusterId);
      await write(
        existing === null || existing === undefined
          ? emptyEntry(clusterId, 'discarded')
          : { ...existing, verdict: 'discarded' },
      );
      setEntries([...(cache ?? [])]);
    },
    [entries],
  );

  const forget = useCallback(async (clusterId: string) => {
    await remove(clusterId);
    setEntries([...(cache ?? [])]);
  }, []);

  const patch = useCallback(
    async (clusterId: string, p: Partial<Omit<Entry, 'clusterId'>>) => {
      const existing = entries.find((e) => e.clusterId === clusterId);
      const base = existing === undefined ? emptyEntry(clusterId, 'saved') : existing;
      await write({ ...base, ...p });
      setEntries([...(cache ?? [])]);
    },
    [entries],
  );

  const saved = entries.filter((e) => e.verdict === 'saved');
  const discarded = entries.filter((e) => e.verdict === 'discarded');

  return { ready, entries, saved, discarded, entryFor, save, discard, forget, patch };
}

/* ---- preferences ----------------------------------------------------- */

export async function getPref<T>(key: string, fallbackValue: T): Promise<T> {
  const v = await idbGet<T>(STORE_PREFS, key);
  return v === undefined ? fallbackValue : v;
}

export async function setPref<T>(key: string, value: T): Promise<void> {
  await idbPut(STORE_PREFS, value, key);
}

export function usePref<T>(key: string, fallbackValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallbackValue);
  useEffect(() => {
    void getPref<T>(key, fallbackValue).then(setValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (v: T) => {
      setValue(v);
      void setPref(key, v);
    },
    [key],
  );
  return [value, update];
}
