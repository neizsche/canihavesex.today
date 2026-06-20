import { describe, it, expect } from 'vitest';
import { toIsoDate, todayIso, addDays } from './date';

describe('toIsoDate', () => {
  it('formats local calendar components, not UTC', () => {
    // Late-evening local time that is already the next day in UTC.
    const date = new Date(2026, 5, 20, 23, 30);
    expect(toIsoDate(date)).toBe('2026-06-20');
  });

  it('zero-pads month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('todayIso', () => {
  it('matches toIsoDate(new Date())', () => {
    expect(todayIso()).toBe(toIsoDate(new Date()));
  });
});

describe('addDays', () => {
  it('adds days', () => {
    expect(addDays('2026-06-20', 1)).toBe('2026-06-21');
  });

  it('subtracts days', () => {
    expect(addDays('2026-06-20', -1)).toBe('2026-06-19');
  });

  it('rolls across month boundaries', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rolls across year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
