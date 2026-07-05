import * as React from 'react';
import { useSession } from '@/hooks/queries/useSession';
import { apiFetch } from '@/lib/api';

/**
 * Pre-launch email capture, shown only inside the shared public demo session
 * (Workstream C2). Appears after the visitor has actually engaged — visited a
 * couple of screens or spent a little time — never on arrival, so it reads as an
 * invitation rather than a gate. Dismissal/success are remembered so it never
 * nags. Posts to the public POST /api/waitlist with source:'demo'.
 */
const STORAGE_KEY = 'chs_demo_waitlist_v1'; // 'dismissed' | 'done'
const ROUTE_THRESHOLD = 2; // distinct screens visited before we ask
const DWELL_MS = 45_000; // ...or this long in the demo, whichever comes first

type Status = 'form' | 'submitting' | 'done' | 'error';

export function DemoWaitlistPrompt({ route }: { route: string }) {
  const { data: session } = useSession();
  const isDemo = session?.isDemo === true;

  // Start hidden until we've read storage, so a returning visitor never sees a flash.
  const [resolved, setResolved] = React.useState(true);
  const [engaged, setEngaged] = React.useState(false);

  const [email, setEmail] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [website, setWebsite] = React.useState(''); // honeypot
  const [status, setStatus] = React.useState<Status>('form');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      setResolved(v === 'dismissed' || v === 'done');
    } catch {
      setResolved(false);
    }
  }, []);

  // Engagement signal 1: distinct screens visited.
  const seen = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!isDemo) return;
    seen.current.add(route);
    if (seen.current.size >= ROUTE_THRESHOLD) setEngaged(true);
  }, [route, isDemo]);

  // Engagement signal 2: dwell time, as a fallback for a visitor who lingers on
  // one screen.
  React.useEffect(() => {
    if (!isDemo) return;
    const t = setTimeout(() => setEngaged(true), DWELL_MS);
    return () => clearTimeout(t);
  }, [isDemo]);

  function persist(value: 'dismissed' | 'done') {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }

  function dismiss() {
    persist('dismissed');
    setResolved(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    if (!consent) {
      setStatus('error');
      setMessage('Please tick the box so we can email you at launch.');
      return;
    }
    setStatus('submitting');
    setMessage('');
    try {
      const res = await apiFetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'demo', consent, website }),
      });
      if (!res.ok) throw new Error(String(res.status));
      persist('done');
      setStatus('done');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again in a moment.');
    }
  }

  if (!isDemo) return null;
  // Show the thank-you even though we've persisted 'done'; hide everything else
  // once resolved or before the visitor has engaged.
  if (status !== 'done' && (resolved || !engaged)) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {status === 'done' ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                You're on the list.
              </p>
              <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                We'll email you once when we launch — nothing before.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResolved(true)}
              aria-label="Close"
              className="shrink-0 rounded-md px-2 py-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Like what you see?
                </p>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  We launch in a few months. Get an invite when it's ready.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 rounded-md px-2 py-1 text-lg leading-none text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ×
              </button>
            </div>

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

            <div className="mt-3 flex gap-2">
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

            <label className="mt-2 flex items-start gap-2 text-[12px] text-zinc-500 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-300"
              />
              <span>Email me once at launch. No spam, no sharing — unsubscribe anytime.</span>
            </label>

            {status === 'error' && (
              <p role="alert" className="mt-2 text-[12px] text-red-600">
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
