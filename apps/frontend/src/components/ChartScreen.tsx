import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertCircle, Info } from 'lucide-react';

import { apiJson, type Risk } from '../lib/api';
import { cn } from '../lib/utils';
import { Header } from './Header';
import { InsetGroup } from './ui/inset-group';
import { DateNavigator } from './ui/date-navigator';

type ChartDay = {
    date: string;
    risk: Risk;
    temperature: number | null;
    fertilityIndex: number;
    lhTest: 'positive' | 'negative' | 'notTaken';
};

type ChartData = {
    cycle: {
        startDate: string;
        state: string;
        peakDate: string | null;
        tempShiftConfirmedDate: string | null;
    };
    analytics?: {
        anchorCycleDay: number;
        windowCycleDay: { start: number; end: number };
        confidence: number;
        confirmed: boolean;
        warnings: string[];
        coverage: { critical_gap: boolean };
    } | null;
    days: ChartDay[];
};

function riskColor(risk: Risk): string {
    if (risk === 'HIGH') return 'bg-rose-500';
    if (risk === 'MEDIUM') return 'bg-amber-500';
    if (risk === 'LOW') return 'bg-emerald-500';
    return 'bg-zinc-200 dark:bg-zinc-800';
}

export function ChartScreen() {
    const chartQuery = useQuery({
        queryKey: ['chart'],
        queryFn: () => apiJson<ChartData>('/api/chart'),
    });

    const loading = chartQuery.isLoading;
    const data = chartQuery.data;

    // Viewed Month State
    const [viewDate, setViewDate] = React.useState(new Date());

    const changeMonth = (offset: number) => {
        const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(next);
    };

    // Calendar Generation based on viewDate
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const calendarTitle = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-sm text-zinc-500">Loading chart...</div>
            </div>
        );
    }

    if (!data || !data.days.length) {
        return (
            <div className="h-full bg-background font-sans flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col min-h-0 items-center justify-center">
                    <div className="px-6 pb-24 w-full">
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="text-center space-y-4">
                                <TrendingUp className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700" />
                                <div className="space-y-4">
                                    <h2 className="text-[20px] font-bold tracking-tight">No Data Available</h2>
                                    <p className="text-[17px] text-zinc-500 leading-relaxed px-4">
                                        Logs will appear here once you start tracking your signs.
                                    </p>
                                </div>
                                <a
                                    href="#/log"
                                    className="inline-block bg-[#007aff] hover:bg-[#006ee6] text-white font-semibold text-[17px] h-12 flex items-center justify-center px-8 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/10"
                                >
                                    Log First Entry
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const dayMap = new Map(data.days.map(d => [d.date, d]));

    return (
        <div className="h-full bg-background font-sans flex flex-col">
            <Header />
            <div className="flex-1 flex flex-col min-h-0">
                <div className="px-6 py-4 pb-24">
                    <div className="max-w-md mx-auto space-y-6">

                        {/* Month Navigator */}
                        <DateNavigator
                            label={calendarTitle}
                            sublabel={isCurrentMonth ? "Current Month" : "Monthly View"}
                            onPrev={() => changeMonth(-1)}
                            onNext={() => changeMonth(1)}
                            nextDisabled={isCurrentMonth}
                        />

                        {/* Screen Time Style Hero */}
                        <div className="px-1 pt-2 space-y-1">
                            <div className="text-[14px] font-semibold text-zinc-500 uppercase tracking-tight">Today's Risk</div>
                            <div className="flex items-baseline gap-2">
                                <span className={cn(
                                    "text-5xl font-bold tracking-tight",
                                    data.days.find(d => d.date === todayStr)?.risk === 'HIGH' ? "text-rose-500" :
                                        data.days.find(d => d.date === todayStr)?.risk === 'MEDIUM' ? "text-amber-500" : "text-emerald-500"
                                )}>
                                    {data.days.find(d => d.date === todayStr)?.risk || "LOW"}
                                </span>
                                <span className="text-[17px] font-medium text-zinc-400">Risk</span>
                            </div>
                        </div>

                        {/* Signature Screen Time Bar Chart (Last 7 Days) */}
                        <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[13px] font-bold text-zinc-400 uppercase tracking-tight">Last 7 Days</div>
                                <div className="flex items-center gap-1 text-[13px] font-medium text-[#007aff]">
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Cycle Insight</span>
                                </div>
                            </div>
                            <div className="flex items-end justify-between h-32 pt-2">
                                {data.days.slice(-7).map((day, i) => {
                                    const height = day.risk === 'HIGH' ? 'h-full' : day.risk === 'MEDIUM' ? 'h-2/3' : 'h-1/3';
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-2 group flex-1">
                                            <div className={cn(
                                                "w-full max-w-[12px] rounded-t-sm transition-all duration-300",
                                                height,
                                                riskColor(day.risk)
                                            )} />
                                            <div className="text-[10px] font-bold text-zinc-400">
                                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cycle Details - Secondary Stats */}
                        <div className="grid grid-cols-2 gap-4 px-1 py-2">
                            <div className="space-y-0.5">
                                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">Cycles State</div>
                                <div className="text-[16px] font-semibold text-foreground capitalize">{data.cycle.state.replace(/_/g, ' ')}</div>
                            </div>
                            <div className="space-y-0.5">
                                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">Ovulation</div>
                                <div className="text-[16px] font-semibold text-foreground">{data.analytics?.confirmed ? 'Confirmed' : 'Tracking'}</div>
                            </div>
                        </div>

                        {/* Monthly Calendar View */}
                        <InsetGroup title="Monthly View">
                            <div className="p-4 bg-card">
                                <div className="grid grid-cols-7 gap-y-7 text-center">
                                    {/* Weekday Headers */}
                                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                        <div key={d} className="text-[10px] font-bold text-zinc-400 tracking-widest">{d}</div>
                                    ))}

                                    {/* Empty pre-padding */}
                                    {Array.from({ length: firstDay }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}

                                    {/* Days */}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const dayNum = i + 1;
                                        const dateObj = new Date(currentYear, currentMonth, dayNum);
                                        // Handle timezone offset for ISO string
                                        const offset = dateObj.getTimezoneOffset();
                                        const localDate = new Date(dateObj.getTime() - (offset * 60000));
                                        const dateIso = localDate.toISOString().slice(0, 10);

                                        const dayData = dayMap.get(dateIso);
                                        const isFuture = dateIso > todayStr;
                                        const isToday = dateIso === todayStr;

                                        return (
                                            <div key={dayNum} className="flex flex-col items-center justify-center relative py-0.5">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-full flex items-center justify-center text-[16px] transition-all duration-200 relative",
                                                    isToday && !dayData ? "border-2 border-[#007aff] text-[#007aff] font-bold" : "",
                                                    isFuture ? "text-zinc-300 dark:text-zinc-700 font-normal" : "text-foreground font-medium",
                                                )}>
                                                    {/* Background Dot for mapped data */}
                                                    {dayData && (
                                                        <div className={cn(
                                                            "absolute inset-0 m-auto w-[34px] h-[34px] rounded-full z-0 shadow-sm",
                                                            riskColor(dayData.risk)
                                                        )} />
                                                    )}

                                                    {/* Day Number */}
                                                    <span className={cn(
                                                        "z-10",
                                                        dayData ? "text-white font-semibold" : ""
                                                    )}>
                                                        {dayNum}
                                                    </span>
                                                </div>

                                                {/* LH+ Indicator */}
                                                {dayData?.lhTest === 'positive' && (
                                                    <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#1C1C1E]" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </InsetGroup>

                        {/* Data Quality & Warnings */}
                        {data.analytics?.coverage.critical_gap && (
                            <div className="mx-1 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-amber-900 dark:text-amber-400">Data Missing</div>
                                    <div className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed">
                                        Multiple consecutive days are missing logs. This reduces analysis confidence.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Legend Inset */}
                        <InsetGroup title="Legend">
                            <div className="divide-y divide-border/30">
                                {[
                                    { color: 'bg-emerald-500', label: 'Low Risk', info: 'Safe' },
                                    { color: 'bg-amber-500', label: 'Medium Risk', info: 'Caution' },
                                    { color: 'bg-rose-500', label: 'High Risk', info: 'Fertile' },
                                    { color: 'bg-zinc-200 dark:bg-zinc-800', label: 'No Data', info: 'Logged' }
                                ].map((item, i) => (
                                    <div key={i} className="flex h-12 items-center justify-between px-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-5 h-5 rounded-md", item.color)} />
                                            <span className="text-[17px] font-normal text-zinc-900 dark:text-zinc-100">{item.label}</span>
                                        </div>
                                        <span className="text-[14px] text-zinc-400">{item.info}</span>
                                    </div>
                                ))}
                                <div className="flex h-12 items-center justify-between px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                        </div>
                                        <span className="text-[17px] font-normal text-zinc-900 dark:text-zinc-100">LH+ Detected</span>
                                    </div>
                                    <Info className="w-4 h-4 text-zinc-300" />
                                </div>
                            </div>
                        </InsetGroup>

                    </div>
                </div>
            </div>
        </div>
    );
}
