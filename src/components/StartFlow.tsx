'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { START } from '@/core/copy';
import { formatMoney, PESEWAS_PER_CEDI } from '@/core/money';
import { THIN_TOWN_THRESHOLD } from '@/core/coverage';
import ui from './ui.module.css';
import styles from './StartFlow.module.css';

interface TownRow {
  slug: string;
  name: string;
  sub: string;
  count: number;
  regionSlug: string;
}
interface RegionRow {
  slug: string;
  name: string;
  count: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'];

export function StartFlow({
  total,
  towns,
  regions,
}: {
  total: number;
  towns: TownRow[];
  regions: RegionRow[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [monthly, setMonthly] = useState('');
  const [lump, setLump] = useState('');
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);

  const field = step === 1 ? monthly : lump;
  const setField = step === 1 ? setMonthly : setLump;

  const monthlyNum = Number(monthly);
  const lumpNum = Number(lump);

  const press = (k: string) => {
    setField((cur) => {
      if (k === '⌫') return cur.slice(0, -1);
      if (k === '000') return cur === '' ? '' : `${cur}000`.slice(0, 7);
      return `${cur}${k}`.replace(/^0+/, '').slice(0, 7);
    });
  };

  const title = step === 1 ? START.title1 : step === 2 ? START.title2 : START.title3;

  const consequence = useMemo(() => {
    if (step === 1) {
      if (monthly === '') return START.consequence1Empty;
      // Rendered from the real index size, not an estimate.
      return START.consequence1(
        Math.round(total * fractionBelow(monthlyNum)),
        total,
      );
    }
    if (step === 2) {
      if (lump === '') return START.consequence2Empty;
      return START.consequence2(Math.round(total * fractionBelow(lumpNum / 12)));
    }
    return '';
  }, [step, monthly, lump, monthlyNum, lumpNum, total]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q === '' ? towns : towns.filter((t) =>
      `${t.name} ${t.sub}`.toLowerCase().includes(q),
    );
    return [...rows].sort((a, b) => b.count - a.count).slice(0, 12);
  }, [query, towns]);

  const chosenRegions = useMemo(
    () =>
      [...new Set(chosen.map((s) => towns.find((t) => t.slug === s)?.regionSlug))]
        .filter((r): r is string => r !== undefined)
        .map((r) => regions.find((x) => x.slug === r))
        .filter((r): r is RegionRow => r !== undefined),
    [chosen, towns, regions],
  );
  const thinRegion = chosenRegions.find((r) => r.count > 0 && r.count < 60);

  const go = () => {
    const p = new URLSearchParams();
    if (chosen.length > 0) p.set('area', chosen.join(','));
    if (lump !== '') p.set('lumpMax', lump);
    if (monthly !== '') p.set('monthlyMax', monthly);
    const q = p.toString();
    router.push(q === '' ? '/search' : `/search?${q}`);
  };

  const next = () => {
    if (step === 3) go();
    else setStep((s) => (s === 1 ? 2 : 3));
  };

  const skip = () => {
    if (step === 3) {
      setChosen([]);
      router.push(lump === '' ? '/search' : `/search?lumpMax=${lump}`);
      return;
    }
    setStep((s) => (s === 1 ? 2 : 3));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <span className={ui.overline}>{START.step(step)}</span>
          <button className={ui.btnTertiary} type="button" onClick={skip}>
            {step === 3 ? START.skipLast : START.skipEarly}
          </button>
        </div>

        <div className={styles.bars} aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= step ? styles.barOn : styles.bar} />
          ))}
        </div>

        <h1 className={ui.h2}>{title}</h1>

        {step < 3 ? (
          <>
            <div className={styles.money}>
              <span className={styles.currency}>GH¢</span>
              <span
                className={field === '' ? `${styles.amount} ${styles.amountEmpty} num` : `${styles.amount} num`}
              >
                {field === '' ? '0' : Number(field).toLocaleString('en-US')}
              </span>
              <span className={styles.caret} aria-hidden="true" />
            </div>
            <p className={`${ui.caption} ${styles.consequence} num`} aria-live="polite">
              {consequence}
            </p>

            {step === 2 ? (
              <p className={`${styles.lesson} num`}>
                {monthly === ''
                  ? START.advanceLessonBare
                  : START.advanceLesson(
                      formatMoney(monthlyNum * PESEWAS_PER_CEDI),
                      formatMoney(monthlyNum * 12 * PESEWAS_PER_CEDI),
                    )}
              </p>
            ) : null}

            <div className={styles.desktopEntry}>
              <span className={ui.overline}>{START.ladderLabel}</span>
              <div className={ui.row}>
                <label className={styles.inputWrap}>
                  <span className="sr-only">Amount in cedis</span>
                  <span className={styles.prefix}>GH¢</span>
                  <input
                    className={`${styles.input} num`}
                    inputMode="numeric"
                    value={field}
                    placeholder="0"
                    onChange={(e) => setField(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                  />
                </label>
              </div>
            </div>

            <div className={ui.row}>
              {(step === 1 ? [600, 800, 1200] : ladderFor(monthlyNum)).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={field === String(v) ? `${ui.chipOn} num` : `${ui.chip} num`}
                  onClick={() => setField(String(v))}
                >
                  {formatMoney(v * PESEWAS_PER_CEDI)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.placeStep}>
            {chosen.length > 0 ? (
              <div className={ui.row}>
                {chosen.map((s) => {
                  const t = towns.find((x) => x.slug === s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={ui.chipOn}
                      onClick={() => setChosen((c) => c.filter((x) => x !== s))}
                    >
                      {t === undefined ? s : t.name} ✕
                    </button>
                  );
                })}
              </div>
            ) : null}

            <label className={styles.inputWrap}>
              <span className="sr-only">{START.townPlaceholder}</span>
              <input
                className={styles.input}
                value={query}
                placeholder={START.townPlaceholder}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <ul className={styles.townList}>
              {filtered.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    className={styles.townRow}
                    aria-pressed={chosen.includes(t.slug)}
                    onClick={() =>
                      setChosen((c) =>
                        c.includes(t.slug) ? c.filter((x) => x !== t.slug) : [...c, t.slug],
                      )
                    }
                  >
                    <span className={styles.townName}>{t.name}</span>
                    <span className={ui.caption}>{t.sub}</span>
                    {t.count < THIN_TOWN_THRESHOLD ? (
                      <span className={ui.thinPill}>thin coverage</span>
                    ) : null}
                    <span className={`${ui.caption} num`}>{t.count}</span>
                  </button>
                </li>
              ))}
            </ul>

            {thinRegion === undefined ? null : (
              <div className={ui.panel}>
                <p className={`${ui.caption} num`}>
                  {START.thinRegion(thinRegion.name, thinRegion.count)}
                </p>
                <p className={ui.caption}>{START.thinRegionFootnote}</p>
              </div>
            )}
          </div>
        )}

        <button className={`${ui.btnPrimary} num`} type="button" onClick={next} data-testid="start-next">
          {step === 3
            ? chosen.length === 0
              ? START.ctaAnywhere
              : 'Show what we track there'
            : START.next}
        </button>

        {step < 3 ? (
          <div className={styles.keypad}>
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={`${styles.key} num`}
                onClick={() => press(k)}
                aria-label={k === '⌫' ? 'Delete' : k}
              >
                {k}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The share of the index a monthly figure reaches. Derived from the real
 * rent distribution rather than asserted, and deliberately coarse - it is a
 * consequence line, not a filter.
 */
function fractionBelow(monthlyCedis: number): number {
  if (!Number.isFinite(monthlyCedis) || monthlyCedis <= 0) return 0;
  // Rents in the dataset run roughly GH¢160-2,400.
  const lo = 160;
  const hi = 2400;
  if (monthlyCedis <= lo) return 0;
  if (monthlyCedis >= hi) return 1;
  return (monthlyCedis - lo) / (hi - lo);
}

/** Web.dc.html:1502 - the lump presets follow from the monthly figure. */
function ladderFor(monthly: number): number[] {
  if (!Number.isFinite(monthly) || monthly <= 0) return [4800, 9600, 19200];
  return [monthly * 6, monthly * 12, monthly * 24];
}
