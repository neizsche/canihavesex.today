import { QueryClient } from '@tanstack/react-query';

export type TodayData = {
    date: string;
    risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
    explanation: string;
    disclaimer?: string;
    analytics?: {
        confidence: number;
        todayCycleDay: number;
        confirmed: boolean;
        warnings: string[];
        signals: Array<{ source: string; explain: string }>;
        coverage: { critical_gap: boolean };
    } | null;
};

export type ChartDay = {
    date: string;
    risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
    temperature: number | null;
    fertilityIndex: number;
    lhTest: 'positive' | 'negative' | 'notTaken';
};

export type ChartData = {
    cycle: {
        id?: string;
        startDate: string;
        state: string;
        peakDate: string | null;
        tempShiftConfirmedDate: string | null;
    } | null;
    analytics?: {
        anchorCycleDay: number;
        windowCycleDay: { start: number; end: number };
        confidence: number;
        confirmed: boolean;
        warnings: string[];
        coverage: { critical_gap: boolean };
    } | null;
    days: ChartDay[];
    disclaimer?: string;
};

export type MutationResponse = {
    ok: boolean;
    today?: TodayData;
    chart?: ChartData;
    [key: string]: any;
};

/**
 * Update cache with data from mutation responses
 * Eliminates need for refetches after mutations
 */
export function updateCacheFromMutation(
    queryClient: QueryClient,
    response: MutationResponse
): void {
    if (response.today) {
        queryClient.setQueryData(['today'], response.today);
    }

    if (response.chart) {
        queryClient.setQueryData(['chart'], response.chart);
    }
}
