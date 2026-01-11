import * as React from 'react';
import { Calendar as CalendarIcon, TrendingUp, Info, AlertTriangle, ChevronDown, Clock } from 'lucide-react';
import { addDays, format, isAfter, isBefore, parseISO, startOfDay, startOfWeek, subWeeks } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

import { apiJson, fertilityPct, type Risk, riskBadgeVariant } from '../lib/api';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

type ChartDay = {
  date: string;
  fertilityIndex: number;
  risk: Risk;
  temperature: number | null;
  lhTest: 'positive' | 'negative' | 'notTaken';
};

type ChartData = {
  cycle: {
    id: string;
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
    coverage: { temp: number; mucus: number; lh: number; any: number; critical_gap: boolean };
    signals: Array<{ source: 'BBT' | 'LH' | 'MUCUS' | 'CALENDAR'; anchor: number; reliability: number; explain: string }>;
    warnings: string[];
    flags: { pcos_like: boolean; pcos_score: number; pcos_reasons: string[] };
    todayCycleDay: number;
    todayRisk: Risk;
  } | null;
  days: ChartDay[];
  disclaimer: string;
};

function stateLabel(state: string): string {
  const s = state.toUpperCase();
  if (s.includes('POST')) return 'Fertility likely closed';
  if (s.includes('PEAK')) return 'Fertility open (peak signals)';
  if (s.includes('FERTILE')) return 'Fertility may be open';
  if (s.includes('INFERTILE')) return 'Fertility not yet closed';
  return state;
}

function yesNo(v: boolean): string {
  return v ? 'Yes' : 'No';
}

