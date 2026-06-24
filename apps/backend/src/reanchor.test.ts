import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeReanchorFlags, type ReanchorFlagsInput } from './reanchor.js';

const CYCLE_START = '2026-06-01';

function input(overrides: Partial<ReanchorFlagsInput> = {}): ReanchorFlagsInput {
  return {
    lostTrack: false,
    paused: false,
    ackKind: null,
    ackCycleStart: null,
    activeCycleStart: CYCLE_START,
    ...overrides,
  };
}

describe('computeReanchorFlags — no drift', () => {
  test('not lostTrack → nothing shown', () => {
    const f = computeReanchorFlags(input({ lostTrack: false }));
    assert.deepEqual(f, { paused: false, show: false, acked: false });
  });
});

describe('computeReanchorFlags — drift (lostTrack)', () => {
  test('drift with no ack → show the prompt', () => {
    const f = computeReanchorFlags(input({ lostTrack: true }));
    assert.equal(f.show, true);
    assert.equal(f.acked, false);
  });

  test('drift with ack matching the active cycle → acknowledged, no prompt', () => {
    const f = computeReanchorFlags(
      input({ lostTrack: true, ackKind: 'late', ackCycleStart: CYCLE_START })
    );
    assert.equal(f.show, false);
    assert.equal(f.acked, true);
  });

  test("'skipped' ack behaves like 'late'", () => {
    const f = computeReanchorFlags(
      input({ lostTrack: true, ackKind: 'skipped', ackCycleStart: CYCLE_START })
    );
    assert.equal(f.show, false);
    assert.equal(f.acked, true);
  });

  test('ack from a previous cycle is stale → prompt returns', () => {
    const f = computeReanchorFlags(
      input({
        lostTrack: true,
        ackKind: 'late',
        ackCycleStart: '2026-05-01',
        activeCycleStart: CYCLE_START,
      })
    );
    assert.equal(f.show, true);
    assert.equal(f.acked, false);
  });

  test('ack kind set but no stored cycle start → does not match', () => {
    const f = computeReanchorFlags(
      input({ lostTrack: true, ackKind: 'late', ackCycleStart: null })
    );
    assert.equal(f.show, true);
    assert.equal(f.acked, false);
  });

  test('no active cycle (start null) → ack cannot match', () => {
    const f = computeReanchorFlags(
      input({
        lostTrack: true,
        ackKind: 'late',
        ackCycleStart: CYCLE_START,
        activeCycleStart: null,
      })
    );
    assert.equal(f.show, true);
    assert.equal(f.acked, false);
  });
});

describe('computeReanchorFlags — paused', () => {
  test('paused overrides everything', () => {
    const f = computeReanchorFlags(
      input({ paused: true, lostTrack: true, ackKind: 'late', ackCycleStart: CYCLE_START })
    );
    assert.deepEqual(f, { paused: true, show: false, acked: false });
  });
});
