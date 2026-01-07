import * as React from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';

import { apiFetch, type Risk, riskBadgeVariant } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

type TodayData = {
  date: string;
  risk: Risk;
  explanation: string;
  disclaimer: string;
};

type ChartData = {
  cycle: {
    startDate: string;
    state: string;
    peakDate: string | null;
    tempShiftConfirmedDate: string | null;
  };
  days: Array<{ date: string; fertilityIndex: number; lhTest: 'positive' | 'negative' | 'notTaken' }>;
};

function cycleStateLabel(state: string): string {
  const s = state.toUpperCase();
  if (s.includes('POST')) return 'Fertility likely closed';
  if (s.includes('PEAK')) return 'Fertility open (peak signals)';
  if (s.includes('FERTILE')) return 'Fertility may be open';
  if (s.includes('INFERTILE')) return 'Fertility not yet closed';
  return state;
}

function deriveWhyReasons(args: {
  chart: ChartData | null;
}): string[] {
  const chart = args.chart;
  if (!chart) return ['No cycle data available.'];

  const reasons: string[] = [];

  if (!chart.cycle.tempShiftConfirmedDate) reasons.push('Ovulation not confirmed (no temperature shift).');
  if (!chart.cycle.peakDate) reasons.push('No peak detected.');

  const days = chart.days ?? [];
  const recent = days.slice(-3);
  if (recent.length === 0) reasons.push('No recent logs in the current cycle.');

  const anyRecentHighIndex = recent.some((d) => d.fertilityIndex >= 5);
  if (anyRecentHighIndex) reasons.push('Fertile-quality signs were logged recently.');

  const anyRecentLhPositive = recent.some((d) => d.lhTest === 'positive');
  if (anyRecentLhPositive) reasons.push('A recent LH test was positive.');

  if (reasons.length === 0) reasons.push('Based on the current cycle state and logged observations.');
  return reasons;
}

export function TodayScreen() {
  const [authChecked, setAuthChecked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<TodayData | null>(null);
  const [chart, setChart] = React.useState<ChartData | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch('/api/today');
        if (cancelled) return;
        if (res.status === 401) {
          location.href = `/auth?returnTo=${encodeURIComponent('/')}`;
          return;
        }

        if (!res.ok) throw new Error('Failed');
        const json = (await res.json()) as TodayData;
        setData(json);

        try {
          const chartRes = await apiFetch('/api/chart');
          if (cancelled) return;
          if (chartRes.ok) {
            const chartJson = (await chartRes.json()) as ChartData;
            setChart(chartJson);
          }
        } catch {
          // ignore: Today can render without this.
        }

        setLoading(false);
        setAuthChecked(true);
      } catch {
        if (cancelled) return;
        setData({
          date: new Date().toISOString().slice(0, 10),
          risk: 'HIGH',
          explanation: 'Network error — cannot determine risk. Assume fertile.',
          disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
        });
        setLoading(false);
        setAuthChecked(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const risk = data?.risk ?? 'HIGH';
  const cycleLine = chart?.cycle?.state ? `Cycle state: ${cycleStateLabel(chart.cycle.state)}` : null;
  const whyReasons = deriveWhyReasons({ chart });

  if (!authChecked) return <div className="min-h-[70dvh]" />;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="text-sm text-muted-foreground">Today</div>
        <div className="text-sm text-muted-foreground tabular-nums">{data?.date ?? ''}</div>
      </header>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current status</CardTitle>
            <Badge variant={riskBadgeVariant(risk)}>{risk}</Badge>
          </div>
          <CardDescription className="text-sm">Use this as a conservative decision aid.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="text-4xl font-semibold tracking-tight">{risk}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {loading ? 'Loading…' : data?.explanation ?? ''}
            </div>
            {cycleLine ? <div className="mt-3 text-sm text-muted-foreground">{cycleLine}</div> : null}
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <details>
              <summary className="cursor-pointer select-none text-sm font-medium text-foreground">
                Why this result?
              </summary>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc space-y-1 pl-5">
                  {whyReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="text-xs text-muted-foreground">
                  This app is retrospective and conservative. If uncertain, assume fertile.
                </div>
              </div>
            </details>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button asChild className="h-11">
              <a href="/log">
                <ClipboardList className="mr-2 h-4 w-4" />
                Log today
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a href="/chart">
                View chart
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">{data?.disclaimer ?? ''}</div>
        </CardContent>
      </Card>
    </div>
  );
}
