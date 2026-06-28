import * as React from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { toIsoDate } from '@/lib/date';
import type { CalendarDayData } from '@/lib/calendar-cell';

interface CalendarResponse {
  days: CalendarDayData[];
  minDate?: string;
}

interface UseChartDataOptions {
  currentYear: number;
  currentMonth: number;
}

export function useChartData({ currentYear, currentMonth }: UseChartDataOptions) {
  const queryClient = useQueryClient();

  const calendarOptions = React.useCallback((year: number, month: number) => {
    const start = toIsoDate(new Date(year, month, 1));
    const end = toIsoDate(new Date(year, month + 1, 0));
    return {
      queryKey: ['calendar', start, end],
      queryFn: async () =>
        apiJson<CalendarResponse>(`/api/v1/insights/calendar?start=${start}&end=${end}`),
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    };
  }, []);

  const calendarQuery = useQuery({
    ...calendarOptions(currentYear, currentMonth),
    placeholderData: keepPreviousData,
  });

  React.useEffect(() => {
    for (const offset of [-1, 1]) {
      const d = new Date(currentYear, currentMonth + offset, 1);
      void queryClient.prefetchQuery(calendarOptions(d.getFullYear(), d.getMonth()));
    }
  }, [currentYear, currentMonth, queryClient, calendarOptions]);

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: async () => apiJson<any>('/api/v1/insights/stats'),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const loading = calendarQuery.isLoading || statsQuery.isLoading;
  const data = calendarQuery.data || { days: [], minDate: null };
  const statsData = statsQuery.data?.history || [];

  return {
    loading,
    data,
    statsData,
    statsQuery,
  };
}
