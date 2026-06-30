import type { Db } from '../db.js';
import type { BillingEventRecord } from '../billing/PaymentProvider.js';

/**
 * Append-only audit of payment outcomes (migration v7). The provider webhook
 * records every verified success/failure here, independent of subscription
 * state. Idempotent on provider_event_id so webhook retries don't duplicate
 * rows. Provider-agnostic by design — see the migration note.
 */
export class BillingEventRepository {
  constructor(private db: Db) {}

  /**
   * Record a payment outcome. No-op if this provider event was already stored.
   * Returns true when this call inserted a NEW row, false when it was a duplicate
   * (a webhook retry). Callers use that to fire side effects — like the purchase
   * confirmation email — exactly once per event.
   */
  async record(e: BillingEventRecord): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO billing_events
         (user_id, provider, provider_event_id, event_type, outcome, plan,
          provider_payment_id, provider_subscription_id, amount_cents, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (provider_event_id) DO NOTHING
       RETURNING id`,
      [
        e.userId,
        e.provider,
        e.providerEventId,
        e.eventType,
        e.outcome,
        e.plan,
        e.providerPaymentId,
        e.providerSubscriptionId,
        e.amountCents,
        e.currency,
      ]
    );
    return rows.length > 0;
  }
}
