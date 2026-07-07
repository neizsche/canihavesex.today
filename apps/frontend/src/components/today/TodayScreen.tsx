import * as React from 'react';

import { cn } from '@/lib/utils';
import { Header } from '@/components/common/Header';
import { Spinner } from '@/components/common/ui/spinner';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { useNavigation } from '@/hooks/useNavigation';
import { useReanchor } from '@/hooks/queries/useReanchor';
import { TodayLogPromptState } from './TodayLogPromptState';
import { TodayPausedState } from './TodayPausedState';
import { TodayReadyState } from './TodayReadyState';
import { TodayInsightsSheet } from './TodayInsightsSheet';
import { useTodayModel } from './useTodayModel';

export function TodayScreen() {
  const { navigate } = useNavigation();
  const { showBranding: brandingVisible } = useDiscreetMode();
  const {
    isLoading,
    status,
    paused,
    reanchor,
    dailyLogDone,
    lostTrack,
    phase,
    cycle,
    dynamicSubtitle,
    subtitleWarn,
  } = useTodayModel();
  const reanchorMut = useReanchor();
  const [insightsOpen, setInsightsOpen] = React.useState(false);

  // Render placeholder during initial data load to prevent UI flash.
  if (isLoading) {
    return (
      <div className="h-full bg-background font-sans flex flex-col">
        <Header />
        <div
          className={cn(
            'flex-1 flex items-center justify-center',
            !brandingVisible && 'pt-10 sm:pt-12'
          )}
        >
          <Spinner size={28} />
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
            subtitleWarn={subtitleWarn}
            cycle={cycle}
            onViewInsights={() => setInsightsOpen(true)}
          />
        )}
      </div>

      <TodayInsightsSheet isOpen={insightsOpen} onClose={() => setInsightsOpen(false)} />
    </div>
  );
}
