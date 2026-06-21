import type { Db } from '../db.js';
import type { Plan, SubStatus } from '../entitlement.js';
import type { NormalizedSubscriptionEvent } from '../billing/PaymentProvider.js';

export interface Subscription {
  id: string;
  user_id: string;
  /** Payment provider that owns this row (e.g. 'dodo'). Keeps the model portable. */
  provider: string;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  plan: Plan;
  status: SubStatus;
  current_period_end: string | null; // ISO; null = lifetime
  /** True once a cancel-at-period-end has been requested on a recurring plan. */
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Postgres-backed store for cloud billing subscriptions (migration v5). The
 * provider webhook upserts rows here keyed on provider_subscription_id; the
 * entitlement gate reads a user's active subscription. Provider-agnostic by
 * design — see the column-naming note in the migration.
 */
export class SubscriptionRepository {
  constructor(private db: Db) {}

  /**
   * The subscription that decides a user's access: a lifetime purchase wins,
   * otherwise the active row with the furthest-out paid period. Returns
   * undefined when the user has no active subscription.
   */
  async findActiveByUser(userId: string): Promise<Subscription | undefined> {
    const rows = await this.db.query<Subscription>(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY (plan = 'lifetime') DESC, current_period_end DESC NULLS LAST
       LIMIT 1`,
      [userId],
    );
    return rows[0];
  }

  /**
   * The user's active recurring (yearly) subscription, if any. Used to cancel —
   * directly (the in-app cancel button) or automatically when a lifetime upgrade
   * lands. Only rows with a provider_subscription_id are returned, since that id
   * is what the provider cancel call needs.
   */
  async findActiveYearlyByUser(userId: string): Promise<Subscription | undefined> {
    const rows = await this.db.query<Subscription>(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND plan = 'yearly'
         AND provider_subscription_id IS NOT NULL
       ORDER BY current_period_end DESC NULLS LAST
       LIMIT 1`,
      [userId],
    );
    return rows[0];
  }

  /**
   * Flag a recurring subscription as canceling at period end. Cosmetic only —
   * the row stays active until the provider's expiry webhook lands — so the UI
   * can show "Cancels on X". Idempotent: keyed on the external subscription id.
   */
  async markCancelAtPeriodEnd(providerSubscriptionId: string): Promise<void> {
    await this.db.query(
      `UPDATE subscriptions SET cancel_at_period_end = true
       WHERE provider_subscription_id = $1`,
      [providerSubscriptionId],
    );
  }

  /**
   * The provider customer id to open a billing portal for. Takes the most
   * recent row that has one, regardless of status, so a past-due or
   * cancel-pending user can still reach the portal to fix or cancel. Returns
   * undefined when the user has never had a provider customer.
   */
  async findCustomerIdByUser(userId: string): Promise<string | undefined> {
    const rows = await this.db.query<{ provider_customer_id: string | null }>(
      `SELECT provider_customer_id FROM subscriptions
       WHERE user_id = $1 AND provider_customer_id IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId],
    );
    return rows[0]?.provider_customer_id ?? undefined;
  }

  /**
   * Apply a normalized provider webhook event. Idempotent: webhooks retry, so we
   * upsert on provider_subscription_id (the external id; for one-time lifetime
   * the adapter supplies the payment id there). Returns nothing — the gate reads
   * fresh on the next request.
   *
   * Providers don't guarantee delivery order, so the conflict update is GUARDED:
   *   - 'canceled' is terminal — once a subscription has expired we never let a
   *     stale 'active'/'renewed' redelivery flip it back on;
   *   - a canceling event (status 'canceled') always wins over a non-canceled
   *     row, regardless of its period date, so a revoke is never dropped;
   *   - any other event only applies if it moves current_period_end forward (a
   *     lifetime/null period, or a period at least as far out as the stored one),
   *     so a stale 'active' can't undo a 'past_due' or rewind the paid term.
   * A guarded-out conflict is a silent no-op — exactly the "ignore stale" we want.
   * cancel_at_period_end is reset to false whenever a fresh 'active' event lands,
   * so a reactivation clears a previously-requested cancel.
   */
  async upsertFromEvent(e: NormalizedSubscriptionEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO subscriptions
         (user_id, provider, provider_subscription_id, provider_customer_id,
          plan, status, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (provider_subscription_id) DO UPDATE SET
         provider_customer_id = EXCLUDED.provider_customer_id,
         plan                 = EXCLUDED.plan,
         status               = EXCLUDED.status,
         current_period_end   = EXCLUDED.current_period_end,
         cancel_at_period_end = CASE WHEN EXCLUDED.status = 'active'
                                       THEN false
                                       ELSE subscriptions.cancel_at_period_end END
       WHERE subscriptions.status <> 'canceled'
         AND (
           EXCLUDED.status = 'canceled'
           OR EXCLUDED.current_period_end IS NULL
           OR subscriptions.current_period_end IS NULL
           OR EXCLUDED.current_period_end >= subscriptions.current_period_end
         )`,
      [
        e.userId,
        e.provider,
        e.providerSubscriptionId,
        e.providerCustomerId,
        e.plan,
        e.status,
        e.currentPeriodEnd,
      ],
    );
  }
}
