import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';

export function useInsights() {
  return useQuery({
    queryKey: ['insights', 'today'],
    queryFn: () => apiJson<any>('/api/v1/insights/today'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
