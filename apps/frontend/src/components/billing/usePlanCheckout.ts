import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import type { PaidPlan } from './plans';

/**
 * Custom hook providing handlers for starting checkout, redirecting to the customer portal,
 * and canceling active subscriptions.
 */
export function usePlanCheckout() {
  const queryClient = useQueryClient();
  const [checkoutBusy, setCheckoutBusy] = React.useState<PaidPlan | null>(null);
  const [portalBusy, setPortalBusy] = React.useState(false);
  const [cancelBusy, setCancelBusy] = React.useState(false);

  async function startCheckout(plan: PaidPlan) {
    setCheckoutBusy(plan);
    try {
      const { url } = await apiJson<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      window.location.href = url;
    } catch {
      alert('Could not start checkout. Please try again.');
      setCheckoutBusy(null);
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    try {
      const { url } = await apiJson<{ url: string }>('/api/billing/portal', { method: 'POST' });
      window.open(url, '_blank');
    } catch {
      alert('Could not open billing portal. Please try again.');
    }
    setPortalBusy(false);
  }

  // Cancels the active subscription at the end of the billing cycle.
  // Refetches the billing-status query to update the UI. Returns a boolean indicating success.
  async function cancelSubscription(): Promise<boolean> {
    setCancelBusy(true);
    try {
      await apiJson('/api/billing/cancel', { method: 'POST' });
      await queryClient.invalidateQueries({ queryKey: ['billing-status'] });
      return true;
    } catch {
      alert('Could not cancel your subscription. Please try again.');
      return false;
    } finally {
      setCancelBusy(false);
    }
  }

  return { checkoutBusy, portalBusy, cancelBusy, startCheckout, openPortal, cancelSubscription };
}
