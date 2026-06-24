import { describe, test, expect } from 'vitest';
import {
  cToF,
  fToC,
  celsiusToDisplay,
  displayToCelsius,
  clampDisplayInput,
  bbtFieldConfig,
} from './temperatureUnits';

describe('temperature conversion', () => {
  test('cToF / fToC round-trip', () => {
    expect(cToF(36.7)).toBeCloseTo(98.06, 2);
    expect(fToC(98.6)).toBeCloseTo(37, 5);
    expect(fToC(cToF(36.5))).toBeCloseTo(36.5, 5);
  });
});

describe('celsiusToDisplay', () => {
  test('celsius passes through, accepts numeric strings', () => {
    expect(celsiusToDisplay(36.7, 'celsius')).toBe('36.7');
    expect(celsiusToDisplay('36.70', 'celsius')).toBe('36.7');
  });

  test('fahrenheit rounds to 1 decimal', () => {
    expect(celsiusToDisplay(36.7, 'fahrenheit')).toBe('98.1'); // 98.06 → 98.1
    expect(celsiusToDisplay(37, 'fahrenheit')).toBe('98.6');
  });

  test('null / empty → empty string', () => {
    expect(celsiusToDisplay(null, 'fahrenheit')).toBe('');
    expect(celsiusToDisplay('', 'celsius')).toBe('');
    expect(celsiusToDisplay(undefined, 'celsius')).toBe('');
  });
});

describe('displayToCelsius (canonical storage)', () => {
  test('celsius input stores as-is, clamped', () => {
    expect(displayToCelsius('36.7', 'celsius')).toBe(36.7);
    expect(displayToCelsius('50', 'celsius')).toBe(42); // clamp to max
    expect(displayToCelsius('10', 'celsius')).toBe(34); // clamp to min
  });

  test('fahrenheit input converts to celsius', () => {
    expect(displayToCelsius('98.6', 'fahrenheit')).toBe(37);
    // 110 °F → 43.3 °C → clamped to 42 °C
    expect(displayToCelsius('110', 'fahrenheit')).toBe(42);
  });

  test('empty / unparseable → null', () => {
    expect(displayToCelsius('', 'fahrenheit')).toBeNull();
    expect(displayToCelsius('abc', 'celsius')).toBeNull();
  });
});

describe('clampDisplayInput (on-blur correction)', () => {
  test('celsius snaps to bounds', () => {
    expect(clampDisplayInput('50', 'celsius')).toBe('42');
    expect(clampDisplayInput('20', 'celsius')).toBe('34');
    expect(clampDisplayInput('36.7', 'celsius')).toBe('36.7');
  });

  test('fahrenheit snaps to its own bounds (93.2–107.6)', () => {
    expect(clampDisplayInput('110', 'fahrenheit')).toBe('107.6');
    expect(clampDisplayInput('80', 'fahrenheit')).toBe('93.2');
    expect(clampDisplayInput('98.6', 'fahrenheit')).toBe('98.6');
  });

  test('empty / unparseable → empty', () => {
    expect(clampDisplayInput('', 'celsius')).toBe('');
    expect(clampDisplayInput('--', 'fahrenheit')).toBe('');
  });
});

describe('bbtFieldConfig', () => {
  test('celsius bounds', () => {
    const c = bbtFieldConfig('celsius');
    expect(c.label).toBe('°C');
    expect(c.min).toBe(34);
    expect(c.max).toBe(42);
  });

  test('fahrenheit bounds derived from celsius range', () => {
    const f = bbtFieldConfig('fahrenheit');
    expect(f.label).toBe('°F');
    expect(f.min).toBe(93.2);
    expect(f.max).toBe(107.6);
  });
});
