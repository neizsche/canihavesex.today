import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isBillingEnabled, type Plan } from '../entitlement.js';
import { appBase } from '../auth.js';
import type { EntitlementService } from '../services/EntitlementService.js';
import type { UserRepository } from '../repositories/UserRepository.js';
import type { SubscriptionRepository } from '../repositories/SubscriptionRepository.js';
import type { BillingEventRepository } from '../repositories/BillingEventRepository.js';
import type { PaymentProvider } from '../billing/PaymentProvider.js';

interface BillingDeps {
  entitlementService: EntitlementService;
  userRepository: UserRepository;
  subscriptionRepository: SubscriptionRepository;
  /** Append-only audit log of payment successes/failures. */
  billingEventRepository: BillingEventRepository;
  /** Null when billing is on but the provider isn't fully configured. */
  provider: PaymentProvider | null;
  /**
   * Sends the purchase/renewal confirmation. Cloud only. The webhook calls it
   * only on the FIRST delivery of an activating event (deduped via the billing
   * events audit log), so retries don't re-email the customer. Failures are
   * logged, not propagated, so a flaky mail send never costs us the subscription.
   */
  sendPurchaseEmail: (to: string, plan: Plan) => Promise<void>;
}

/**
 * Where Dodo returns the customer after checkout. Plain app entry — Dodo appends
 * its own `status` (succeeded/active on success, else failed/cancelled) plus
 * `payment_id`/`subscription_id` to the query string, which the frontend reads
 * to show the right outcome. We deliberately do NOT pre-bake a success marker:
 * the redirect is a UX hint only; the webhook is the source of truth for access.
 */
function returnUrl(): string {
  return `${appBase()}/app`;
}

/**
 * Billing endpoints. `status` is read-only and always available; checkout,
 * portal and webhook only work once a provider is configured. Requires a
 * logged-in user (cookie auth) except the webhook, which is a public,
 * signature-verified, raw-body route (see the auth/CSRF skip lists in index.ts).
 * Not behind the entitlement gate — a blocked user must still reach the paywall
 * and pay.
 */
