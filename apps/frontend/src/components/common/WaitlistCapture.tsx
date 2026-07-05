import * as React from 'react';
import { apiFetch } from '@/lib/api';

/**
 * Inline pre-launch email capture — just the field, the Join button, the
 * reassurance line, and the done/error states. No positioning or trigger logic,
 * so it can be dropped wherever intent is highest (e.g. the demo read-only
 * sheet). Submitting the form is the opt-in; posts to the public POST
 * /api/waitlist. Once joined, it remembers so it never asks the same visitor
 * twice.
 */
const STORAGE_KEY = 'chs_waitlist_v1'; // 'done'

type Status = 'form' | 'submitting' | 'done' | 'error';

/** True once this browser has joined the waitlist — so we stop asking. */
export function hasJoinedWaitlist(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'done';
  } catch {
    return false;
  }
}

export function WaitlistCapture({ source }: { source: string }) {
  const [email, setEmail] = React.useState('');
  const [website, setWebsite] = React.useState(''); // honeypot
  const [message, setMessage] = React.useState('');
  const [status, setStatus] = React.useState<Status>(() => (hasJoinedWaitlist() ? 'done' : 'form'));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setMessage('');
    try {
      const res = await apiFetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Submitting the form is the opt-in — the sole purpose is a launch
        // email, so the tap itself is the consent (no separate checkbox).
        body: JSON.stringify({ email, source, consent: true, website }),
      });
      if (!res.ok) throw new Error(String(res.status));
      try {
        localStorage.setItem(STORAGE_KEY, 'done');
      } catch {
        /* ignore */
      }
      setStatus('done');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again in a moment.');
    }
  }

  if (status === 'done') {
    return (
      <div className="text-center">
        <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
          You're on the list.
        </p>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          We'll email you at launch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {/* Honeypot — off-screen, not tab-reachable. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {status === 'submitting' ? 'Joining…' : 'Join'}
        </button>
      </div>

      <p className="mt-2 text-center text-[12px] text-zinc-500 dark:text-zinc-400">
        One email at launch. No spam.
      </p>

      {status === 'error' && (
        <p role="alert" className="mt-2 text-center text-[12px] text-red-600">
          {message}
        </p>
      )}
    </form>
  );
}
