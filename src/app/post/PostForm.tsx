'use client';

import { useState } from 'react';
import { POST } from '@/core/copy';
import ui from '@/components/ui.module.css';
import styles from './post.module.css';

type State =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; message: string }
  | { status: 'error'; message: string };

export function PostForm({ towns }: { towns: Array<{ slug: string; name: string }> }) {
  const [text, setText] = useState('');
  const [townSlug, setTownSlug] = useState('');
  const [role, setRole] = useState<'agent' | 'landlord'>('agent');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>({ status: 'idle' });

  const ready = text.trim().length >= 20 && townSlug !== '' && phone.trim() !== '' && consent;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) {
      setState({ status: 'error', message: POST.errorMissing });
      return;
    }
    setState({ status: 'busy' });
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, townSlug, role, name, phone, consent }),
      });
      const data: { ok: boolean; message: string } = await res.json();
      if (data.ok) {
        setState({ status: 'done', message: data.message });
        setText('');
      } else {
        setState({ status: 'error', message: data.message });
      }
    } catch {
      setState({ status: 'error', message: POST.errorOffline });
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={styles.field}>
        <span className={styles.label}>{POST.messageLabel}</span>
        <span className={ui.caption}>{POST.messageHint}</span>
        <textarea
          className={styles.textarea}
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-testid="post-text"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{POST.townLabel}</span>
        <select
          className={ui.input}
          value={townSlug}
          onChange={(e) => setTownSlug(e.target.value)}
          data-testid="post-town"
        >
          <option value="">{POST.townPlaceholder}</option>
          {towns.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>{POST.roleLabel}</legend>
        <label className={styles.choice}>
          <input
            type="radio"
            name="role"
            checked={role === 'agent'}
            onChange={() => setRole('agent')}
          />
          {POST.roleAgent}
        </label>
        <label className={styles.choice}>
          <input
            type="radio"
            name="role"
            checked={role === 'landlord'}
            onChange={() => setRole('landlord')}
          />
          {POST.roleLandlord}
        </label>
      </fieldset>

      <label className={styles.field}>
        <span className={styles.label}>{POST.nameLabel}</span>
        <input
          className={ui.input}
          value={name}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{POST.phoneLabel}</span>
        <input
          className={`${ui.input} num`}
          inputMode="tel"
          autoComplete="tel"
          placeholder="024 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          data-testid="post-phone"
        />
      </label>

      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          data-testid="post-consent"
        />
        <span>{POST.consent}</span>
      </label>

      <button
        type="submit"
        className={ready ? ui.btnPrimary : ui.btnDisabled}
        disabled={state.status === 'busy'}
        data-testid="post-submit"
      >
        {state.status === 'busy' ? POST.sending : POST.submit}
      </button>

      {state.status === 'done' || state.status === 'error' ? (
        <p className={ui.caption} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
