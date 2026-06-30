import DodoPayments from 'dodopayments';
import { Webhook } from 'standardwebhooks';
import type {
  BillingEventRecord,
  BillingOutcome,
  CheckoutRequest,
  NormalizedSubscriptionEvent,
  PaymentProvider,
  WebhookResult,
} from './PaymentProvider.js';
import type { Plan, SubStatus } from '../entitlement.js';

/**
 * Dodo Payments adapter. The vendor-specific SDK calls all live here; the rest
 * of the app only speaks the normalized shapes in PaymentProvider.ts. Swapping
 * providers = a new class implementing the same interface.
 *
 * Trial note: the 14-day trial is granted by OUR app (entitlement.ts) from
 * signup; users only reach Dodo checkout after it expires, so the Dodo products
 * carry no trial of their own.
 */
export interface DodoConfig {
  apiKey: string;
  webhookSecret: string;
  environment: 'test_mode' | 'live_mode';
  productIds: Record<Plan, string>;
}

/** Minimal shape of a verified Dodo webhook body (Standard Webhooks envelope). */
interface DodoWebhookBody {
  type: string;
  data: {
    payload_type?: string;
    subscription_id?: string | null;
    payment_id?: string | null;
    next_billing_date?: string | null;
    /** Smallest currency unit (e.g. cents). Present on payment events. */
    total_amount?: number | null;
    currency?: string | null;
    customer?: { customer_id?: string | null } | null;
    product_cart?: Array<{ product_id?: string | null }> | null;
    metadata?: Record<string, string> | null;
  };
}

export class DodoProvider implements PaymentProvider {
  readonly name = 'dodo';

  private readonly client: DodoPayments;
  private readonly webhook: Webhook;

  constructor(private readonly config: DodoConfig) {
    this.client = new DodoPayments({
      bearerToken: config.apiKey,
      environment: config.environment,
    });
    this.webhook = new Webhook(config.webhookSecret);
  }

  async createCheckout(req: CheckoutRequest): Promise<{ url: string }> {
    const session = await this.client.checkoutSessions.create({
      product_cart: [{ product_id: this.config.productIds[req.plan], quantity: 1 }],
      customer: { email: req.email, ...(req.name ? { name: req.name } : {}) },
      return_url: req.returnUrl,
      // Round-trips back on the webhook so we can attribute the purchase to the
      // user without trusting the email match.
      metadata: { userId: req.userId, plan: req.plan },
    });
    if (!session.checkout_url) {
      throw new Error('Dodo did not return a checkout_url');
    }
    return { url: session.checkout_url };
  }

  async createPortalSession(providerCustomerId: string): Promise<{ url: string }> {
    const portal = await this.client.customers.customerPortal.create(providerCustomerId);
    return { url: portal.link };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    // Cancel at the next billing date: Dodo stops renewing but the customer
    // keeps access through the paid term, then fires subscription.expired which
    // flips our row to 'canceled'. We never hard-delete here.
    await this.client.subscriptions.update(providerSubscriptionId, {
      cancel_at_next_billing_date: true,
      cancel_reason: 'cancelled_by_customer',
    });
  }

  verifyAndParseWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | undefined>
  ): WebhookResult {
    const raw = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    try {
      // Standard Webhooks: verify the RAW bytes against the signature headers.
      this.webhook.verify(raw, {
        'webhook-id': headers['webhook-id'] ?? '',
        'webhook-signature': headers['webhook-signature'] ?? '',
        'webhook-timestamp': headers['webhook-timestamp'] ?? '',
      });
    } catch {
      return { kind: 'invalid' };
    }

    let body: DodoWebhookBody;
    try {
      body = JSON.parse(raw) as DodoWebhookBody;
    } catch {
      return { kind: 'invalid' };
    }

    return this.normalize(body, headers['webhook-id'] ?? null);
  }

  /** Translate a verified Dodo event into our normalized shape, or ignore it. */
  private normalize(body: DodoWebhookBody, eventId: string | null): WebhookResult {
    const { type, data } = body;
    const userId = data.metadata?.userId;
    const customerId = data.customer?.customer_id ?? null;

    // Audit record for any payment success/failure, attached to whatever result
    // we return below (a state change OR an ignored event). Built once here.
    const outcome = billingOutcome(type);
    const log: BillingEventRecord | undefined = outcome
      ? {
          provider: this.name,
          providerEventId: eventId,
          eventType: type,
          outcome,
          userId: userId ?? null,
          plan: this.planFromBody(body),
          providerPaymentId: data.payment_id ?? null,
          providerSubscriptionId: data.subscription_id ?? null,
          amountCents: data.total_amount ?? null,
          currency: data.currency ?? null,
        }
      : undefined;

    // One-time lifetime purchase. payment.succeeded ALSO fires for subscription
    // payments, so only treat it as lifetime when there's no subscription_id and
    // the cart actually contains our lifetime product.
    if (type === 'payment.succeeded') {
      const isLifetime =
        !data.subscription_id &&
        (data.product_cart ?? []).some(
          (item) => item.product_id === this.config.productIds.lifetime
        );
      if (!isLifetime || !userId || !data.payment_id) return { kind: 'ignored', log };
      return this.event(
        {
          userId,
          // Lifetime has no subscription id; the payment id is the idempotency key.
          providerSubscriptionId: data.payment_id,
          providerCustomerId: customerId,
          plan: 'lifetime',
          status: 'active',
          currentPeriodEnd: null,
        },
        log
      );
    }

    // Subscription (yearly) lifecycle.
    const subStatus = subscriptionStatus(type);
    if (!subStatus || !userId || !data.subscription_id) return { kind: 'ignored', log };
    return this.event(
      {
        userId,
        providerSubscriptionId: data.subscription_id,
        providerCustomerId: customerId,
        plan: 'yearly',
        status: subStatus,
        // Access runs to the next billing date; entitlement lapses naturally when
        // it passes. Cancellations keep the row active until then — only
        // subscription.expired flips it off.
        currentPeriodEnd: data.next_billing_date ?? null,
      },
      log
    );
  }

  /** Best-effort plan inference for the audit log. */
  private planFromBody(body: DodoWebhookBody): Plan | null {
    const cart = body.data.product_cart ?? [];
    if (cart.some((item) => item.product_id === this.config.productIds.lifetime)) return 'lifetime';
    if (body.data.subscription_id) return 'yearly';
    if (cart.some((item) => item.product_id === this.config.productIds.yearly)) return 'yearly';
    return null;
  }

  private event(
    e: Omit<NormalizedSubscriptionEvent, 'provider'>,
    log: BillingEventRecord | undefined
  ): WebhookResult {
    return { kind: 'subscription', event: { ...e, provider: this.name }, log };
  }
}

/** Map a Dodo event type to a payment outcome, or null if it isn't one we audit. */
function billingOutcome(type: string): BillingOutcome | null {
  switch (type) {
    case 'payment.succeeded':
    case 'subscription.active':
    case 'subscription.renewed':
      return 'succeeded';
    case 'payment.failed':
    case 'subscription.failed':
    case 'subscription.on_hold':
      return 'failed';
    default:
      return null;
  }
}

/** Map a Dodo subscription event type to a stored status, or null to ignore it. */
function subscriptionStatus(type: string): SubStatus | null {
  switch (type) {
    case 'subscription.active':
    case 'subscription.renewed':
      return 'active';
    case 'subscription.on_hold':
    case 'subscription.failed':
      return 'past_due';
    case 'subscription.expired':
      return 'canceled';
    // subscription.cancelled (cancel-at-period-end) and everything else: leave
    // the existing row untouched so access continues until current_period_end.
    default:
      return null;
  }
}

/**
 * Build the Dodo provider from env, or return null when billing isn't fully
 * configured (self-host, or cloud before the keys are set). Callers treat null
 * as "billing unavailable" — the gate and status endpoint already handle that.
 */
export function createDodoProviderFromEnv(): DodoProvider | null {
  const apiKey = process.env.DODO_API_KEY;
  const webhookSecret = process.env.DODO_WEBHOOK_SECRET;
  const yearly = process.env.DODO_PRODUCT_ID_YEARLY;
  const lifetime = process.env.DODO_PRODUCT_ID_LIFETIME;
  if (!apiKey || !webhookSecret || !yearly || !lifetime) return null;

  return new DodoProvider({
    apiKey,
    webhookSecret,
    environment: process.env.DODO_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode',
    productIds: { yearly, lifetime },
  });
}
