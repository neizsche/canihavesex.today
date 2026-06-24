import type { BillingStatus } from '@/hooks/queries/useBillingStatus';

/** "Jun 24, 2026" — calm absolute date for billing copy. */
export function formatBillingDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Whole days from now until `iso` (0 if already past). Null when no date. */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/**
 * One-line plan status, calm and plain-spoken. Shared by the identity card on
 * the main Settings screen and the Subscription row on the Account screen so
 * they never drift.
 */
export function summarizeBilling(billing: BillingStatus): string {
  const { state, plan, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd } = billing;
  const isDemo = state === 'demo';
  const isActivePaid = state === 'active';
  const isYearly = isActivePaid && plan === 'yearly';
  // The shared demo account is exempt from billing — present it as lifetime.
  const isLifetime = (isActivePaid && plan === 'lifetime') || isDemo;

  if (isLifetime) return 'Lifetime · yours forever';
  if (isYearly) {
    if (cancelAtPeriodEnd) {
      return currentPeriodEnd
        ? `Cancels ${formatBillingDate(currentPeriodEnd)}`
        : 'Cancels at period end';
    }
    return currentPeriodEnd ? `Yearly · renews ${formatBillingDate(currentPeriodEnd)}` : 'Yearly';
  }
  if (state === 'trialing') {
    const left = daysUntil(trialEndsAt);
    return left !== null ? `Free trial · ${left} day${left === 1 ? '' : 's'} left` : 'Free trial';
  }
  if (state === 'expired') return 'Trial ended';
  return 'No active plan';
}
