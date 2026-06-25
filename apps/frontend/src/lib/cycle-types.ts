// Shared cycle/stats types and helpers used by the chart views. These are
// derived from real API data — kept here as the single source of truth.

type Intensity = 'light' | 'medium' | 'heavy';

export interface CycleData {
  id: string;
  startDate: string; // YYYY-MM-DD
  periodLength: number; // days
  length: number; // total cycle days
  periodIntensity: Intensity;
  ovulationDay?: number; // Estimated day of ovulation
  ovulationConfirmed?: boolean;
  complete?: boolean; // false for the in-progress current cycle
}

export function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
