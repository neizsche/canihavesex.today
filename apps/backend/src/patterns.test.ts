import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPatterns, type Phase } from './utils/patterns.js';

// Helper: build a phase map and a list of logs all sharing one phase per date.
function phaseMap(entries: Record<string, Phase>): Map<string, Phase> {
  return new Map(Object.entries(entries));
}

function log(date: string, symptoms: string[]) {
  return { date, symptoms };
}

describe('buildPatterns', () => {
  it('returns nothing when no value reaches the ≥3 occurrence floor', () => {
    const logs = [log('2026-01-01', ['cramps']), log('2026-01-02', ['cramps'])];
    const phases = phaseMap({ '2026-01-01': 'Luteal', '2026-01-02': 'Luteal' });
    assert.deepEqual(buildPatterns(logs, phases), []);
  });

  it('surfaces a symptom at its modal phase once it hits the floor', () => {
    const logs = [
      log('2026-01-01', ['cramps']),
      log('2026-01-02', ['cramps']),
      log('2026-01-03', ['cramps']),
      log('2026-01-04', ['cramps']),
    ];
    const phases = phaseMap({
      '2026-01-01': 'Luteal',
      '2026-01-02': 'Luteal',
      '2026-01-03': 'Luteal',
      '2026-01-04': 'Period', // luteal is still the mode (3 vs 1)
    });
    const out = buildPatterns(logs, phases);
    const sym = out.find((p) => p.category === 'symptom');
    assert.ok(sym, 'expected a symptom pattern');
    assert.equal(sym!.phase, 'Luteal');
    assert.match(sym!.text, /Cramps shows up most often in your luteal phase\./);
  });

  it('buckets mood by prefix and maps sad → "low"', () => {
    const logs = [
      log('2026-01-01', ['mood:sad']),
      log('2026-01-02', ['mood:sad']),
      log('2026-01-03', ['mood:sad']),
    ];
    const phases = phaseMap({
      '2026-01-01': 'Luteal',
      '2026-01-02': 'Luteal',
      '2026-01-03': 'Luteal',
    });
    const mood = buildPatterns(logs, phases).find((p) => p.category === 'mood');
    assert.ok(mood);
    assert.match(mood!.text, /You tend to feel low most often in your luteal phase\./);
  });

  it('only emits energy/libido for the "high" peak, not low/normal', () => {
    const logs = [
      log('2026-01-01', ['energy:low']),
      log('2026-01-02', ['energy:low']),
      log('2026-01-03', ['energy:low']),
      log('2026-01-04', ['libido:high']),
      log('2026-01-05', ['libido:high']),
      log('2026-01-06', ['libido:high']),
    ];
    const phases = phaseMap({
      '2026-01-01': 'Period',
      '2026-01-02': 'Period',
      '2026-01-03': 'Period',
      '2026-01-04': 'Ovulatory',
      '2026-01-05': 'Ovulatory',
      '2026-01-06': 'Ovulatory',
    });
    const out = buildPatterns(logs, phases);
    assert.equal(
      out.find((p) => p.category === 'energy'),
      undefined,
      'low energy must not surface'
    );
    const libido = out.find((p) => p.category === 'libido');
    assert.ok(libido);
    assert.match(libido!.text, /Your libido peaks around ovulation\./);
  });

  it('ignores logs whose date has no computed phase', () => {
    const logs = [
      log('2026-01-01', ['cramps']),
      log('2026-01-02', ['cramps']),
      log('2026-01-03', ['cramps']),
    ];
    // Only one date has a phase → 1 occurrence counts, below the floor.
    const phases = phaseMap({ '2026-01-01': 'Luteal' });
    assert.deepEqual(buildPatterns(logs, phases), []);
  });
});
