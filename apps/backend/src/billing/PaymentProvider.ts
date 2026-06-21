import type { Plan, SubStatus } from '../entitlement.js';

// The vendor-neutral contract for billing. Everything provider-specific (Dodo
// today, anything else later) lives behind this interface; the webhook route,
// the subscriptions table, the entitlement rules and the gate only ever speak
// the normalized shapes below. Switching providers = a new implementing class
// plus swapping which one the factory constructs — nothing else changes.

/** What the app hands a provider to start a hosted checkout. */
export interface CheckoutRequest {
  userId: string;
  email: string;
  name?: string;
  plan: Plan;
  /** Where the provider returns the customer after payment. */
  returnUrl: string;
}

/**
 * A provider webhook, translated into the only shape the rest of the app cares
 * about: which user, which plan, what state, until when. `providerSubscriptionId`
 * is the external id we upsert on for idempotency — for one-time lifetime
 * purchases the adapter puts the payment id here.
 */
export interface NormalizedSubscriptionEvent {
  userId: string;
  provider: string;
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  plan: Plan;
  status: SubStatus;
  /** ISO; null = lifetime (never expires). */
  currentPeriodEnd: string | null;
}

/** Normalized payment outcome — succeeded or failed. */
export type BillingOutcome = 'succeeded' | 'failed';

/**
 * A verified payment outcome to record in the append-only `billing_events`
 * audit log — every success or failure, whether or not it changed subscription
 * state. `providerEventId` is the provider's stable event id (Standard Webhooks
 * `webhook-id`), the idempotency key against webhook retries.
 */
export interface BillingEventRecord {
  provider: string;
  providerEventId: string | null;
  /** Raw provider event type, e.g. 'payment.succeeded', 'payment.failed'. */
  eventType: string;
  outcome: BillingOutcome;
  userId: string | null;
  plan: Plan | null;
  providerPaymentId: string | null;
  providerSubscriptionId: string | null;
  /** Amount in the smallest currency unit (e.g. cents). Null on non-payment events. */
  amountCents: number | null;
  /** ISO currency code, e.g. 'USD'. Null on non-payment events. */
  currency: string | null;
}

/**
 * Outcome of verifying + parsing a webhook:
 *  - `invalid`      → signature check failed; respond 400.
 *  - `ignored`      → valid but not a subscription state change; respond 200, no-op.
 *  - `subscription` → apply `event` to the DB, respond 200.
 *
 * `log` is present on any verified event that represents a payment success or
 * failure (independent of subscription state) and should be recorded for audit.
 */
export type WebhookResult =
  | { kind: 'invalid' }
  | { kind: 'ignored'; log?: BillingEventRecord }
  | { kind: 'subscription'; event: NormalizedSubscriptionEvent; log?: BillingEventRecord };

export interface PaymentProvider {
  /** Short identifier stored on each subscription row, e.g. 'dodo'. */
  readonly name: string;

  /** Create a hosted checkout and return the URL to redirect the customer to. */
  createCheckout(req: CheckoutRequest): Promise<{ url: string }>;

  /** Create a customer/billing portal session (used for cancellation). */
  createPortalSession(providerCustomerId: string, returnUrl?: string): Promise<{ url: string }>;

  /**
   * Cancel a recurring subscription at the end of its current paid period. No
   * refund and no immediate loss of access — the provider stops renewing and
   * eventually fires an expiry webhook. Used by the in-app cancel button and by
   * the auto-cancel when a yearly subscriber upgrades to lifetime.
   */
  cancelSubscription(providerSubscriptionId: string): Promise<void>;

  /**
   * Verify the raw webhook body against the provider signature headers and
   * translate it into a `WebhookResult`. Must operate on the RAW bytes — never
   * a re-serialized body — so the signature check is exact.
   */
  verifyAndParseWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | undefined>
  ): WebhookResult;
}
