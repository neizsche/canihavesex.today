import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateWaitlistSubmission } from '../src/waitlist.js';

describe('evaluateWaitlistSubmission', () => {
  test('stores a normalized (trimmed, lower-cased) email when consented', () => {
    const out = evaluateWaitlistSubmission({ email: '  Bob@Example.COM ', consent: true });
    assert.deepEqual(out, { action: 'store', email: 'bob@example.com' });
  });

  test('rejects when consent is not explicitly true', () => {
    for (const consent of [false, undefined as unknown as boolean]) {
      const out = evaluateWaitlistSubmission({ email: 'a@b.com', consent });
      assert.deepEqual(out, { action: 'reject', error: 'consent_required' });
    }
  });

  test('drops (honeypot) when the hidden website field is filled — before consent check', () => {
    const out = evaluateWaitlistSubmission({
      email: 'spam@bot.com',
      consent: false, // even without consent, honeypot short-circuits first
      website: 'http://spam',
    });
    assert.deepEqual(out, { action: 'drop' });
  });

  test('ignores an empty/whitespace honeypot value', () => {
    const out = evaluateWaitlistSubmission({ email: 'a@b.com', consent: true, website: '   ' });
    assert.equal(out.action, 'store');
  });
});
