// =========================================================
// MOCK DATA STORE
// =========================================================

export type Status = 'period' | 'fertile' | 'safe';
export type Risk = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA'; // Legacy compatibility

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

export interface ChartDay {
  date: string;
  status: Status;
  ovulationConfirmed: boolean;
  // Removed temp/lhTest as requested
}

export interface MockChartData {
  days: ChartDay[];
  quickStats: QuickStatsData;
}

// Start Day Helper
function createMonthDays(year: number, month: number, startDay: number): ChartDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: ChartDay[] = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateStr = date.toISOString().slice(0, 10);

    let status: Status = 'safe';
    let ovulationConfirmed = false;

    // Simple main cycle logic
    if (i >= startDay && i < startDay + 5) status = 'period';
    else if (i >= startDay + 10 && i <= startDay + 15) {
      status = 'fertile';
      if (i === startDay + 13) ovulationConfirmed = true;
    }

    days.push({
      date: dateStr,
      status,
      ovulationConfirmed,
    });
  }
  return days;
}

const AUG_2025_DAYS = createMonthDays(2025, 7, 23);
const SEP_2025_DAYS = createMonthDays(2025, 8, 20);
const OCT_2025_DAYS = createMonthDays(2025, 9, 18);
const NOV_2025_DAYS = createMonthDays(2025, 10, 15);
const DEC_2025_DAYS = createMonthDays(2025, 11, 13);
const JAN_2026_DAYS = createMonthDays(2026, 0, 10);

const MANUAL_DATA_STORE: Record<string, MockChartData> = {
  '2025-7': {
    // Aug
    days: AUG_2025_DAYS,
    quickStats: {
      statusText: 'Period Started',
      subText: 'Aug 23',
      isHistorical: true,
      periodStartDate: 'Aug 23',
      ovulationDate: 'Sep 5',
      isPredicted: false,
    },
  },
  '2025-8': {
    // Sep
    days: SEP_2025_DAYS,
    quickStats: {
      statusText: 'Period Started',
      subText: 'Sep 20',
      isHistorical: true,
      periodStartDate: 'Sep 20',
      ovulationDate: 'Oct 3',
      isPredicted: false,
    },
  },
  '2025-9': {
    // Oct
    days: OCT_2025_DAYS,
    quickStats: {
      statusText: 'Period Started',
      subText: 'Oct 18',
      isHistorical: true,
      periodStartDate: 'Oct 18',
      ovulationDate: 'Oct 31',
      isPredicted: false,
    },
  },
  '2025-10': {
    // Nov
    days: NOV_2025_DAYS,
    quickStats: {
      statusText: 'Period Started',
      subText: 'Nov 15',
      isHistorical: true,
      periodStartDate: 'Nov 15',
      ovulationDate: 'Nov 28',
      isPredicted: false,
    },
  },
  '2025-11': {
    // Dec
    days: DEC_2025_DAYS,
    quickStats: {
      statusText: 'Period Started',
      subText: 'Dec 13',
      isHistorical: true,
      periodStartDate: 'Dec 13',
      ovulationDate: 'Dec 26',
      isPredicted: false,
    },
  },
  '2026-0': {
    // Jan
    days: JAN_2026_DAYS,
    quickStats: {
      statusText: 'Current Cycle',
      subText: 'Day 21',
      isHistorical: false,
      periodStartDate: 'Jan 10',
      ovulationDate: 'Jan 23',
      daysToPeriod: 8,
      cycleDay: 21,
      fertilityStatus: 'Low',
      phase: 'Luteal Phase',
      isPredicted: false,
    },
  },
};

export function getChartDataForMonth(year: number, month: number): MockChartData {
  const key = `${year}-${month}`;
  return (
    MANUAL_DATA_STORE[key] || {
      days: [],
      quickStats: { statusText: 'No Data', subText: '-', isHistorical: true },
    }
  );
}
// Alias for compatibility
export const generateMockChartData = getChartDataForMonth;

