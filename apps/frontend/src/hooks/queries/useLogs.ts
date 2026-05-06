import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';

export function useLog(date: string) {
  return useQuery({
    queryKey: ['log-day', date],
    queryFn: () => apiJson<{ found: boolean; payload?: any; minDate?: string; suggestion?: any; }>(`/api/v1/logs/${date}`),
    enabled: !!date,
    staleTime: 0, // Always fetch fresh for the editor
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
    // Optimistic Update
    onMutate: async ({ date, payload }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['log-day', date] });

      // Snapshot the previous value
      const previousLog = queryClient.getQueryData(['log-day', date]);

      // Optimistically update to the new value
      queryClient.setQueryData(['log-day', date], (old: any) => ({
        ...old,
        found: true,
        payload
      }));

      return { previousLog };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, { date }, context: any) => {
      if (context?.previousLog) {
        queryClient.setQueryData(['log-day', date], context.previousLog);
      }
    },
    // Always refetch after error or success to guarantee sync
    onSettled: (_, __, { date }) => {
      queryClient.invalidateQueries({ queryKey: ['log-day', date] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['user-status'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
