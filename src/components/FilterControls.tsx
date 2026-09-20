'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FILTERS } from '@/core/copy';
import { activeFilterCount, type Filters } from '@/core/filters';
import { searchHref, toQuery } from '@/core/url';
import { track } from '@/lib/analytics';
import type { MeterArrangement, UnitType, WaterSource } from '@/core/types';
import ui from './ui.module.css';
import styles from './FilterControls.module.css';

export interface Facets {
  advance: Array<{ months: number; count: number }>;
  types: Array<{ type: UnitType; label: string; count: number }>;
  notStated: number;
  total: number;
  filters: Filters;
}

/**
 * The filter surface. Five sections, batch apply, sticky live count.
 *
 * Pass 1 - Search and Results.dc.html:1140-1377 is the authority here: the
 * mobile sheet groups filters by the goal they serve, not by field name,
 * and the apply button carries the real count of what is about to be shown.
 *
 * Batch apply, not instant apply: NN/g's own guidance is that instant apply
 * is viable only when results return in under a second, which Ghanaian
 * mobile will not do (Research Dossier §11).
 *
 * The sheet is a native <dialog>, so focus is trapped, Escape closes it and
 * focus returns to the trigger without any of that being hand-rolled.
 */
export function FilterControls({
  filters,
  townLabel,
  all,
}: {
  filters: Filters;
  townLabel: string;
  all: Facets;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Filters>(filters);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => setDraft(filters), [filters]);

  // Live count for the apply button. One small request, debounced - the
  // dataset is far too large to recount in the browser, and guessing would
  // put a number on screen that is not real.
  useEffect(() => {
    const q = toQuery(draft);
    const t = setTimeout(() => {
      fetch(`/api/count?${q}`)
        .then((r) => r.json())
        .then((d: { count: number }) => setPendingCount(d.count))
        .catch(() => setPendingCount(null));
    }, 180);
    return () => clearTimeout(t);
  }, [draft]);

  const open = useCallback(() => dialogRef.current?.showModal(), []);
  const close = useCallback(() => dialogRef.current?.close(), []);

  const apply = useCallback(() => {
    track('filter_applied', {
      filters: activeFilterCount(draft),
      before: all.total,
      after: pendingCount,
    });
    close();
    router.push(searchHref(draft));
  }, [draft, close, router, pendingCount, all.total]);

  const applied = useMemo(() => appliedChips(filters), [filters]);
  const count = activeFilterCount(filters);

  const toggleAdvance = (m: number) =>
    setDraft((d) => ({
      ...d,
      advances: d.advances.includes(m)
        ? d.advances.filter((x) => x !== m)
        : [...d.advances, m],
    }));

  const toggleType = (t: UnitType) =>
    setDraft((d) => ({
      ...d,
      types: d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t],
    }));

  const toggleWater = (w: WaterSource) =>
    setDraft((d) => ({
      ...d,
      water: d.water.includes(w) ? d.water.filter((x) => x !== w) : [...d.water, w],
    }));

  const toggleMeter = (m: MeterArrangement) =>
    setDraft((d) => ({
      ...d,
      meter: d.meter.includes(m) ? d.meter.filter((x) => x !== m) : [...d.meter, m],
    }));

  const zeroTypes = all.types.filter((t) => t.count === 0).map((t) => t.label);

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.barInner}>
          <a className={ui.chip} href="/start">
            <PinIcon />
            {townLabel}
          </a>
          <button className={count > 0 ? ui.chipOn : ui.chip} type="button" onClick={open}>
            {count > 0 ? <span className={ui.dot} /> : null}
            {FILTERS.title}
            {count > 0 ? ` · ${count}` : ''}
          </button>
          {count > 0 ? (
            <a className={ui.btnTertiary} href={searchHref({ ...filters, types: [], advances: [], seen: 'any', water: [], meter: [], polytank: false, privateToilet: false, gated: false, monthlyMax: null })}>
              {FILTERS.clearAll}
            </a>
          ) : null}
        </div>

        {applied.length > 0 ? (
          <div className={styles.chipRail} data-testid="chip-rail">
            {applied.map((c) => (
              <a key={c.label} className={`${ui.chipOn} ${styles.railChip}`} href={searchHref(c.without)}>
                <span className={ui.dot} />
                {c.label} ✕
              </a>
            ))}
            <span className={`${ui.caption} num`}>{FILTERS.filterCount(count)}</span>
          </div>
        ) : null}
      </div>

      <dialog ref={dialogRef} className={styles.sheet} aria-label={FILTERS.title}>
        <div className={styles.sheetHead}>
          <h2 className={ui.h3}>{FILTERS.title}</h2>
          <button className={styles.close} type="button" onClick={close} aria-label="Close filters">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.sheetBody}>
          <section className={styles.group}>
            <h3 className={ui.overline}>{FILTERS.sectionPay}</h3>
            <div className={ui.row}>
              {all.advance.map((a) => {
                const on = draft.advances.includes(a.months);
                const empty = a.count === 0;
                return (
                  <button
                    key={a.months}
                    type="button"
                    disabled={empty}
                    aria-pressed={on}
                    className={empty ? ui.chipEmpty : on ? `${ui.chipOn} num` : `${ui.chip} num`}
                    onClick={() => toggleAdvance(a.months)}
                  >
                    {a.months} · {a.count}
                  </button>
                );
              })}
            </div>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={draft.includeNotStated}
                onChange={(e) => setDraft((d) => ({ ...d, includeNotStated: e.target.checked }))}
              />
              <span className={styles.checkLabel}>{FILTERS.includeNotStated}</span>
              <span className={`${ui.caption} num`}>{all.notStated}</span>
            </label>
            <p className={ui.caption}>{FILTERS.notStatedExplainer(all.notStated, townLabel)}</p>
          </section>

          <section className={styles.group}>
            <h3 className={ui.overline}>{FILTERS.sectionKind}</h3>
            {all.types.map((t) => {
              const on = draft.types.includes(t.type);
              const empty = t.count === 0;
              return (
                <label
                  key={t.type}
                  className={empty ? `${styles.check} ${styles.checkEmpty}` : styles.check}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={empty}
                    onChange={() => toggleType(t.type)}
                  />
                  <span className={styles.checkLabel}>{t.label}</span>
                  <span className={`${ui.caption} num`}>{t.count}</span>
                </label>
              );
            })}
            {zeroTypes.length > 0 ? (
              <p className={ui.caption}>
                {FILTERS.zeroTypeNote(zeroTypes.join(' or '), townLabel)}
              </p>
            ) : null}
          </section>

          <section className={styles.group}>
            <h3 className={ui.overline}>{FILTERS.sectionWork}</h3>
            <div className={ui.row}>
              {(['gwcl', 'borehole', 'tanker'] as WaterSource[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={draft.water.includes(w)}
                  className={draft.water.includes(w) ? ui.chipOn : ui.chip}
                  onClick={() => toggleWater(w)}
                >
                  {w === 'gwcl' ? 'GWCL' : w === 'borehole' ? 'Borehole' : 'Tanker'}
                </button>
              ))}
            </div>
            <div className={ui.row}>
              {(['self', 'shared', 'prepaid'] as MeterArrangement[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={draft.meter.includes(m)}
                  className={draft.meter.includes(m) ? ui.chipOn : ui.chip}
                  onClick={() => toggleMeter(m)}
                >
                  {m === 'self' ? 'Self meter' : m === 'shared' ? 'Shared meter' : 'Prepaid'}
                </button>
              ))}
            </div>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={draft.polytank}
                onChange={(e) => setDraft((d) => ({ ...d, polytank: e.target.checked }))}
              />
              <span className={styles.checkLabel}>{FILTERS.polytank}</span>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={draft.privateToilet}
                onChange={(e) => setDraft((d) => ({ ...d, privateToilet: e.target.checked }))}
              />
              <span className={styles.checkLabel}>{FILTERS.privateToilet}</span>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={draft.gated}
                onChange={(e) => setDraft((d) => ({ ...d, gated: e.target.checked }))}
              />
              <span className={styles.checkLabel}>{FILTERS.gated}</span>
            </label>
          </section>

          <section className={styles.group}>
            <h3 className={ui.overline}>{FILTERS.sectionFresh}</h3>
            <div className={ui.row}>
              {(
                [
                  ['7', FILTERS.fresh7],
                  ['30', FILTERS.fresh30],
                  ['any', FILTERS.freshAny],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={draft.seen === k}
                  className={draft.seen === k ? ui.chipOn : ui.chip}
                  onClick={() => setDraft((d) => ({ ...d, seen: k }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.sheetFoot}>
          <button
            className={ui.btnTertiary}
            type="button"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                types: [],
                advances: [],
                seen: 'any',
                water: [],
                meter: [],
                polytank: false,
                privateToilet: false,
                gated: false,
                monthlyMax: null,
              }))
            }
          >
            {FILTERS.clearAll}
          </button>
          <button
            className={pendingCount === 0 ? ui.btnDisabled : `${ui.btnPrimary} ${styles.apply}`}
            type="button"
            onClick={apply}
            disabled={pendingCount === 0}
            data-testid="apply-filters"
          >
            <span className="num" aria-live="polite">
              {pendingCount === null ? FILTERS.title : FILTERS.apply(pendingCount)}
            </span>
          </button>
        </div>
      </dialog>
    </>
  );
}

function appliedChips(f: Filters): Array<{ label: string; without: Filters }> {
  const out: Array<{ label: string; without: Filters }> = [];
  for (const t of f.types) {
    out.push({ label: t.replace(/_/g, ' '), without: { ...f, types: f.types.filter((x) => x !== t) } });
  }
  for (const a of f.advances) {
    out.push({
      label: `${a} months`,
      without: { ...f, advances: f.advances.filter((x) => x !== a) },
    });
  }
  if (f.seen !== 'any') {
    out.push({ label: `Seen in ${f.seen} days`, without: { ...f, seen: 'any' } });
  }
  for (const w of f.water) {
    out.push({ label: w, without: { ...f, water: f.water.filter((x) => x !== w) } });
  }
  for (const m of f.meter) {
    out.push({ label: `${m} meter`, without: { ...f, meter: f.meter.filter((x) => x !== m) } });
  }
  if (f.polytank) out.push({ label: 'Polytank', without: { ...f, polytank: false } });
  if (f.privateToilet) out.push({ label: 'Private toilet', without: { ...f, privateToilet: false } });
  if (f.gated) out.push({ label: 'Gated', without: { ...f, gated: false } });
  return out;
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
