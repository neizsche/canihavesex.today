import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  codeMatches,
  generateCode,
  hashCode,
  isEmailVerificationEnabled,
} from '../src/emailVerification.js';
import {
  EmailVerificationService,
  type StoredCode,
  type VerificationStore,
} from '../src/services/EmailVerificationService.js';

const SECRET = 'test-secret-at-least-32-chars-long-xxxxx';

// --- In-memory store + sender so the service is tested without a database ----
class FakeStore implements VerificationStore {
  rows: StoredCode[] = [];
  verifiedUsers = new Set<string>();
  private seq = 0;

  async createCode(rec: { userId: string; codeHash: string; expiresAt: string; createdAt: string }) {
    this.rows.push({
      id: `code-${this.seq++}`,
      user_id: rec.userId,
      code_hash: rec.codeHash,
      expires_at: rec.expiresAt,
      attempts: 0,
      consumed_at: null,
      created_at: rec.createdAt,
    });
  }
  async latestActiveCodeForUser(userId: string) {
    return [...this.rows]
      .filter((r) => r.user_id === userId && r.consumed_at === null)
      .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())[0];
  }
  async incrementAttempts(id: string) {
    const row = this.rows.find((r) => r.id === id);
    if (row) row.attempts += 1;
  }
  async consumeCode(id: string) {
    const row = this.rows.find((r) => r.id === id);
    if (row) row.consumed_at = new Date().toISOString();
  }
  async setUserVerified(userId: string) {
    this.verifiedUsers.add(userId);
  }
}

/** Captures sent codes so tests can assert what (if anything) was emailed. */
function makeSender() {
  const sent: Array<{ to: string; code: string }> = [];
  const fn = async (to: string, code: string) => {
    sent.push({ to, code });
  };
  return { fn, sent };
}

// =============================================================================
// Pure helpers
// =============================================================================
describe('code generation & hashing', () => {
  test('generateCode returns a 6-digit numeric string', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode();
      assert.match(code, /^\d{6}$/, `unexpected code: ${code}`);
    }
  });

  test('generateCode is not constant (some entropy)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(generateCode());
    assert.ok(seen.size > 1, 'generateCode produced the same value every time');
  });

  test('hashCode never equals the raw code and is deterministic', () => {
    const code = '012345';
    const h = hashCode(code, SECRET);
    assert.notEqual(h, code);
    assert.ok(!h.includes(code), 'hash must not contain the raw code');
    assert.equal(h, hashCode(code, SECRET), 'hash should be deterministic');
  });

  test('codeMatches accepts the right code and rejects wrong ones', () => {
    const h = hashCode('424242', SECRET);
    assert.equal(codeMatches('424242', SECRET, h), true);
    assert.equal(codeMatches('000000', SECRET, h), false);
    assert.equal(codeMatches('424242', 'a-different-secret-aaaaaaaaaaaaaaaa', h), false);
  });
});

