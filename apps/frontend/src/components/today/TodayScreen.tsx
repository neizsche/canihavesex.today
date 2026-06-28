import * as React from 'react';

import { cn } from '@/lib/utils';
import { Header } from '@/components/common/Header';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { useNavigation } from '@/hooks/useNavigation';
import { useInsights } from '@/hooks/queries/useInsights';
import { useReanchor } from '@/hooks/queries/useReanchor';
import { TodayLogPromptState } from './TodayLogPromptState';
import { TodayPausedState } from './TodayPausedState';
import { TodayReadyState } from './TodayReadyState';

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

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Updated Just now';
  const diffInMinutes = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diffInMinutes < 1) return 'Updated Just now';
  if (diffInMinutes < 60)
    return `Updated ${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
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
          <TodayPausedState onLogToday={() => navigate('/log')} />
        ) : !dailyLogDone || lostTrack ? (
          <TodayLogPromptState
            lostTrack={lostTrack}
            reanchor={reanchor}
            reanchorPending={reanchorMut.isPending}
            onLogToday={() => navigate('/log')}
            onStillNoPeriod={() => reanchorMut.mutate('late')}
            onPauseTracking={() => reanchorMut.mutate('paused')}
          />
        ) : (
          <TodayReadyState
            phase={phase}
            statusTitle={status.title}
            statusAccent={status.accent}
            statusDot={status.dot}
            dynamicSubtitle={dynamicSubtitle}
            onViewCalendar={() => navigate('/chart')}
            cycle={cycle}
            lastUpdatedText={lastUpdatedText}
            confidenceLabel={confidenceLabel}
            basisShort={basisShort}
            signals={signals}
            confidenceMessage={confidenceMessage}
          />
        )}
      </div>
    </div>
  );
}
