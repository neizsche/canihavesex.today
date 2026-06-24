import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';

export type ReanchorKind = 'late' | 'skipped' | 'paused';

// Drift correction from the Today screen. `late`/`skipped` acknowledge an
// overdue period (stops the nag, stays unsure); `paused` sets the sticky
// break/pregnant state (cleared only by logging a period — no resume API).
// Engine output is unchanged — this only drives Today's copy — so we just
// refetch Today on success.
export function useReanchor() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, Error, ReanchorKind>({
    mutationFn: (kind) =>
      apiJson<{ ok: boolean }>('/api/v1/cycle/reanchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', 'today'] });
    },
  });
}
