/**
 * Local-date helpers for `YYYY-MM-DD` strings.
 *
 * The app reasons about calendar days in the *user's* timezone — "today" means
 * their today, not UTC's. `Date.prototype.toISOString()` formats in UTC, so
 * slicing it can land on the wrong day in the evening for users west of UTC.
 * These helpers read the local calendar components instead, so they're stable
 * regardless of timezone.
 */

/** A `Date` → its local calendar day as `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The user's local today as `YYYY-MM-DD`. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Shift a `YYYY-MM-DD` string by `days` (can be negative), staying local. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return toIsoDate(new Date(year, month - 1, day + days));
}
