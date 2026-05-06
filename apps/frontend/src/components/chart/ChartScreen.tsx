import * as React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { TrendingUp, AlertCircle, Info, Lock } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Header } from '../common/Header';
import { InsetGroup } from '../common/ui/inset-group';
import { DateNavigator } from '../common/ui/date-navigator';
import { ChartsView } from './charts/ChartsView';
import { ExportView } from './charts/ExportView';
import { MOCK_CYCLES, generateMockChartData, type MockChartData, type ChartDay } from '../../lib/mock-data'; // Use lib types
import { QuickStats } from './charts/QuickStats';
import { useSwipe } from '../common/hooks/useSwipe';
import { usePremiumFeatures } from '../../lib/featureFlags';
import { apiJson } from '../../lib/api';
// Removed local ChartDay/ChartData types below



function riskColor(risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA') {
    // Legacy helper kept just in case but likely unused with new Status
    if (risk === 'HIGH') return 'bg-rose-500';
    if (risk === 'MEDIUM') return 'bg-amber-500';
    if (risk === 'LOW') return 'bg-emerald-500';
    return 'bg-zinc-200 dark:bg-zinc-800';
}


export function ChartScreen() {
    // If usePremiumFeatures isn't available, default to false or mock it. 
    // Assuming standard hook usage.
    const { premiumEnabled } = usePremiumFeatures();


    // Viewed Month State
    const [viewDate, setViewDate] = React.useState(new Date());
    const [activeTab, setActiveTab] = React.useState<'calendar' | 'stats' | 'export' | 'today'>('calendar');

    const changeMonth = (offset: number) => {
        const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(next);
    };

    // Calculate range for the current view
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    // Calendar Vars
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const calendarTitle = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();

    const swipeHandlers = useSwipe({
        onSwipeLeft: () => {
            if (!isCurrentMonth) changeMonth(1);
        },
        onSwipeRight: () => {
            if (!isPrevDisabled) changeMonth(-1);
        },
    });

    // Data Fetching
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

    // 1. Calendar Data (Includes QuickStats)
    interface CalendarDay {
        date: string;
        status: 'period' | 'fertile' | 'safe' | 'unsure';
        ovulationConfirmed: boolean;
        isToday: boolean;
    }

    interface CalendarResponse {
        days: CalendarDay[];
        quickStats: any;
        minDate?: string;
    }

    const calendarQuery = useQuery({
        queryKey: ['calendar', startOfMonth, endOfMonth],
        queryFn: async () => {
            return apiJson<CalendarResponse>(`/api/v1/insights/calendar?start=${startOfMonth}&end=${endOfMonth}`)
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000,   // 15 minutes
    });

    // 2. Stats Data (Cycle History)
    const statsQuery = useQuery({
        queryKey: ['stats'],
        queryFn: async () => apiJson<any>('/api/v1/insights/stats'),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000,   // 15 minutes
    });

    // Combined Loading State
    const loading = calendarQuery.isLoading || statsQuery.isLoading;
    const data = calendarQuery.data || { days: [], quickStats: null, minDate: null };
    const statsData = statsQuery.data?.history || []; // Extract history array for ChartsView

    // Fallback for QuickStats if API returns null (e.g. fresh user)
    // We can use a default "Day 1" state
    const quickStats = data.quickStats || {
        isHistorical: false,
        isPredicted: false,
        cycleDay: 1,
        daysToPeriod: null,
        fertilityStatus: 'Low',
        phase: 'Follicular'
    };

    // Calculate Min Date Limit Logic
    const minDateStr = data.minDate || '2020-01-01';

    // Parse "YYYY-MM-DD" parts explicitly to create a local date at start of month
    // This avoids "new Date('YYYY-MM-DD')" being treated as UTC and shifting to previous day/month
    const [minY, minM] = minDateStr.split('-').map(Number);
    const minMonthStart = new Date(minY, minM - 1, 1);

    const viewingMonthStart = new Date(currentYear, currentMonth, 1);

    // If we are currently AT the minimum month (or somehow before it), we cannot go previous.
    // e.g. Min=Feb, Current=Feb. Prev=Jan (invalid). So Disabled.
    const isPrevDisabled = viewingMonthStart <= minMonthStart;

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-sm text-zinc-500">Loading chart...</div>
            </div>
        );
    }

    // Empty State Handling Removed - Always show grid
    // If we have no history, we still show the grid so users can see the restricted range.


    const dayMap = new Map(data.days.map((d: any) => [d.date, d]));

    return (
        <div className="h-full bg-background font-sans flex flex-col">
            <Header />
            <div className="flex-1 flex flex-col min-h-0">
                <div className="px-6 py-4 flex flex-col h-full">
                    <div className="max-w-md mx-auto w-full flex flex-col h-full">

                        {/* Tab Navigation */}
                        <div className="flex gap-2 mb-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1">
                            <button
                                onClick={() => setActiveTab('calendar')}
                                className={cn(
                                    "flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200",
                                    activeTab === 'calendar'
                                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                        : "text-zinc-500 dark:text-zinc-400"
                                )}
                            >
                                Calendar
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={cn(
                                    "flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200",
                                    activeTab === 'stats'
                                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                        : "text-zinc-500 dark:text-zinc-400"
                                )}
                            >
                                Stats
                            </button>
                            <button
                                onClick={() => setActiveTab('export')}
                                className={cn(
                                    "flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200",
                                    activeTab === 'export'
                                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                        : "text-zinc-500 dark:text-zinc-400"
                                )}
                            >
                                Data
                            </button>
                        </div>

                        {/* Tab Content - fills remaining space */}
                        <div className="flex-1 min-h-0 overflow-y-auto">

                            {/* Calendar Tab */}
                            {activeTab === 'calendar' && (
                                <div className="h-full flex flex-col pt-2 px-3 pb-2">
                                    {/* Simple Container Card */}
                                    <div
                                        className="w-full max-w-sm mx-auto bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col"
                                        {...swipeHandlers}
                                    >

                                        {/* Header */}
                                        <div className="pt-2 px-1">
                                            <DateNavigator
                                                label={calendarTitle}
                                                sublabel={isCurrentMonth ? "Current" : undefined}
                                                onPrev={() => changeMonth(-1)}
                                                onNext={() => changeMonth(1)}
                                                nextDisabled={isCurrentMonth}
                                                prevDisabled={isPrevDisabled}
                                            />
                                        </div>

                                        {/* Calendar Grid */}
                                        <div className="px-4 pb-6">
                                            {/* Weekday Headers */}
                                            <div className="grid grid-cols-7 text-center mb-4">
                                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                                                    <div key={idx} className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">{d}</div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-7 gap-y-1">
                                                {/* Empty pre-padding */}
                                                {Array.from({ length: firstDay }).map((_, i) => (
                                                    <div key={`empty-${i}`} className="h-8" />
                                                ))}

                                                {/* Days */}
                                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                                    const dayNum = i + 1;
                                                    const dateObj = new Date(currentYear, currentMonth, dayNum);
                                                    const offset = dateObj.getTimezoneOffset();
                                                    const localDate = new Date(dateObj.getTime() - (offset * 60000));
                                                    const dateIso = localDate.toISOString().slice(0, 10);

                                                    const dayData = dayMap.get(dateIso);
                                                    const isFuture = dateIso > todayStr;
                                                    const isToday = dateIso === todayStr;
                                                    const isRestricted = dateIso < minDateStr;

                                                    // Modern Minimal Styling
                                                    // Use softer, more sophisticated colors from iOS standard
                                                    let bgClass = '';
                                                    let textClass = 'text-zinc-900 dark:text-white font-medium';
                                                    let ringClass = '';

                                                    if (dayData && dayData.status) {
                                                        const s = dayData.status.toLowerCase(); // Defensive lowercasing
                                                        if (s === 'period') {
                                                            // Period = Red
                                                            if (isFuture || isRestricted) {
                                                                bgClass = 'bg-[#ff3b30]/20';
                                                                textClass = 'text-[#ff3b30] font-semibold';
                                                            } else {
                                                                bgClass = 'bg-[#ff3b30] shadow-sm';
                                                                textClass = 'text-white font-semibold';
                                                            }
                                                        } else if (s === 'fertile') {
                                                            // Fertile = Purple
                                                            if (isFuture || isRestricted) {
                                                                bgClass = 'bg-[#af52de]/20';
                                                                textClass = 'text-[#af52de] font-semibold';
                                                            } else {
                                                                bgClass = 'bg-[#af52de] shadow-sm';
                                                                textClass = 'text-white font-semibold';
                                                            }
                                                        } else if (s === 'safe') {
                                                            // Safe = Green
                                                            if (isFuture || isRestricted) {
                                                                bgClass = 'bg-emerald-100/30 dark:bg-emerald-500/5';
                                                                textClass = 'text-emerald-700/60 dark:text-emerald-300/60';
                                                            } else {
                                                                bgClass = 'bg-emerald-100/80 dark:bg-emerald-500/10';
                                                                textClass = 'text-emerald-700 dark:text-emerald-300';
                                                            }
                                                        }
                                                    }

                                                    // Today Logic - Minimal Ring or Solid Block
                                                    if (isToday) {
                                                        if (!bgClass) {
                                                            // Today (No Data) = Solid Circle (Theme color or Black)
                                                            bgClass = 'bg-zinc-900 dark:bg-zinc-100';
                                                            textClass = 'text-white dark:text-zinc-900 font-bold';
                                                        } else {
                                                            // Today (With Data) = Ring to act as outline
                                                            ringClass = 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-black';
                                                        }
                                                    }

                                                    // Restricted State Visual Override
                                                    if (isRestricted) {
                                                        // dim the text heavily
                                                        if (!bgClass) {
                                                            textClass = 'text-zinc-300 dark:text-zinc-700';
                                                        } else {
                                                            // keeping the colored bg but creating a 'disabled' look is tricky
                                                            // let's rely on the opacity we set in the Period/Fertile blocks above (bg-color/20)
                                                            // but also grayscale?
                                                            // simple approach: just make it look "future-like" (faded) plus strictly no click
                                                        }
                                                    }

                                                    return (
                                                        <div
                                                            key={dayNum}
                                                            onClick={() => {
                                                                if (isFuture || isRestricted) return;
                                                                window.location.hash = `#/log?date=${dateIso}`;
                                                            }}
                                                            className={cn(
                                                                "flex flex-col items-center justify-start h-10 relative group",
                                                                (isFuture || isRestricted) ? "cursor-default" : "cursor-pointer"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] transition-all duration-300",
                                                                (!isFuture && !isRestricted) && "hover:scale-105",
                                                                isRestricted && "opacity-40 grayscale-[0.5]",
                                                                bgClass,
                                                                textClass,
                                                                ringClass
                                                            )}>
                                                                {dayNum}
                                                            </div>

                                                            {/* Minimal indicator dot for notes/tests, centered below */}
                                                            {dayData?.ovulationConfirmed && (
                                                                <div className="absolute -bottom-1 w-[3px] h-[3px] rounded-full bg-blue-500" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                                        {/* Footer Hint */}
                                        <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/30">
                                            <p className="text-center text-[13px] text-zinc-400 dark:text-zinc-500 font-medium">
                                                Tap to view details
                                            </p>
                                        </div>
                                    </div>

                                    {/* Smooth Legend (Outside Card) */}
                                    <div className="mt-6 px-6">
                                        <div className="flex justify-between max-w-[260px] mx-auto text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30]" />
                                                <span>Period</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#af52de]" />
                                                <span>Fertile</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20" />
                                                <span>Safe</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                                                <span>Today</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Stats - Added Phase 4 */}
                                    <QuickStats data={quickStats} />
                                </div>
                            )}

                            {/* Stats Tab */}
                            {activeTab === 'stats' && (
                                <ChartsView
                                    data={statsData}
                                    insufficientData={statsQuery.data?.insufficientData}
                                    trends={statsQuery.data?.trends || []}
                                />
                            )}

                            {/* Export Tab */}
                            {activeTab === 'export' && (
                                <ExportView data={statsData} />
                            )}

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
