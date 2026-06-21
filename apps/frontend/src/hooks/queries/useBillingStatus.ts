import { useQuery } from '@tanstack/react-query';
import { apiJson, UnauthorizedError } from '@/lib/api';

export type BillingState = 'disabled' | 'demo' | 'active' | 'trialing' | 'expired' | 'none';
export type BillingPlan = 'yearly' | 'lifetime' | null;

export interface BillingStatus {
  billingEnabled: boolean;
  entitled: boolean;
  state: BillingState;
  plan: BillingPlan;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  /** True when an active recurring plan is set to stop renewing at period end. */
  cancelAtPeriodEnd: boolean;
}

export function useBillingStatus() {
  return useQuery<BillingStatus>({
    queryKey: ['billing-status'],
    queryFn: () => apiJson<BillingStatus>('/api/billing/status'),
    retry: (failureCount, error) => {
      if (error instanceof UnauthorizedError) return false;
      return failureCount < 2;
    },
    staleTime: 60_000,
  });
}