export function ChartScreen() {
  const chartQuery = useQuery({
    queryKey: ['chart'],
    queryFn: () => apiJson<ChartData>('/chart'),
  });

  const loading = chartQuery.isLoading;
  const data = chartQuery.isError ? null : chartQuery.data ?? null;
  const analytics = data?.analytics ?? null;
  const confPct = analytics ? Math.round((analytics.confidence ?? 0) * 100) : null;
  const confidenceLabel = (() => {
    const c = analytics?.confidence ?? 0;
    if (c < 0.45) return 'Low';
    if (c < 0.7) return 'Medium';
    return 'High';
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Chart</div>
        <h1 className="text-2xl font-semibold tracking-tight">Your cycle timeline</h1>
        <p className="text-sm text-muted-foreground">Track your patterns and understand your fertility window.</p>
      </div>

      {/* Calendar Hero Section */}
      {data ? (
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Last 5 weeks</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Visual overview of your cycle. Today is highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const today = startOfDay(new Date());
              const weekStart = startOfWeek(today, { weekStartsOn: 1 });
              const start = subWeeks(weekStart, 4);
              const cycleStart = parseISO(data.cycle.startDate);
              const todayIso = format(today, 'yyyy-MM-dd');
              const windowStart =
                analytics?.windowCycleDay?.start != null ? addDays(cycleStart, Number(analytics.windowCycleDay.start) - 1) : null;
              const windowEnd =
                analytics?.windowCycleDay?.end != null ? addDays(cycleStart, Number(analytics.windowCycleDay.end) - 1) : null;

              function withinWindow(d: Date): boolean {
                if (!windowStart || !windowEnd) return false;
                if (isBefore(d, cycleStart)) return false;
                if (isAfter(d, today)) return false;
                if (isBefore(d, windowStart)) return false;
                if (isAfter(d, windowEnd)) return false;
                return true;
              }

              const loggedByDate = new Map<string, ChartDay>();
              for (const d of data.days) loggedByDate.set(d.date, d);

              const days: (Date | null)[] = [];
              let currentDate = new Date(start);

              // Generate days with month boundary logic
              while (days.length < 35 && currentDate <= today) {
                const currentMonth = currentDate.getMonth();
                const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

                // If we're at the start of a new month and not the first month, add empty cells to align to next row
                if (days.length > 0 && currentMonth !== start.getMonth() && currentDate.getDay() !== 1) {
                  const daysToNextWeek = (8 - currentDate.getDay()) % 7 || 7;
                  for (let i = 0; i < daysToNextWeek - 1 && days.length < 35; i++) {
                    days.push(null); // Empty cell for month break
                  }
                }

                // Add the days of the current week
                const weekDays = [];
                for (let i = 0; i < 7; i++) {
                  const weekDay = addDays(currentWeekStart, i);
                  if (weekDay <= today && days.length < 35) {
                    days.push(weekDay);
                    currentDate = addDays(weekDay, 1);
                  }
                }

                // Move to next week
                currentDate = addDays(currentWeekStart, 7);
              }

              const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

              return (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground text-center">
                    {format(start, 'MMM d')}–{format(today, 'MMM d, yyyy')}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {weekdayLabels.map((d) => (
                      <div key={d} className="h-5 w-10 text-center text-xs font-medium text-muted-foreground">
                        {d}
                      </div>
                    ))}

                    {days.map((dt, index) => {
                      // Handle empty cells for month breaks
                      if (dt === null) {
                        return <div key={`empty-${index}`} className="h-10 w-10" aria-hidden="true" />;
                      }

                      const isFuture = isAfter(dt, today);
                      const iso = format(dt, 'yyyy-MM-dd');
                      const entry = loggedByDate.get(iso);
                      const outOfCycle = isBefore(dt, cycleStart);
                      const isToday = iso === todayIso;
                      const lh = entry?.lhTest === 'positive';

                      const inWindow = withinWindow(dt);
                      const prev = days[index - 1];
                      const next = days[index + 1];
                      const connectsLeft =
                        inWindow &&
                        prev instanceof Date &&
                        withinWindow(prev) &&
                        format(prev, 'yyyy-MM-dd') === format(addDays(dt, -1), 'yyyy-MM-dd');
                      const connectsRight =
                        inWindow &&
                        next instanceof Date &&
                        withinWindow(next) &&
                        format(next, 'yyyy-MM-dd') === format(addDays(dt, 1), 'yyyy-MM-dd');

                      if (isFuture) {
                        return <div key={iso} className="h-10 w-10" aria-hidden="true" />;
                      }

                      const circleClass = outOfCycle
                        ? 'bg-muted/20 text-muted-foreground/40'
                        : entry
                          ? entry.risk === 'HIGH'
                            ? 'bg-[hsl(var(--risk-high))] text-white'
                            : entry.risk === 'MEDIUM'
                              ? 'bg-[hsl(var(--risk-medium))] text-white'
                              : 'bg-[hsl(var(--risk-low))] text-white'
                          : 'border-2 border-dashed border-[hsl(var(--risk-high))] text-foreground';

                      const todayClass = isToday ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : '';

                      return (
                        <div key={iso} className="relative h-10 w-10" aria-label={iso}>
                          {inWindow ? (
                            <span
                              aria-hidden="true"
                              className={[
                                'absolute inset-y-2',
                                connectsLeft ? '-left-1' : 'left-0',
                                connectsRight ? '-right-1' : 'right-0',
                                connectsLeft ? '' : 'rounded-l-full',
                                connectsRight ? '' : 'rounded-r-full',
                              ].join(' ')}
                              style={{ backgroundColor: 'hsl(var(--risk-high) / 0.14)' }}
                            />
                          ) : null}

                          <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums ${circleClass} ${todayClass}`}>
                            <span>{dt.getDate()}</span>
                            {lh ? (
                              <span
                                className="absolute -bottom-0.5 h-1.5 w-1.5 rounded-full bg-white"
                                aria-label="LH positive"
                              />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-6 rounded-full"
                        style={{ backgroundColor: 'hsl(var(--risk-high) / 0.14)' }}
                      />
                      Fertile window
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[hsl(var(--risk-high))]" />
                      High risk
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[hsl(var(--risk-medium))]" />
                      Medium risk
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[hsl(var(--risk-low))]" />
                      Low risk
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-dashed border-[hsl(var(--risk-high))]" />
                      No data
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      ) : null}

      {/* Cycle Insights Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Current Cycle Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cycle status</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {loading ? 'Loading…' : data?.cycle?.state ? stateLabel(data.cycle.state) : 'No data'}
                </div>
                {data?.cycle?.startDate && (
                  <div className="text-xs text-muted-foreground">
                    Started {format(parseISO(data.cycle.startDate), 'MMM d')}
                  </div>
                )}
              </div>
            </div>

            {/* Key Insights */}
            {analytics && (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Ovulation</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.confirmed ? 'Confirmed' : 'Not yet confirmed'}
                  </div>
                </div>

                {analytics.warnings?.length && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">{analytics.warnings[0]}</div>
                  </div>
                )}
              </>
            )}

            {/* Expandable Details */}
            <details className="group">
              <summary className="cursor-pointer flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">Cycle details</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 space-y-3 pl-3 border-l-2 border-muted">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Peak detected:</span> {data ? yesNo(Boolean(data.cycle.peakDate)) : '—'}
                </div>
                {analytics && (
                  <>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Confidence:</span> {confidenceLabel} ({confPct}%)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Fertile window:</span> Cycle days {analytics.windowCycleDay.start}–{analytics.windowCycleDay.end}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Data gaps:</span> {yesNo(Boolean(analytics.coverage?.critical_gap))}
                    </div>
                  </>
                )}
              </div>
            </details>

            {/* Disclaimer */}
            <div className="text-xs text-muted-foreground pt-2 border-t border-muted/50">
              This is a retrospective view only. No predictions. If uncertain, assume fertile.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Timeline */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Recent days</CardTitle>
          </div>
          <CardDescription className="text-sm">Your latest logged data and temperature readings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.days ?? []).slice().reverse().slice(0, 7).map((d) => {
            const pct = fertilityPct(d.fertilityIndex);
            const temp = d.temperature == null ? '—' : Number(d.temperature).toFixed(1);
            const lhPositive = d.lhTest === 'positive';
            return (
              <div key={d.date} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="text-sm tabular-nums text-muted-foreground min-w-[80px]">
                    {format(parseISO(d.date), 'MMM d')}
                  </div>
                  <Badge variant={riskBadgeVariant(d.risk)} className="text-xs">
                    {d.risk}
                  </Badge>
                  {lhPositive && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-[hsl(var(--risk-high))]" />
                      LH+
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          background: `hsl(var(--${d.risk === 'HIGH' ? 'risk-high' : d.risk === 'MEDIUM' ? 'risk-medium' : 'risk-low'}))`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-sm tabular-nums text-muted-foreground min-w-[40px] text-right">
                    {temp}°
                  </div>
                </div>
              </div>
            );
          })}

          {(data?.days ?? []).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No logged data yet for this cycle.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
