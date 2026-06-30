import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BillingStatus } from '@/hooks/queries/useBillingStatus';

export type BillingReturnPhase = 'idle' | 'verifying' | 'problem';

/**
 * Reads the outcome of a Dodo checkout from the redirect query params. Dodo
 * appends `status` (succeeded/active on success) plus `payment_id` or
 * `subscription_id`. Returns 'success' / 'failed' / null (not a checkout return).
 * The redirect is only a UX hint — it never grants access; the webhook does.
 */
function readCheckoutReturn(): 'success' | 'failed' | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const hasId = params.has('payment_id') || params.has('subscription_id');
  if (!status || !hasId) return null;
  // Dodo success signals: 'succeeded' (one-time) and 'active' (subscription).
  return status === 'succeeded' || status === 'active' ? 'success' : 'failed';
}

/** Strip the checkout query params so a refresh doesn't re-trigger the flow. */
function clearCheckoutParams(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
}

/**
 * Handles the return from a Dodo checkout.
 *
 * On success the subscription is activated asynchronously by the webhook, so the
 * cached billing status is still "blocked" here; we poll entitlement until it
 * flips on (covering webhook lag) and then route to Today. On a failed/cancelled
 * payment — or if the webhook never lands — we surface a 'problem' state instead
 * of silently dropping back to the Paywall. Access is only ever granted by the
 * webhook, never by the redirect.
 */
export function useBillingReturn(): { phase: BillingReturnPhase; dismiss: () => void } {
  const queryClient = useQueryClient();
  const [phase, setPhase] = React.useState<BillingReturnPhase>(() => {
    const outcome = readCheckoutReturn();
    if (outcome === 'success') return 'verifying';
    if (outcome === 'failed') return 'problem';
    return 'idle';
  });

  // Clear the params once, after we've captured the outcome into state.
  React.useEffect(() => {
    if (phase !== 'idle') clearCheckoutParams();
    // Only on mount — phase transitions below manage their own URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (phase !== 'verifying') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const MAX_ATTEMPTS = 10; // ~15s total at 1.5s spacing — enough for webhook lag.

    async function tick() {
      if (cancelled) return;
      attempts += 1;
      await queryClient.refetchQueries({ queryKey: ['billing-status'] });
      if (cancelled) return;

      const data = queryClient.getQueryData<BillingStatus>(['billing-status']);
      if (data?.entitled) {
        window.location.hash = '#/today';
        setPhase('idle');
        return;
      }
      if (attempts >= MAX_ATTEMPTS) {
        // Charged but not yet activated (or it failed). Be honest rather than
        // silently dumping them back on the Paywall.
        setPhase('problem');
        return;
      }
      timer = setTimeout(tick, 1500);
    }

    timer = setTimeout(tick, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, queryClient]);

  const dismiss = React.useCallback(() => {
    setPhase('idle');
    window.location.hash = '#/settings';
  }, []);

  return { phase, dismiss };
}
