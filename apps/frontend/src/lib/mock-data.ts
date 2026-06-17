// Shared chart/cycle types and helpers used by the chart views.

export interface QuickStatsData {
  // Historical / At-a-Glance fields
  statusText: string;
  subText: string;
  isHistorical: boolean;
  periodStartDate?: string;
  ovulationDate?: string;

  // New fields for refined logic
  isPredicted?: boolean;
  phase?: string; // e.g. 'Follicular', 'Luteal'

  // Current fields (optional if historical)
  daysToPeriod?: number;
  cycleDay?: number;
  fertilityStatus?: 'High' | 'Medium' | 'Low';
}

type Intensity = 'light' | 'medium' | 'heavy';

export interface CycleData {
  id: string;
  startDate: string; // YYYY-MM-DD
  periodLength: number; // days
  length: number; // total cycle days
  periodIntensity: Intensity;
  ovulationDay?: number; // Estimated day of ovulation
  ovulationConfirmed?: boolean;
}

export function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
