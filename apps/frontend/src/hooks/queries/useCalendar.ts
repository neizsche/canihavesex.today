import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { toIsoDate } from '@/lib/date';

export type CalendarStatus = 'period' | 'fertile' | 'safe' | 'unsure';

export interface CalendarDay {
  date: string;
  status: CalendarStatus;
  ovulationConfirmed: boolean;
  isToday: boolean;
}

interface CalendarResponse {
  days: CalendarDay[];
  quickStats: unknown;
  minDate?: string;
}

/**
 * Fetch the calendar month that contains `date`. Uses the same query key and
 * fetcher as the calendar screen so cache is shared — navigating from a coloured
 * calendar cell into the log shows the status instantly (no extra round-trip).
 */
export function useCalendarMonth(date: string) {
  const [y, m] = date.split('-').map(Number);
  const start = toIsoDate(new Date(y, m - 1, 1));
  const end = toIsoDate(new Date(y, m, 0));
  return useQuery({
    queryKey: ['calendar', start, end],
    queryFn: () => apiJson<CalendarResponse>(`/api/v1/insights/calendar?start=${start}&end=${end}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!date,
  });
}

/** The calendar status for a single day, or null if not loaded / unknown. */
export function useCalendarDayStatus(date: string): CalendarStatus | null {
  const query = useCalendarMonth(date);
  return query.data?.days.find((d) => d.date === date)?.status ?? null;
}
