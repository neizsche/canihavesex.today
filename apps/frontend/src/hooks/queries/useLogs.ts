import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';

export function useLog(date: string) {
  return useQuery({
    queryKey: ['log-day', date],
    queryFn: () => apiJson<{ found: boolean; payload?: any; minDate?: string; suggestion?: any; }>(`/api/v1/logs/${date}`),
    enabled: !!date,
    staleTime: 30_000,
  });
}

export function useSaveLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, payload }: { date: string; payload: any }) =>
      apiJson<any>(`/api/v1/logs/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['log-day', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['user-status'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
