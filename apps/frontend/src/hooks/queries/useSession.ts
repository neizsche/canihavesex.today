import { useQuery } from '@tanstack/react-query';
import { apiJson, UnauthorizedError } from '@/lib/api';

export interface SessionData {
  userId: string;
  email?: string | null;
  onboardingCompleted?: boolean;
}

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => apiJson<SessionData>('/api/session'),
    retry: (failureCount, error) => {
      if (error instanceof UnauthorizedError) return false;
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