export const MOCK_CYCLES: CycleData[] = [
  {
    id: '1',
    startDate: '2023-05-10',
    periodLength: 5,
    length: 29,
    periodIntensity: 'medium',
    ovulationDay: 14,
    ovulationConfirmed: true,
  },
  {
    id: '2',
    startDate: '2023-06-08',
    periodLength: 5,
    length: 28,
    periodIntensity: 'heavy',
    ovulationDay: 13,
    ovulationConfirmed: true,
  },
  {
    id: '3',
    startDate: '2023-07-06',
    periodLength: 4,
    length: 27,
    periodIntensity: 'medium',
    ovulationDay: 15,
    ovulationConfirmed: true,
  },
  {
    id: '4',
    startDate: '2023-08-02',
    periodLength: 5,
    length: 28,
    periodIntensity: 'medium',
    ovulationDay: 14,
    ovulationConfirmed: true,
  },
  {
    id: '5',
    startDate: '2023-08-30',
    periodLength: 6,
    length: 30,
    periodIntensity: 'light',
    ovulationDay: 16,
    ovulationConfirmed: false,
  },
  {
    id: '6',
    startDate: '2023-09-29',
    periodLength: 5,
    length: 28,
    periodIntensity: 'medium',
    ovulationDay: 14,
    ovulationConfirmed: false,
  },
];

export type Intensity = 'light' | 'medium' | 'heavy';

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

export function getAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function downloadCSV(data: CycleData[], includeNotes: boolean = false) {
  const headers = ['Start Date', 'Cycle Length (Days)', 'Period Duration (Days)', 'Intensity'];
  // if (includeNotes) headers.push('Notes'); // Notes not in interface yet? Added below.

  const rows = data.map((cycle) => {
    const row = [cycle.startDate, cycle.length, cycle.periodLength, cycle.periodIntensity];
    // if (includeNotes) row.push(cycle.notes || '');
    return row;
  });

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cycle_data_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Insights Types
export type InsightType = 'today' | 'cycle-stats' | 'nutrition';

export interface StatItem {
  value: string;
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export interface ConfidenceBlock {
  label: string;
  score: number;
  message: string;
}

export interface Warning {
  title: string;
  description: string;
}

export interface InsightPageData {
  card: {
    title: string;
    description: string;
    subtitle: string;
    isLocked?: boolean;
    lockLabel?: string;
    lastUpdated?: string;
  };
  stats: StatItem[];
  sourceText?: string;
  notifications?: string[];
  confidence?: ConfidenceBlock;
  warning?: Warning;
}

export const MOCK_INSIGHTS: Record<InsightType, InsightPageData> = {
  today: {
    card: {
      title: 'TODAY',
      description: 'Day --',
      subtitle: 'Calculating...',
    },
    stats: [
      { value: 'Follicular', label: 'Phase' },
      { value: '28%', label: 'Confidence' },
      { value: 'Confirmed', label: 'Ovulation', variant: 'success' },
    ],
    sourceText: 'Based on past cycles. Data is consistent with previous months.',
    notifications: ['Ovulation predicted in 2 days', 'Log temperature to confirm'],
    confidence: {
      label: 'Medium Confidence',
      score: 65,
      message: 'Prediction based on cycle history. Log temperature daily to increase accuracy.',
    },
  },

  'cycle-stats': {
    card: {
      title: 'CYCLE STATS',
      description: '-- Days',
      subtitle: 'Loading...',
    },
    stats: [
      { value: '±2 days', label: 'Variation' },
      { value: '96%', label: 'Logging rate' },
      { value: '5 days', label: 'Avg Period' },
      { value: 'No significant gaps', label: 'Data Gaps' },
    ],
    sourceText: 'Analysis based on last 6 cycles.',
    notifications: ['Period length is consistent', 'No unusual symptoms reported'],
    confidence: {
      label: 'High Confidence',
      score: 85,
      message:
        'Based on the consistency of your last 4 cycles. Your data is showing strong patterns.',
    },
  },

  nutrition: {
    card: {
      title: 'NUTRITION',
      description: 'Calcium Intake',
      subtitle: 'Premium Content',
      isLocked: true,
      lockLabel: 'Premium',
    },
    stats: [],
    sourceText: 'Connect your health data source.',
  },
};

export const MOCK_APP_STATE = {
  isInsufficient: false,
  disclaimer: 'Predictions are estimates only. Not for contraception.',
};
