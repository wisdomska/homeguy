'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { RESULTS } from '@/core/copy';
import ui from './ui.module.css';
import styles from './MapPanel.module.css';

export interface Pin {
  id: string;
  href: string;
  x: number;
  y: number;
  label: string;
}

/**
 * The map. Zero tile requests until the user asks for it - tiles are a real
 * share of the data cost on a GH¢5-10/GB bundle (Research Dossier C5), and
 * nothing on this page needs them to be useful.
 *
 * Markers are capped at 40. Airbnb found too many pins made booking harder,
 * and fewer markers is a straight performance win on cheap hardware.
 *
 * The list is the equivalent: every pin here is a card above, and the
 * screen says so, so the map is never the only route to a result.
 */
export function MapPanel({ pins, total }: { pins: Pin[]; total: number }) {
  const [on, setOn] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  // On a phone the map opens below the list. A "Show map" button that
  // leaves you looking at the same cards has not shown you the map — and
  // the tiles, being lazy, would not even be fetched until you scrolled.
  useEffect(() => {
    if (!on) return;
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [on]);

  return (
    <>
      <button
        className={`${ui.chip} ${styles.pill}`}
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-expanded={on}
        data-testid="map-toggle"
      >
        <RingsIcon />
        {on ? RESULTS.hideMap : RESULTS.showMap}
      </button>

      {on ? (
        <aside ref={panelRef} className={styles.panel} aria-label="Map of results">
          <div className={styles.canvas}>
            <img
              className={styles.tiles}
              src="https://tile.openstreetmap.org/6/32/30.png"
              alt=""
              loading="lazy"
              width={256}
              height={256}
            />
            {pins.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className={styles.pin}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span className={`${styles.pinLabel} num`}>{p.label}</span>
                <span className={styles.pinStem} />
              </Link>
            ))}
            <p className={`${styles.pinLine} num`}>{RESULTS.pinLine(pins.length, total)}</p>
          </div>
          <p className={ui.caption}>{RESULTS.mapListEquivalent}</p>
        </aside>
      ) : null}
    </>
  );
}

function RingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="9" ry="5" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="12" cy="12" rx="4" ry="2.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
