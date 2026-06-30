/**
 * Basal body temperature unit handling.
 *
 * Canonical storage (and the backend engine) is ALWAYS Celsius. This module is
 * the single seam where the user's display/input unit is applied: conversion,
 * range bounds, input affordances (step/placeholder/label), and the one-time
 * locale auto-detect. Components and the pure log-state seams import from here
 * so there is exactly one definition of "what 42°C looks like in °F".
 */

export type TemperatureUnit = 'celsius' | 'fahrenheit';

// Canonical valid range, in Celsius — mirrors the backend's accepted bounds
// (logs.temperature validation and CONFIG.bbt MIN/MAX_VALID).
export const BBT_MIN_C = 34;
export const BBT_MAX_C = 42;

export function cToF(c: number): number {
  return c * 1.8 + 32;
}

export function fToC(f: number): number {
  return (f - 32) / 1.8;
}

function clampC(c: number): number {
  return Math.min(BBT_MAX_C, Math.max(BBT_MIN_C, c));
}

/** Round to `dp` decimal places without floating-point trailing noise. */
function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Input affordances for the BBT field, per unit. */
export function bbtFieldConfig(unit: TemperatureUnit) {
  if (unit === 'fahrenheit') {
    return {
      label: '°F',
      // 34–42 °C → 93.2–107.6 °F.
      min: round(cToF(BBT_MIN_C), 1),
      max: round(cToF(BBT_MAX_C), 1),
      step: 0.1,
      placeholder: '97.7',
    };
  }
  return {
    label: '°C',
    min: BBT_MIN_C,
    max: BBT_MAX_C,
    step: 0.01,
    placeholder: '36.5',
  };
}

/**
 * Format a canonical Celsius reading for display in the user's unit. Returns ''
 * for null/NaN ("no reading"). Fahrenheit shows 1 decimal (how US BBT
 * thermometers read); Celsius preserves the stored value as-is.
 */
export function celsiusToDisplay(
  celsius: number | string | null | undefined,
  unit: TemperatureUnit
): string {
  if (celsius == null || celsius === '') return '';
  const c = typeof celsius === 'string' ? parseFloat(celsius) : celsius;
  if (!Number.isFinite(c)) return '';
  if (unit === 'fahrenheit') return String(round(cToF(c), 1));
  return String(c);
}

/**
 * Parse a display-unit input string back to a canonical Celsius value, clamped
 * to the valid range. Returns null for empty/unparseable input.
 */
export function displayToCelsius(value: string, unit: TemperatureUnit): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n)) return null;
  const celsius = unit === 'fahrenheit' ? fToC(n) : n;
  // Store Celsius at 2dp to match the NUMERIC(5,2) column and avoid F→C noise.
  return round(clampC(celsius), 2);
}

/**
 * Clamp a raw display-unit input string to the valid range, for the on-blur
 * correction. Empty/unparseable input stays empty.
 */
export function clampDisplayInput(value: string, unit: TemperatureUnit): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n)) return '';
  const { min, max } = bbtFieldConfig(unit);
  const clamped = Math.min(max, Math.max(min, n));
  // Re-round to the unit's display precision so e.g. 110 → 107.6, not 107.60000…
  return String(round(clamped, unit === 'fahrenheit' ? 1 : 2));
}

// Regions that use Fahrenheit for everyday temperature. Practically this is the
// United States (plus a handful of small territories/nations); everyone else
// gets Celsius.
const FAHRENHEIT_REGIONS = new Set(['US', 'LR', 'KY', 'PW', 'FM', 'MH', 'BS', 'BZ']);

/**
 * Best-effort default unit from the browser locale. Used once at onboarding to
 * seed the preference; the user can always override it in Settings.
 */
export function detectTemperatureUnit(): TemperatureUnit {
  try {
    const tags = [...(navigator.languages ?? []), navigator.language].filter(Boolean) as string[];
    for (const tag of tags) {
      const region = new Intl.Locale(tag).maximize().region;
      if (region && FAHRENHEIT_REGIONS.has(region)) return 'fahrenheit';
      if (region) return 'celsius';
    }
  } catch {
    // Intl.Locale unavailable or malformed tag — fall through to the safe default.
  }
  return 'celsius';
}
