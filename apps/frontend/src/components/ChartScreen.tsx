import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { addDays, format, isAfter, isBefore, parseISO, startOfDay, startOfWeek, subWeeks } from 'date-fns';

import { apiFetch, fertilityPct, type Risk, riskBadgeVariant } from '../lib/api';
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
  const [authChecked, setAuthChecked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [authed, setAuthed] = React.useState(true);
  const [data, setData] = React.useState<ChartData | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch('/api/chart');
        if (cancelled) return;

        if (res.status === 401) {
          location.href = `/auth?returnTo=${encodeURIComponent('/chart')}`;
          return;
        }

        if (!res.ok) throw new Error('Failed');
        const json = (await res.json()) as ChartData;
        setAuthed(true);
        setData(json);
        setLoading(false);
        setAuthChecked(true);
      } catch {
        if (cancelled) return;
        setAuthed(true);
        setData(null);
        setLoading(false);
        setAuthChecked(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authChecked) return <div className="min-h-[70dvh]" />;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="text-sm text-muted-foreground">Chart</div>
        <h1 className="text-2xl font-semibold tracking-tight">Cycle timeline</h1>
        <p className="text-sm text-muted-foreground">Retrospective view of this cycle only.</p>
      </header>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Current cycle</CardTitle>
            {data?.cycle?.state ? <Badge variant="outline">{data.cycle.state}</Badge> : null}
          </div>
          <CardDescription className="text-sm">
            {loading ? 'Loading…' : data ? 'Summary based on this cycle’s logged data.' : 'No data.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <div className="text-muted-foreground">Cycle started</div>
              <div className="tabular-nums">{data?.cycle?.startDate ?? '—'}</div>

              <div className="text-muted-foreground">Peak detected</div>
              <div>{data ? yesNo(Boolean(data.cycle.peakDate)) : '—'}</div>

              <div className="text-muted-foreground">Ovulation</div>
              <div>{data ? (data.cycle.tempShiftConfirmedDate ? 'Confirmed' : 'Not confirmed') : '—'}</div>

              <div className="text-muted-foreground">Current state</div>
              <div>{data?.cycle?.state ? stateLabel(data.cycle.state) : '—'}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            No predictions. Calendar view is retrospective. If uncertain, assume fertile.
          </div>
        </CardContent>
      </Card>

      {data ? (
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Last 5 weeks</CardTitle>
            </div>
            <CardDescription className="text-sm">Today is the last day shown. Future dates are disabled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const today = startOfDay(new Date());
              const weekStart = startOfWeek(today, { weekStartsOn: 1 });
              const start = subWeeks(weekStart, 4);
              const cycleStart = parseISO(data.cycle.startDate);
              const todayIso = format(today, 'yyyy-MM-dd');

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
                  <div className="text-xs text-muted-foreground">
                    {format(start, 'MMM d')}–{format(today, 'MMM d')}
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

                      const base = 'relative flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums';

                      if (isFuture) {
                        return <div key={iso} className="h-10 w-10" aria-hidden="true" />;
                      }

                      const stateClass = outOfCycle
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
                        <div key={iso} className={`${base} ${stateClass} ${todayClass}`} aria-label={iso}>
                          <span>{dt.getDate()}</span>
                          {lh ? (
                            <span
                              className="absolute -bottom-0.5 h-1.5 w-1.5 rounded-full bg-white"
                              aria-label="LH positive"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground">
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
                No log
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Timeline</CardTitle>
          <CardDescription className="text-sm">This cycle only. Most recent first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.days ?? []).slice().reverse().map((d) => {
            const pct = fertilityPct(d.fertilityIndex);
            const temp = d.temperature == null ? '—' : Number(d.temperature).toFixed(2);
            const lhPositive = d.lhTest === 'positive';
            return (
              <div key={d.date} className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm tabular-nums text-muted-foreground">{d.date}</div>
                  <div className="flex items-center gap-2">
                    {lhPositive ? <div className="h-2 w-2 rounded-full bg-[hsl(var(--risk-high))]" aria-label="LH positive" /> : null}
                    <Badge variant={riskBadgeVariant(d.risk)}>{d.risk}</Badge>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `hsl(var(--${d.risk === 'HIGH' ? 'risk-high' : d.risk === 'MEDIUM' ? 'risk-medium' : 'risk-low'}))`,
                      }}
                    />
                  </div>
                  <div className="text-sm tabular-nums text-muted-foreground">{temp}</div>
                </div>
              </div>
            );
          })}

          <div className="pt-2 text-xs text-muted-foreground">{data?.disclaimer ?? 'This is not medical advice. This does not guarantee pregnancy prevention.'}</div>
        </CardContent>
      </Card>
    </div>
  );
}