export async function billingRoutes(fastify: FastifyInstance, opts: BillingDeps) {
  const {
    entitlementService,
    userRepository,
    subscriptionRepository,
    billingEventRepository,
    provider,
    sendPurchaseEmail,
  } = opts;

  // GET /api/billing/status — what the frontend reads to decide whether to show
  // the app or the paywall. When billing is disabled (self-host) it always
  // reports entitled, so the paywall never appears.
  fastify.get('/api/billing/status', async (req, reply) => {
    if (!isBillingEnabled()) {
      return reply.send({
        billingEnabled: false,
        entitled: true,
        state: 'disabled',
        plan: null,
        trialEndsAt: null,
        currentPeriodEnd: null,
      });
    }

    const ent = await entitlementService.forUser(req.userId!);
    if (!ent) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    // Whether the active recurring plan is set to stop renewing, so the UI can
    // say "Cancels on X" rather than "Next billing on X".
    const sub = await subscriptionRepository.findActiveByUser(req.userId!);

    return reply.send({
      billingEnabled: true,
      entitled: ent.entitled,
      state: ent.state,
      plan: ent.plan,
      trialEndsAt: ent.trialEndsAt ? new Date(ent.trialEndsAt).toISOString() : null,
      currentPeriodEnd: ent.currentPeriodEnd ? new Date(ent.currentPeriodEnd).toISOString() : null,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    });
  });

  // POST /api/billing/checkout — start a hosted Dodo checkout for the chosen
  // plan and return the URL to redirect the browser to.
  fastify.post('/api/billing/checkout', async (req, reply) => {
    if (!isBillingEnabled() || !provider) {
      return reply.status(503).send({ error: 'billing_unavailable' });
    }
    const parsed = z.object({ plan: z.enum(['yearly', 'lifetime']) }).safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_plan' });
    }
    const user = await userRepository.findById(req.userId!);
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    const { url } = await provider.createCheckout({
      userId: user.id,
      email: user.email,
      plan: parsed.data.plan as Plan,
      returnUrl: returnUrl(),
    });
    return reply.send({ url });
  });

  // POST /api/billing/portal — open the provider's billing portal (manage or
  // cancel the subscription). Needs a known provider customer for the user.
  fastify.post('/api/billing/portal', async (req, reply) => {
    if (!isBillingEnabled() || !provider) {
      return reply.status(503).send({ error: 'billing_unavailable' });
    }
    const customerId = await subscriptionRepository.findCustomerIdByUser(req.userId!);
    if (!customerId) {
      return reply.status(404).send({ error: 'no_customer' });
    }
    const { url } = await provider.createPortalSession(customerId);
    return reply.send({ url });
  });

  // POST /api/billing/cancel — cancel the user's active yearly subscription at
  // period end. Access continues until current_period_end; the provider's expiry
  // webhook later flips the row to canceled. No-op-safe for lifetime/no-sub users
  // (they have no recurring subscription to cancel).
  fastify.post('/api/billing/cancel', async (req, reply) => {
    if (!isBillingEnabled() || !provider) {
      return reply.status(503).send({ error: 'billing_unavailable' });
    }
    const sub = await subscriptionRepository.findActiveYearlyByUser(req.userId!);
    if (!sub?.provider_subscription_id) {
      return reply.status(404).send({ error: 'no_subscription' });
    }
    await provider.cancelSubscription(sub.provider_subscription_id);
    // Reflect it immediately so the UI updates without waiting for the webhook.
    await subscriptionRepository.markCancelAtPeriodEnd(sub.provider_subscription_id);
    return reply.send({ ok: true });
  });

  // POST /api/billing/webhook — provider source of truth. Public + raw-body +
  // signature-verified. Always answers 200 for accepted/ignored events so the
  // provider stops retrying; only a failed signature returns 400.
  fastify.post('/api/billing/webhook', { config: { rawBody: true } }, async (req, reply) => {
    if (!provider) {
      // Billing not configured here — acknowledge so the provider doesn't retry.
      return reply.status(200).send({ ok: true });
    }
    const raw = (req as { rawBody?: string | Buffer }).rawBody;
    if (raw === undefined) {
      req.log.error('billing webhook: raw body unavailable');
      return reply.status(400).send({ error: 'no_raw_body' });
    }

    const result = provider.verifyAndParseWebhook(
      raw,
      req.headers as Record<string, string | undefined>
    );
    if (result.kind === 'invalid') {
      req.log.warn('billing webhook: signature verification failed');
      return reply.status(400).send({ error: 'invalid_signature' });
    }

    // Audit every verified payment success/failure (idempotent on the provider
    // event id). Non-fatal: a logging failure must not cost us the subscription
    // upsert below or make the provider retry a state change we already applied.
    // `isNewEvent` is the first-delivery signal that gates the confirmation email
    // so retries don't re-send it. On a record failure it stays false (we'd
    // rather skip the email than risk a duplicate; a retry re-records and sends).
    let isNewEvent = false;
    if (result.log) {
      try {
        isNewEvent = await billingEventRepository.record(result.log);
      } catch (err) {
        req.log.error({ err, eventType: result.log.eventType }, 'billing event log failed');
      }
    }

    if (result.kind === 'subscription') {
      await subscriptionRepository.upsertFromEvent(result.event);
      req.log.info(
        { userId: result.event.userId, plan: result.event.plan, status: result.event.status },
        'billing webhook applied'
      );

      // Upgrade path: a lifetime purchase landed for someone who still has an
      // active yearly subscription. Lifetime already wins in the entitlement
      // order, but the yearly would keep billing — so cancel it at period end.
      // Best-effort: a cancel failure must not fail the webhook (the provider
      // would retry the whole event and re-apply the lifetime upsert).
      if (result.event.plan === 'lifetime' && result.event.status === 'active') {
        try {
          const yearly = await subscriptionRepository.findActiveYearlyByUser(result.event.userId);
          if (yearly?.provider_subscription_id) {
            await provider.cancelSubscription(yearly.provider_subscription_id);
            await subscriptionRepository.markCancelAtPeriodEnd(yearly.provider_subscription_id);
            req.log.info(
              { userId: result.event.userId, yearlyId: yearly.provider_subscription_id },
              'auto-canceled yearly after lifetime upgrade'
            );
          }
        } catch (err) {
          req.log.error(
            { err, userId: result.event.userId },
            'auto-cancel yearly after lifetime upgrade failed'
          );
        }
      }
      // Confirmation email on every activating event (yearly active/renewed,
      // lifetime) — but only on the FIRST delivery (isNewEvent), so webhook
      // retries don't re-email. Non-fatal: a mail failure must not lose us the
      // subscription.
      if (result.event.status === 'active' && isNewEvent) {
        const user = await userRepository.findById(result.event.userId);
        if (user) {
          try {
            await sendPurchaseEmail(user.email, result.event.plan);
          } catch (err) {
            req.log.error({ err, userId: user.id }, 'purchase confirmation email failed');
          }
        }
      }
    }
    return reply.status(200).send({ ok: true });
  });
}
