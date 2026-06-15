import { describe, it, expect } from 'vitest';
import { riskBadgeVariant, fertilityPct } from './domain';

describe('riskBadgeVariant', () => {
  it('maps each risk level to its badge variant', () => {
    expect(riskBadgeVariant('HIGH')).toBe('riskHigh');
    expect(riskBadgeVariant('MEDIUM')).toBe('riskMedium');
    expect(riskBadgeVariant('LOW')).toBe('riskLow');
    expect(riskBadgeVariant('INSUFFICIENT_DATA')).toBe('default');
  });
});

describe('fertilityPct', () => {
  it('scales the fertility index by 12.5 and rounds', () => {
    expect(fertilityPct(0)).toBe(0);
    expect(fertilityPct(4)).toBe(50);
    expect(fertilityPct(8)).toBe(100);
  });

  it('clamps to the 0..100 range', () => {
    expect(fertilityPct(-2)).toBe(0);
    expect(fertilityPct(20)).toBe(100);
  });
});
