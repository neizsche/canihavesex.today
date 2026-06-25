import * as React from 'react';
import { ChevronRight, Pause, CalendarDays } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Header } from '@/components/common/Header';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { useNavigation } from '@/hooks/useNavigation';
import { useInsights } from '@/hooks/queries/useInsights';
import { useReanchor } from '@/hooks/queries/useReanchor';
import { CycleLine } from './CycleLine';

type FertilityStatus = 'fertile' | 'unsure' | 'not_fertile';

const STATUS_CONFIG: Record<
  FertilityStatus,
  {
    title: string;
    fallbackSubtitle: string;
    accent: string;
    dot: string;
    chipBg: string;
    chipText: string;
  }
> = {
  fertile: {
    title: 'Highly Fertile',
    fallbackSubtitle: 'High chance of pregnancy today.',
    accent: 'text-red-500',
    dot: 'bg-red-500',
    chipBg: 'bg-red-500/10 dark:bg-red-500/20',
    chipText: 'text-red-600 dark:text-red-300',
  },
  unsure: {
    title: 'Not Sure',
    fallbackSubtitle: 'Assume fertile to be safe.',
    accent: 'text-amber-500',
    dot: 'bg-amber-500',
    chipBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    chipText: 'text-amber-700 dark:text-amber-300',
  },
  not_fertile: {
    title: 'Not Fertile',
    fallbackSubtitle: 'Low chance of pregnancy today.',
    accent: 'text-emerald-500',
    dot: 'bg-emerald-500',
    chipBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    chipText: 'text-emerald-700 dark:text-emerald-300',
  },
};

const BASIS_SHORT: Record<string, string> = {
  'Anchored by temperature shift.': 'Temp Shift',
  'Driven by LH surge.': 'LH Surge',
  'Based on mucus pattern.': 'Mucus',
  'Based on cycle history.': 'History',
};

const SIGNAL_KEYS = [
  { key: 'temp', label: 'Temp' },
  { key: 'lh', label: 'LH' },
  { key: 'mucus', label: 'Fluid' },
  { key: 'calendar', label: 'Calendar' },
] as const;

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Updated Just now';
  const diffInMinutes = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diffInMinutes < 1) return 'Updated Just now';
  if (diffInMinutes < 60) return `Updated ${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Updated ${diffInHours} hr${diffInHours === 1 ? '' : 's'} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `Updated ${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
}

