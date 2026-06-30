import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isoDateForOffset, parseTimezoneOffsetMinutes } from '../src/utils/dates.js';

describe('isoDateForOffset', () => {
  test('east of UTC (NZ, UTC+13) rolls into the new day just after local midnight', () => {
    // 2026-06-20T12:30Z is 2026-06-21T01:30 in NZ — already the next day there.
    const instant = new Date('2026-06-20T12:30:00Z');
    const nzOffset = -780; // getTimezoneOffset() for UTC+13
    assert.equal(isoDateForOffset(instant, nzOffset), '2026-06-21');
  });

  test('west of UTC (Hawaii, UTC-10) stays on the prior day late local evening', () => {
    // 2026-06-21T07:00Z is 2026-06-20T21:00 in Hawaii — still the previous day.
    const instant = new Date('2026-06-21T07:00:00Z');
    const hstOffset = 600; // getTimezoneOffset() for UTC-10
    assert.equal(isoDateForOffset(instant, hstOffset), '2026-06-20');
  });

  test('UTC (offset 0) matches the UTC calendar day', () => {
    const instant = new Date('2026-06-20T23:30:00Z');
    assert.equal(isoDateForOffset(instant, 0), '2026-06-20');
  });

  test('a missing offset falls back to server-local formatting', () => {
    const instant = new Date('2026-06-20T12:00:00Z');
    // Without an offset the helper uses local calendar components; assert it
    // produces a well-formed ISO date rather than throwing.
    assert.match(isoDateForOffset(instant, null), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('parseTimezoneOffsetMinutes', () => {
  test('parses a numeric-string header value', () => {
    assert.equal(parseTimezoneOffsetMinutes('-780'), -780);
  });

  test('takes the first value when a header arrives as an array', () => {
    assert.equal(parseTimezoneOffsetMinutes(['600', '0']), 600);
  });

  test('rejects out-of-range offsets (beyond ±14h)', () => {
    assert.equal(parseTimezoneOffsetMinutes('1000'), undefined);
  });

  test('rejects non-numeric and missing values', () => {
    assert.equal(parseTimezoneOffsetMinutes('not-a-number'), undefined);
    assert.equal(parseTimezoneOffsetMinutes(undefined), undefined);
    assert.equal(parseTimezoneOffsetMinutes(null), undefined);
  });
});
