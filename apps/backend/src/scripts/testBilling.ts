/**
 * Local billing smoke test. Boots the app in-process (Fastify inject — no port,
 * no network server) and exercises the Dodo integration end to end:
 *   1. checkout → real Dodo TEST API returns a checkout_url (both plans)
 *   2. signed webhook → DB upsert → entitlement flips to active
 *   3. bad signature → 400
 *
 * Run: `npx tsx src/scripts/testBilling.ts` from apps/backend (needs the Dodo
 * test env vars + BILLING_ENABLED=true). Creates and deletes a throwaway user.
 */
import { randomUUID } from 'node:crypto';
import { sign } from '@fastify/cookie';
import { Webhook } from 'standardwebhooks';
import { createApp } from '../index.js';
import { createDb } from '../db.js';
import { UserRepository } from '../repositories/UserRepository.js';

const SECRET = process.env.DODO_WEBHOOK_SECRET!;
const COOKIE_SECRET = process.env.COOKIE_SECRET!;
const YEARLY_PRODUCT = process.env.DODO_PRODUCT_ID_YEARLY!;
const LIFETIME_PRODUCT = process.env.DODO_PRODUCT_ID_LIFETIME!;

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`, detail ?? '');
  }
}

/** Build the three Standard Webhooks headers for a JSON payload. */
function signedHeaders(payload: string) {
  const id = `msg_${randomUUID()}`;
  const timestamp = new Date();
  const signature = new Webhook(SECRET).sign(id, timestamp, payload);
  return {
    'webhook-id': id,
    'webhook-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
    'webhook-signature': signature,
    'content-type': 'application/json',
  };
}

async function main() {
  const db = await createDb();
  const users = new UserRepository(db);

  // A real (non-demo) user whose trial is already over, so any entitlement we
  // see afterwards must come from the subscription the webhook creates.
  const userId = randomUUID();
  const email = `billing-test+${userId.slice(0, 8)}@example.com`;
  const createdAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await users.create({ id: userId, email, created_at: createdAt });

  const cookie = `uid=${sign(userId, COOKIE_SECRET)}`;
  const authHeaders = { cookie, 'x-requested-with': 'XMLHttpRequest' };

  const { app } = await createApp();

  try {
    console.log('\n1) Pre-webhook entitlement (trial expired, no sub):');
    let res = await app.inject({ method: 'GET', url: '/api/billing/status', headers: { cookie } });
    let body = res.json();
    check('blocked before paying', body.entitled === false && body.state === 'none', body);

    console.log('\n2) Checkout — real Dodo test API:');
    for (const plan of ['yearly', 'lifetime'] as const) {
      res = await app.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        headers: authHeaders,
        payload: { plan },
      });
      body = res.json();
      const ok =
        res.statusCode === 200 &&
        typeof body.url === 'string' &&
        body.url.includes('dodopayments.com');
      check(`${plan} → checkout_url`, ok, res.statusCode === 200 ? body.url : body);
    }

    console.log('\n3) Webhook subscription.active → entitlement active (yearly):');
    const nextBilling = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    let payload = JSON.stringify({
      type: 'subscription.active',
      data: {
        payload_type: 'Subscription',
        subscription_id: `sub_${randomUUID()}`,
        next_billing_date: nextBilling,
        customer: { customer_id: `cus_${randomUUID()}` },
        metadata: { userId, plan: 'yearly' },
      },
    });
    res = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      headers: signedHeaders(payload),
      payload,
    });
    check('webhook accepted (200)', res.statusCode === 200, res.statusCode);
    res = await app.inject({ method: 'GET', url: '/api/billing/status', headers: { cookie } });
    body = res.json();
    check(
      'status now active/yearly',
      body.entitled === true && body.state === 'active' && body.plan === 'yearly',
      body
    );

    console.log('\n4) Webhook payment.succeeded (lifetime product) → lifetime:');
    payload = JSON.stringify({
      type: 'payment.succeeded',
      data: {
        payload_type: 'Payment',
        payment_id: `pay_${randomUUID()}`,
        subscription_id: null,
        product_cart: [{ product_id: LIFETIME_PRODUCT }],
        customer: { customer_id: `cus_${randomUUID()}` },
        metadata: { userId, plan: 'lifetime' },
      },
    });
    res = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      headers: signedHeaders(payload),
      payload,
    });
    check('webhook accepted (200)', res.statusCode === 200, res.statusCode);
    res = await app.inject({ method: 'GET', url: '/api/billing/status', headers: { cookie } });
    body = res.json();
    check(
      'status now active/lifetime (lifetime wins)',
      body.entitled === true && body.plan === 'lifetime',
      body
    );

    console.log('\n5) payment.succeeded WITH subscription_id (renewal) → ignored, not lifetime:');
    payload = JSON.stringify({
      type: 'payment.succeeded',
      data: {
        payload_type: 'Payment',
        payment_id: `pay_${randomUUID()}`,
        subscription_id: `sub_${randomUUID()}`,
        product_cart: [{ product_id: YEARLY_PRODUCT }],
        metadata: { userId, plan: 'yearly' },
      },
    });
    const before = (
      await db.query(`SELECT count(*) c FROM subscriptions WHERE user_id=$1`, [userId])
    )[0] as { c: string };
    res = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      headers: signedHeaders(payload),
      payload,
    });
    const after = (
      await db.query(`SELECT count(*) c FROM subscriptions WHERE user_id=$1`, [userId])
    )[0] as { c: string };
    check('renewal payment created no new row', res.statusCode === 200 && before.c === after.c, {
      before: before.c,
      after: after.c,
    });

    console.log('\n6) Tampered signature → 400:');
    payload = JSON.stringify({
      type: 'subscription.active',
      data: { subscription_id: 'x', metadata: { userId } },
    });
    const headers = signedHeaders(payload);
    headers['webhook-signature'] = 'v1,bogussignature';
    res = await app.inject({ method: 'POST', url: '/api/billing/webhook', headers, payload });
    check('rejected (400)', res.statusCode === 400, res.statusCode);
  } finally {
    await db.query(`DELETE FROM subscriptions WHERE user_id=$1`, [userId]);
    await users.delete(userId);
    await app.close();
    await db.close();
  }

  console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('test harness crashed:', err);
  process.exit(1);
});
