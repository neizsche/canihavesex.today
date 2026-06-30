// Cloud-only billing entitlement logic. Self-hosters never set ENABLE_CLOUD_BILLING,
// so isBillingEnabled is strictly false and this module returns un-gated
// access. If cloud billing is on, the user must have an active subscription or
// be within their trial period.

import { isSelfHost } from './config.js';

export type Plan = 'yearly' | 'lifetime';
export type SubStatus = 'active' | 'canceled' | 'past_due';

/**
 * Whether the cloud paywall is active. Requires ENABLE_CLOUD_BILLING=true AND that
 * the instance is not self-hosted. (The free self-hosted edition that
 * also sets ENABLE_CLOUD_BILLING still gets no gating, no provider, no billing
 * emails, etc.)
 */
export function isBillingEnabled(): boolean {
  return process.env.ENABLE_CLOUD_BILLING === 'true' && !isSelfHost();
}

/**
 * Gets the number of days a new user gets for free before they must pay.
 * Set CLOUD_BILLING_TRIAL_DAYS=0 for no trial — new users are blocked until they pay.
 * Defaults to 14 days if not set.
 */
export function trialDays(): number {
  const n = Number(process.env.CLOUD_BILLING_TRIAL_DAYS);
  return Number.isFinite(n) && n >= 0 ? n : 14;
}

export function trialMs(): number {
  return trialDays() * 24 * 60 * 60 * 1000;
}

/** Minimal view of a subscription the entitlement rules care about. */
export interface SubscriptionView {
  plan: Plan;
  status: SubStatus;
  /** ms epoch; null means lifetime (never expires). */
  currentPeriodEnd: number | null;
}

export interface EntitlementInput {
  /** ms epoch of the user's signup — start of the free trial. */
  userCreatedAt: number;
  /** The demo account is always exempt from the paywall. */
  isDemo: boolean;
  /** The user's most relevant subscription, or null if they never paid. */
  subscription: SubscriptionView | null;
  now: number;
  trialMs: number;
}

export type EntitlementState =
  | 'demo' // exempt shared demo account
  | 'active' // paid (yearly within period, or lifetime)
  | 'trialing' // inside the free trial window
  | 'expired' // trial ended and a previous subscription has lapsed
  | 'none'; // trial ended, never subscribed

export interface Entitlement {
  entitled: boolean;
  state: EntitlementState;
  plan: Plan | null;
  /** ms epoch the trial ends (always computed, useful for UI countdown). */
  trialEndsAt: number | null;
  /** ms epoch the paid period ends (yearly), or null. */
  currentPeriodEnd: number | null;
}

/**
 * Decide whether a user may use the cloud app. Order of precedence:
 *   1. demo account → always in
 *   2. active paid subscription (lifetime, or yearly still within its period)
 *   3. free trial still running
 *   4. otherwise blocked (expired if they once paid, else none)
 */
export function evaluateEntitlement(input: EntitlementInput): Entitlement {
  const { userCreatedAt, isDemo, subscription, now } = input;

  if (isDemo) {
    return { entitled: true, state: 'demo', plan: null, trialEndsAt: null, currentPeriodEnd: null };
  }

  const trialEndsAt = userCreatedAt + input.trialMs;

  if (subscription && subscription.status === 'active') {
    if (subscription.plan === 'lifetime') {
      return {
        entitled: true,
        state: 'active',
        plan: 'lifetime',
        trialEndsAt,
        currentPeriodEnd: null,
      };
    }
    // yearly: entitled only while still inside the paid period.
    if (subscription.currentPeriodEnd !== null && subscription.currentPeriodEnd > now) {
      return {
        entitled: true,
        state: 'active',
        plan: 'yearly',
        trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    }
  }

  if (now < trialEndsAt) {
    return {
      entitled: true,
      state: 'trialing',
      plan: subscription?.plan ?? null,
      trialEndsAt,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    };
  }

  return {
    entitled: false,
    state: subscription ? 'expired' : 'none',
    plan: subscription?.plan ?? null,
    trialEndsAt,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
  };
}