// =============================================================================
// Cloud variant: the verification service behaviour
// =============================================================================
describe('cloud: EmailVerificationService.verify', () => {
  let store: FakeStore;
  let sender: ReturnType<typeof makeSender>;
  let clock: { now: number };
  let svc: EmailVerificationService;

  beforeEach(() => {
    store = new FakeStore();
    sender = makeSender();
    clock = { now: 1_700_000_000_000 };
    svc = new EmailVerificationService(store, sender.fn, SECRET, () => clock.now);
  });

  test('correct code passes, marks the user verified, and is single-use', async () => {
    await svc.requestCode('user-1', 'a@example.com');
    const code = sender.sent[0].code;

    assert.equal(await svc.verify('user-1', code), 'ok');
    assert.ok(store.verifiedUsers.has('user-1'), 'user should be marked verified');

    // The code is consumed: reusing it now fails.
    assert.equal(await svc.verify('user-1', code), 'invalid');
  });

  test('wrong code fails without verifying the user', async () => {
    await svc.requestCode('user-1', 'a@example.com');
    const wrong = sender.sent[0].code === '000000' ? '111111' : '000000';

    assert.equal(await svc.verify('user-1', wrong), 'invalid');
    assert.ok(!store.verifiedUsers.has('user-1'));
  });

  test('expired code fails even when the digits are correct', async () => {
    await svc.requestCode('user-1', 'a@example.com');
    const code = sender.sent[0].code;

    clock.now += CODE_TTL_MS + 1; // jump past expiry
    assert.equal(await svc.verify('user-1', code), 'invalid');
    assert.ok(!store.verifiedUsers.has('user-1'));
  });

  test('attempt limit is enforced: code dies after MAX_ATTEMPTS wrong tries', async () => {
    await svc.requestCode('user-1', 'a@example.com');
    const code = sender.sent[0].code;
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      assert.equal(await svc.verify('user-1', wrong), 'invalid');
    }
    // Budget spent → even the correct code no longer works.
    assert.equal(await svc.verify('user-1', code), 'invalid');
    assert.ok(!store.verifiedUsers.has('user-1'));
  });

  test('verify with no outstanding code is generically invalid', async () => {
    assert.equal(await svc.verify('nobody', '123456'), 'invalid');
  });
});

// =============================================================================
// Cloud variant: the verification service behaviour
// =============================================================================
describe('cloud: EmailVerificationService.requestCode', () => {
  let store: FakeStore;
  let sender: ReturnType<typeof makeSender>;
  let clock: { now: number };
  let svc: EmailVerificationService;

  beforeEach(() => {
    store = new FakeStore();
    sender = makeSender();
    clock = { now: 1_700_000_000_000 };
    svc = new EmailVerificationService(store, sender.fn, SECRET, () => clock.now);
  });

  test('stores only a HASH of the code — never the raw code', async () => {
    const res = await svc.requestCode('user-1', 'a@example.com');
    assert.deepEqual(res, { sent: true });

    const raw = sender.sent[0].code;
    assert.equal(store.rows.length, 1);
    const stored = store.rows[0];
    assert.notEqual(stored.code_hash, raw);
    assert.equal(stored.code_hash, hashCode(raw, SECRET));

    // The raw code must appear nowhere in the persisted record.
    const serialized = JSON.stringify(stored);
    assert.ok(!serialized.includes(raw), 'raw code leaked into the stored row');
  });

  test('resend within the cooldown window is blocked and sends no second email', async () => {
    await svc.requestCode('user-1', 'a@example.com');
    clock.now += RESEND_COOLDOWN_MS - 1;

    const res = await svc.requestCode('user-1', 'a@example.com');
    assert.equal(res.sent, false);
    assert.equal(sender.sent.length, 1, 'no second email should be sent on cooldown');
  });

  test('resend after the cooldown issues a fresh code', async () => {
    await svc.requestCode('user-1', 'a@example.com');
    clock.now += RESEND_COOLDOWN_MS + 1;

    const res = await svc.requestCode('user-1', 'a@example.com');
    assert.deepEqual(res, { sent: true });
    assert.equal(sender.sent.length, 2);
  });
});

// =============================================================================
// Self-hosted variant: the feature is fully gated off
// =============================================================================
describe('self-hosted: variant gating', () => {
  const original = process.env.REQUIRE_EMAIL_VERIFICATION;
  beforeEach(() => {
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
  });
  test('isEmailVerificationEnabled is false with no email config at all', () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    assert.equal(isEmailVerificationEnabled(), false);
  });
  test('only the explicit "true" flag turns it on (cloud)', () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    assert.equal(isEmailVerificationEnabled(), true);
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
    assert.equal(isEmailVerificationEnabled(), false);
    process.env.REQUIRE_EMAIL_VERIFICATION = '1';
    assert.equal(isEmailVerificationEnabled(), false);
    process.env.REQUIRE_EMAIL_VERIFICATION = original ?? '';
    if (!original) delete process.env.REQUIRE_EMAIL_VERIFICATION;
  });
});
