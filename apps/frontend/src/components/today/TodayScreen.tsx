import * as React from 'react';
import { Activity, ChevronRight, Droplets, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Header } from '@/components/common/Header';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { useNavigation } from '@/hooks/useNavigation';
import { useInsights } from '@/hooks/queries/useInsights';
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

export function TodayScreen() {
  const { navigate } = useNavigation();
  const { showBranding: brandingVisible } = useDiscreetMode();
  const todayQuery = useInsights();

  const apiData = todayQuery.data;
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


        {!dailyLogDone || lostTrack ? (
          /* ── Not Logged / Overdue Cycle (Lost Track) ── */
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
              {lostTrack
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

            {cycle?.day && cycle?.length && (
              <CycleLine
                day={cycle.day}
                length={cycle.length}
                daysToNextPeriod={cycle.daysToNextPeriod ?? null}
                fertileStartDay={cycle.fertileStartDay ?? null}
                fertileEndDay={cycle.fertileEndDay ?? null}
              />
            )}

            {/* ── Stats Strip ── */}
            <div className="flex border-t border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex-1 text-center py-4 border-r border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {confidenceLabel || '—'}
                </div>
                <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.08em] mt-0.5">
                  Confidence
                </div>
              </div>
              <div className="flex-1 text-center py-4">
                <div className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {basisShort}
                </div>
                <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.08em] mt-0.5">
                  Basis
                </div>
              </div>
            </div>

            {/* ── Confidence context ── */}
            {confidenceMessage && (
              <div className="text-center py-3 px-6">
                <p className="text-[12px] font-medium text-zinc-400 dark:text-zinc-600">
                  {confidenceMessage}
                </p>
              </div>
            )}

            {/* ── Signals ── */}
            <div className="flex gap-2 justify-center py-3 px-6 flex-wrap">
              {SIGNAL_KEYS.map(({ key, label }) => {
                const active = Boolean(signals[key]);
                return (
                  <span
                    key={key}
                    className={cn(
                      'text-[12px] font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors',
                      active
                        ? cn(status.chipBg, status.chipText)
                        : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        active ? status.dot : 'bg-zinc-300 dark:bg-zinc-600'
                      )}
                    />
                    {label}
                  </span>
                );
              })}
            </div>

            {/* ── Actions ── */}
            <div className="px-6 pb-8 pt-2 flex flex-col gap-px">
              {[
                {
                  label: 'Log Symptoms',
                  icon: Activity,
                  color: 'text-rose-500',
                  to: '/log' as const,
                },
                {
                  label: 'View Trends',
                  icon: TrendingUp,
                  color: 'text-[#007AFF]',
                  to: '/chart' as const,
                },
              ].map(({ label, icon: Icon, color, to }, i, arr) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className={cn(
                    'flex items-center gap-3.5 px-5 py-4 bg-white dark:bg-[#1C1C1E] text-left active:scale-[0.99] transition-transform',
                    i === 0 && 'rounded-t-[14px]',
                    i === arr.length - 1 && 'rounded-b-[14px]'
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px]', color)} strokeWidth={2.5} />
                  <span className="flex-1 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
