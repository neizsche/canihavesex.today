import { useInsights } from '@/hooks/queries/useInsights';
import {
  resolveStatusConfig,
  type Cycle,
  type InsightNote,
  type InsightsResponse,
  type StatusConfig,
  type TodayInsight,
} from './todayShared';

export interface TodayModel {
  isLoading: boolean;
  status: StatusConfig;
  paused: boolean;
  reanchor?: { show?: boolean; acked?: boolean };
  dailyLogDone: boolean;
  lostTrack: boolean;
  phase: string;
  cycle?: Cycle;
  notes: InsightNote[];
  dynamicSubtitle: string;
  /** True when the headline is a warning — drives the amber subtitle treatment. */
  subtitleWarn: boolean;
  today?: TodayInsight;
}

/**
 * Single source of truth for the Today screen and its insights sheet: fetches
 * the insights payload once (React Query dedupes the request across consumers)
 * and derives the shared view-model both surfaces render from.
 */
export function useTodayModel(): TodayModel {
  const query = useInsights();
  const data: InsightsResponse | undefined = query.data;

  const today = data?.insights?.today;
  const status = resolveStatusConfig(data?.status);
  const headline = today?.headline;

  return {
    isLoading: query.isLoading,
    status,
    paused: data?.status === 'paused',
    reanchor: data?.reanchor,
    dailyLogDone: data?.dailyLogDone ?? false,
    lostTrack: today?.lostTrack ?? false,
    phase: today?.phase ?? '',
    cycle: today?.cycle,
    notes: today?.notes ?? [],
    dynamicSubtitle: headline?.text || status.fallbackSubtitle,
    subtitleWarn: headline?.kind === 'warn',
    today,
  };
}
