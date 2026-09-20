'use client';

import { useState } from 'react';
import { ME, TRUST } from '@/core/copy';
import { track } from '@/lib/analytics';
import { usePref, useShortlist } from '@/lib/shortlist';
import ui from '@/components/ui.module.css';
import styles from './me.module.css';

/**
 * ME. Web.dc.html:860-951.
 *
 * Auth is phone-first and never a gate. Everything the user has saved
 * already works; a number is offered here, after there is something worth
 * keeping, and only so it survives a lost or wiped phone.
 *
 * "Add a listing you found" is the Tier 2 ingestion channel, and it is the
 * highest-signal, lowest-risk one we have: one page fetched because a human
 * asked for it is a completely different act from crawling a site.
 */
export default function MePage() {
  const { saved, discarded } = useShortlist();
  const [phone, setPhone] = usePref<string>('phone', '');
  const [account, setAccount] = usePref<string | null>('account', null);
  const [dataSaver, setDataSaver] = usePref<boolean>('dataSaver', false);
  const [searches, setSearches] = usePref<string[]>('savedSearches', []);

  const [link, setLink] = useState('');
  const [linkState, setLinkState] = useState<
    { status: 'idle' } | { status: 'busy' } | { status: 'done'; message: string } | { status: 'error'; message: string }
  >({ status: 'idle' });

  const [reason, setReason] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);

  const digits = phone.replace(/\D/g, '');

  const submitLink = async () => {
    if (link.trim() === '') return;
    setLinkState({ status: 'busy' });
    track('link_pasted', { hasUrl: /https?:\/\//i.test(link) });
    try {
      const res = await fetch('/api/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: link }),
      });
      const data: { status: string; message: string } = await res.json();
      if (data.status === 'parsed') {
        setLinkState({ status: 'done', message: data.message });
        setLink('');
      } else {
        setLinkState({ status: 'error', message: data.message });
      }
    } catch {
      setLinkState({
        status: 'error',
        message: 'You look offline. We have kept it — try again when you are back on data.',
      });
    }
  };

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <h1 className={ui.h2}>{ME.title}</h1>

      <div className={styles.grid}>
        {/* ---- account ---- */}
        <section className={ui.panel}>
          <h2 className={ui.overline}>{ME.account}</h2>
          <p className={ui.h3}>{account ?? ME.noAccount}</p>
          <p className={ui.caption}>{account === null ? ME.noAccountSub : ME.accountSub}</p>
          {account === null ? (
            <label className={styles.phoneRow}>
              <span className={styles.prefix}>{ME.phonePrefix}</span>
              <span className="sr-only">Phone number</span>
              <input
                className={`${styles.phoneInput} num`}
                inputMode="numeric"
                placeholder={ME.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9 ]/g, '').slice(0, 12))}
              />
            </label>
          ) : null}
          <button
            type="button"
            className={
              account !== null
                ? ui.btnSecondary
                : digits.length >= 9
                  ? ui.btnPrimary
                  : ui.btnDisabled
            }
            disabled={account === null && digits.length < 9}
            onClick={() => {
              if (account !== null) {
                setAccount(null);
                setPhone('');
              } else {
                setAccount(`${ME.phonePrefix} ${phone}`);
              }
            }}
          >
            {account !== null ? ME.signOut : ME.saveNumber}
          </button>
          <p className={ui.caption}>
            {saved.length} saved · {discarded.length} discarded, all stored on this device.
          </p>
        </section>

        {/* ---- data ---- */}
        <section className={ui.panel}>
          <h2 className={ui.overline}>{ME.data}</h2>
          <label className={styles.toggleRow}>
            <span className={styles.toggleText}>
              <span className={styles.toggleTitle}>{ME.dataSaver}</span>
              <span className={ui.caption}>
                {dataSaver ? ME.dataSaverOn : ME.dataSaverOff}
              </span>
            </span>
            <input
              type="checkbox"
              className={styles.switch}
              checked={dataSaver}
              onChange={(e) => {
                setDataSaver(e.target.checked);
                if (e.target.checked) track('data_saver_enabled', { on: true });
              }}
            />
          </label>
          <p className={ui.caption}>
            This deployment sends no listing imagery at all: photo counts link back to the
            source rather than rehosting its pictures, so a 20-card page is text and one
            22 KB font.
          </p>
        </section>

        {/* ---- saved searches ---- */}
        <section className={ui.panel} id="searches">
          <h2 className={ui.overline}>{ME.savedSearches}</h2>
          {searches.length === 0 ? (
            <p className={ui.caption}>
              No saved searches yet. Save one from a results page and new matches collect in
              your Digest.
            </p>
          ) : (
            <ul className={styles.list}>
              {searches.map((q, i) => (
                <li key={q} className={styles.listRow}>
                  <a className={styles.listLink} href={`/search?${q}`}>
                    {q === '' ? 'Anywhere in Ghana' : decodeURIComponent(q).replace(/&/g, ' · ')}
                  </a>
                  <button
                    type="button"
                    className={ui.btnTertiary}
                    onClick={() => setSearches(searches.filter((_, j) => j !== i))}
                    aria-label="Remove this saved search"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className={ui.caption}>{ME.savedSearchFoot}</p>
        </section>

        {/* ---- paste a link: the Tier 2 channel ---- */}
        <section className={ui.panel} id="paste">
          <h2 className={ui.overline}>{ME.addListing}</h2>
          <p className={ui.caption}>{ME.addListingSub}</p>
          <label>
            <span className="sr-only">{ME.linkPlaceholder}</span>
            <textarea
              className={styles.pasteInput}
              rows={3}
              placeholder={ME.linkPlaceholder}
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setLinkState({ status: 'idle' });
              }}
              data-testid="paste-input"
            />
          </label>
          <button
            type="button"
            className={link.trim() === '' ? ui.btnDisabled : ui.btnPrimary}
            disabled={link.trim() === '' || linkState.status === 'busy'}
            onClick={submitLink}
            data-testid="paste-submit"
          >
            {linkState.status === 'busy' ? 'Reading it…' : ME.addLink}
          </button>
          {linkState.status === 'done' ? (
            <p className={ui.caption} role="status">
              {linkState.message} {ME.linkAdded}
            </p>
          ) : null}
          {linkState.status === 'error' ? (
            <p className={ui.caption} role="status">
              {linkState.message}
            </p>
          ) : null}
        </section>

        {/* ---- trust ---- */}
        <section className={ui.panel}>
          <h2 className={ui.overline}>{ME.neverHeading}</h2>
          <p className={ui.body}>{ME.neverBody}</p>
          <p className={ui.caption}>{TRUST.ghanaCard}</p>
        </section>

        {/* ---- report ---- */}
        <section className={ui.panel} id="report">
          <h2 className={ui.overline}>{ME.report}</h2>
          <fieldset className={styles.fieldset}>
            <legend className="sr-only">Why are you reporting this listing?</legend>
            {ME.reportReasons.map((r) => (
              <label key={r} className={styles.radioRow}>
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => {
                    setReason(r);
                    setReportSent(false);
                  }}
                />
                <span>{r}</span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className={reason === null ? ui.btnDisabled : ui.btnPrimary}
            disabled={reason === null}
            onClick={() => {
              void fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
              });
              track('report_sent', { reason });
              setReportSent(true);
            }}
          >
            {reportSent ? ME.reportSent : ME.sendReport}
          </button>
          <p className={ui.caption} role="status">
            {reportSent ? ME.reportFootSent : ME.reportFoot}
          </p>
        </section>
      </div>
    </div>
  );
}
