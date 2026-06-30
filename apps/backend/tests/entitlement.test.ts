import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateEntitlement,
  type EntitlementInput,
  type SubscriptionView,
} from '../src/entitlement.js';

const DAY = 24 * 60 * 60 * 1000;
const TRIAL = 14 * DAY;
const NOW = Date.UTC(2026, 0, 30); // fixed clock for deterministic tests

function input(overrides: Partial<EntitlementInput> = {}): EntitlementInput {
  return {
    userCreatedAt: NOW, // signed up "now" → mid-trial by default
    isDemo: false,
    subscription: null,
    now: NOW,
    trialMs: TRIAL,
    ...overrides,
  };
}

function sub(overrides: Partial<SubscriptionView> = {}): SubscriptionView {
  return { plan: 'yearly', status: 'active', currentPeriodEnd: NOW + 365 * DAY, ...overrides };
}

describe('evaluateEntitlement — demo', () => {
  test('demo account is always entitled, regardless of trial/sub', () => {
    const e = evaluateEntitlement(input({ isDemo: true, userCreatedAt: NOW - 999 * DAY }));
    assert.equal(e.entitled, true);
    assert.equal(e.state, 'demo');
  });
});

describe('evaluateEntitlement — trial', () => {
  test('within the trial window → trialing + entitled', () => {
    const e = evaluateEntitlement(input({ userCreatedAt: NOW - 5 * DAY }));
    assert.equal(e.entitled, true);
    assert.equal(e.state, 'trialing');
    assert.equal(e.trialEndsAt, NOW - 5 * DAY + TRIAL);
  });

  test('exactly at trial end → no longer entitled (boundary is exclusive)', () => {
    const e = evaluateEntitlement(input({ userCreatedAt: NOW - TRIAL }));
    assert.equal(e.entitled, false);
    assert.equal(e.state, 'none');
  });

  test('trial expired, never subscribed → none + blocked', () => {
    const e = evaluateEntitlement(input({ userCreatedAt: NOW - 30 * DAY }));
    assert.equal(e.entitled, false);
    assert.equal(e.state, 'none');
  });
});

describe('evaluateEntitlement — paid', () => {
  test('active lifetime → entitled, never expires', () => {
    const e = evaluateEntitlement(
      input({
        userCreatedAt: NOW - 999 * DAY,
        subscription: sub({ plan: 'lifetime', currentPeriodEnd: null }),
      })
    );
    assert.equal(e.entitled, true);
    assert.equal(e.state, 'active');
    assert.equal(e.plan, 'lifetime');
    assert.equal(e.currentPeriodEnd, null);
  });

  test('active yearly within period → entitled even after trial ended', () => {
    const e = evaluateEntitlement(
      input({
        userCreatedAt: NOW - 999 * DAY,
        subscription: sub({ currentPeriodEnd: NOW + 10 * DAY }),
      })
    );
    assert.equal(e.entitled, true);
    assert.equal(e.state, 'active');
    assert.equal(e.plan, 'yearly');
  });

  test('yearly past its period, trial also over → expired + blocked', () => {
    const e = evaluateEntitlement(
      input({ userCreatedAt: NOW - 999 * DAY, subscription: sub({ currentPeriodEnd: NOW - DAY }) })
    );
    assert.equal(e.entitled, false);
    assert.equal(e.state, 'expired');
    assert.equal(e.plan, 'yearly');
  });

  test('canceled subscription is ignored (treated as no active sub)', () => {
    const e = evaluateEntitlement(
      input({ userCreatedAt: NOW - 999 * DAY, subscription: sub({ status: 'canceled' }) })
    );
    assert.equal(e.entitled, false);
    assert.equal(e.state, 'expired');
  });

  test('lapsed yearly but still in trial → trialing wins', () => {
    const e = evaluateEntitlement(
      input({ userCreatedAt: NOW - 2 * DAY, subscription: sub({ currentPeriodEnd: NOW - DAY }) })
    );
    assert.equal(e.entitled, true);
    assert.equal(e.state, 'trialing');
  });
});
