import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import type { PaidPlan } from './plans';

/**
 * Shared billing actions used by both the Settings subscription card and the
 * full-screen paywall: start a hosted Dodo checkout, open the customer portal,
 * or cancel an active recurring subscription.
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

  // Cancel the active yearly subscription at period end. Access continues until
  // the current period ends; we refetch billing status so the card flips to
  // "Cancels on X". Returns true on success so the caller can react.
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