export function TodayScreen() {
  const { navigate } = useNavigation();
  const { showBranding: brandingVisible } = useDiscreetMode();
  const todayQuery = useInsights();
  const reanchorMut = useReanchor();

  const apiData = todayQuery.data;
  // Drift re-anchor state (see useReanchor). `paused` is a sticky break/pregnant
  // state; `reanchor.show` offers the overdue prompt; `reanchor.acked` switches
  // the copy to the calm "still waiting" line after the user acknowledges.
  const paused = apiData?.status === 'paused';
  const reanchor = apiData?.reanchor as { show?: boolean; acked?: boolean } | undefined;
  const safeInsights = apiData?.insights || {};
  // Keep showing cached results during a background refetch (stale-while-
  // revalidate). Blanking this on isFetching caused the Log CTA to flash before
  // results whenever the page was revisited after the 5-minute staleTime.
  const dailyLogDone = apiData?.dailyLogDone ?? false;

  const activeStatus: FertilityStatus = (apiData?.status as FertilityStatus) || 'not_fertile';
  const status = STATUS_CONFIG[activeStatus] || STATUS_CONFIG['not_fertile'];

  const todayData = safeInsights['today'];
  const phase = todayData?.phase || '';
  const lostTrack = todayData?.lostTrack || false;
  const signals = todayData?.confidence?.signals || {};

  const cycle = todayData?.cycle;

  const confidenceLabel = todayData?.confidence?.label || '';
  const confidenceMessage = todayData?.confidence?.message || '';

  const notifications: string[] = todayData?.notifications || [];
  const dynamicSubtitle = notifications[0] || status.fallbackSubtitle;

  const sourceText: string = todayData?.sourceText || '';
  const basisShort = BASIS_SHORT[sourceText] || 'Calendar';

  const lastUpdatedText = formatRelativeTime(apiData?.lastModified);

  // First load with nothing cached yet: show a neutral state rather than the Log
  // CTA, which would otherwise flash before the initial fetch resolves.
  if (todayQuery.isLoading) {
    return (
      <div className="h-full bg-background font-sans flex flex-col">
        <Header />
        <div
          className={cn(
            'flex-1 flex items-center justify-center',
            !brandingVisible && 'pt-10 sm:pt-12'
          )}
        >
          <div className="text-sm text-zinc-400 dark:text-zinc-600 animate-pulse">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background font-sans flex flex-col">
      <Header />

      <div
        className={cn(
          'flex-1 flex flex-col w-full min-h-0 overflow-y-auto',
          !brandingVisible && 'pt-10 sm:pt-12'
        )}
      >
        {paused ? (
          /* ── Tracking paused (break / pregnant) ── */
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-7">
              <Pause className="h-7 w-7 text-zinc-400 dark:text-zinc-500" strokeWidth={2.5} />
            </div>

            <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-zinc-900 dark:text-white leading-[1.1]">
              Tracking paused
            </h1>

            <p className="text-[15px] text-zinc-400 dark:text-zinc-600 mt-3 max-w-[270px] leading-relaxed">
              Predictions are off while you're on a break. Log a period and we'll pick back up.
            </p>

            <button
              onClick={() => navigate('/log')}
              className="mt-8 px-9 py-3.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 text-[15px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 active:scale-[0.98] transition-transform"
            >
              Log Today
              <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
            </button>
          </div>
        ) : !dailyLogDone || lostTrack ? (
          /* ── Not Logged / Overdue Cycle (Lost Track) — also hosts the drift re-anchor prompt ── */
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <img
              src="/logo.png"
              alt="App Logo"
              width={80}
              height={80}
              decoding="sync"
              fetchPriority="high"
              className="w-20 h-20 object-contain mix-blend-multiply dark:mix-blend-normal mb-8"
            />

            <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-zinc-900 dark:text-white leading-[1.1]">
              How are you
              <br />
              feeling today?
            </h1>

            <p className="text-[15px] text-zinc-400 dark:text-zinc-600 mt-3 max-w-[230px] leading-relaxed">
              {reanchor?.acked
                ? "Still waiting on your period — we'll keep today open."
                : lostTrack
                  ? "You're past your usual cycle length. Log today to refresh your predictions."
                  : "Log your symptoms to see today's fertility status."}
            </p>

            <button
              onClick={() => navigate('/log')}
              className="mt-8 px-9 py-3.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 text-[15px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 active:scale-[0.98] transition-transform"
            >
              Log Today
              <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
            </button>

            {reanchor?.show && (
              <div className="mt-5 flex items-center justify-center gap-4">
                <button
                  onClick={() => reanchorMut.mutate('late')}
                  disabled={reanchorMut.isPending}
                  className="text-[13px] font-medium text-[#007AFF] dark:text-[#0A84FF] active:opacity-70 disabled:opacity-60 transition-opacity"
                >
                  Still no period
                </button>
                <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                <button
                  onClick={() => reanchorMut.mutate('paused')}
                  disabled={reanchorMut.isPending}
                  className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500 active:opacity-70 disabled:opacity-60 transition-opacity"
                >
                  Pause tracking
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Hero ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center min-h-[280px]">
              {phase && (
                <div
                  className={cn(
                    'flex items-center gap-2 mb-4 text-[12px] font-bold uppercase tracking-[0.1em]',
                    status.accent
                  )}
                >
                  <div className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                  {phase}
                </div>
              )}

              <h1 className="text-[42px] font-extrabold tracking-[-0.05em] leading-none text-zinc-900 dark:text-white">
                {status.title}
              </h1>

              <p className="text-[15px] text-zinc-500 dark:text-zinc-500 mt-3 max-w-[260px] leading-relaxed">
                {dynamicSubtitle}
              </p>
            </div>

            <div className="flex flex-col gap-5 pb-[var(--inset-gap)]">
              {/* View Calendar CTA */}
              <div className="-mb-2 mt-1 flex justify-center">
                <button
                  onClick={() => navigate('/chart')}
                  className="group inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/70 py-1.5 pl-2 pr-3 shadow-sm backdrop-blur-xl transition-all hover:bg-card hover:shadow active:scale-95"
                >
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-400/10">
                    <CalendarDays
                      className="h-[13px] w-[13px] text-blue-600 dark:text-blue-400"
                      strokeWidth={2.5}
                    />
                  </span>
                  <span className="text-[13px] font-medium tracking-tight text-zinc-700 dark:text-zinc-200">
                    View Full Calendar
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-zinc-600" />
                </button>
              </div>

              {cycle?.day && cycle?.length && (
                <CycleLine
                  day={cycle.day}
                  length={cycle.length}
                  fertileStartDay={cycle.fertileStartDay ?? null}
                  fertileEndDay={cycle.fertileEndDay ?? null}
                  nextPeriodDateStr={cycle.nextPeriodDateStr ?? null}
                  fertileStartDateStr={cycle.fertileStartDateStr ?? null}
                  fertileEndDateStr={cycle.fertileEndDateStr ?? null}
                  lastUpdatedText={lastUpdatedText}
                />
              )}

              {/* ── Insights Card ── */}
              <InsetGroup containerClassName="mb-0">
              {/* Stats row */}
              <div className="flex">
                <div className="flex-1 py-4 pl-4">
                  <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.06em] mb-1">
                    Confidence
                  </div>
                  <div className="text-[17px] font-bold text-zinc-800 dark:text-zinc-100 tracking-tight leading-tight">
                    {confidenceLabel || '—'}
                  </div>
                </div>
                <div className="w-px self-stretch my-3 bg-zinc-100 dark:bg-zinc-800/80" />
                <div className="flex-1 pl-4 py-4 pr-4">
                  <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.06em] mb-1">
                    Basis
                  </div>
                  <div className="text-[17px] font-bold text-zinc-800 dark:text-zinc-100 tracking-tight leading-tight">
                    {basisShort}
                  </div>
                </div>
              </div>

              {/* Signals */}
              <div className="mb-4 mx-4 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                <div className="flex items-center justify-between">
                  {SIGNAL_KEYS.map(({ key, label }, i) => {
                    const active = Boolean(signals[key]);
                    return (
                      <React.Fragment key={key}>
                        <div className="flex items-center gap-1.5">
                          {active && (
                            <svg
                              viewBox="0 0 12 12"
                              className="h-2.5 w-2.5 text-[#007AFF] dark:text-[#0A84FF] mt-0.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M2.4 6.3 L4.9 8.8 L9.6 3.4" />
                            </svg>
                          )}
                          <span
                            className={cn(
                              'text-[13px] font-semibold transition-colors',
                              active
                                ? 'text-zinc-800 dark:text-zinc-100'
                                : 'text-zinc-400 dark:text-zinc-500'
                            )}
                          >
                            {label}
                          </span>
                        </div>
                        {i < SIGNAL_KEYS.length - 1 && (
                          <span className="w-px h-3 bg-zinc-100 dark:bg-zinc-800/60" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Confidence context */}
              {confidenceMessage && (
                <div className="pb-3.5 px-4 -mt-1">
                  <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {confidenceMessage}
                  </p>
                </div>
              )}
            </InsetGroup>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
