import * as React from 'react';
import { ArrowRight, ClipboardList, Info, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { apiJson, type Risk, riskBadgeVariant } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

type TodayData = {
  date: string;
  risk: Risk;
  explanation: string;
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
  disclaimer: string;
};

type ChartData = {
  cycle: {
    startDate: string;
    state: string;
    peakDate: string | null;
    tempShiftConfirmedDate: string | null;
  };
  analytics?: unknown;
  days: Array<{ date: string; fertilityIndex: number; lhTest: 'positive' | 'negative' | 'notTaken' }>;
};


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

function confidenceLabel(confidence: number | null): { label: 'Low' | 'Medium' | 'High'; blurb: string } {
  const c = typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : 0;
  if (c < 0.45) return { label: 'Low', blurb: 'Not enough clear data yet — we stay cautious.' };
  if (c < 0.7) return { label: 'Medium', blurb: 'Some signs point one way, but there’s still uncertainty.' };
  return { label: 'High', blurb: 'Multiple strong signals line up.' };
}

function riskMeaning(risk: Risk): string {
  if (risk === 'HIGH') return 'Pregnancy is possible today. If you want to avoid pregnancy, treat today as fertile.';
  if (risk === 'MEDIUM') return 'Unclear today. If you want to avoid pregnancy, it\'s safest to assume you could be fertile.';
  if (risk === 'INSUFFICIENT_DATA') return 'We need more data to assess your fertility risk accurately.';
  return 'Risk is likely lower today, but never zero. If you want to avoid pregnancy, use protection if unsure.';
}

function keyReasons(analytics: NonNullable<TodayData['analytics']>): string[] {
  const reasons: string[] = [];
  const sources = new Set(analytics.signals.map((s) => s.source));

  if (sources.has('BBT')) reasons.push('A sustained temperature rise suggests ovulation has likely happened.');
  else reasons.push('No clear temperature rise yet, so we can’t “close” the fertile window.');

  if (sources.has('LH')) reasons.push('An LH test was positive recently (often happens near ovulation).');
  if (sources.has('MUCUS')) reasons.push('Fertile-type discharge was logged recently.');

  if (analytics.coverage.critical_gap) reasons.push('Some key days are missing logs, so we stay conservative.');

  if (analytics.flags?.pcos_like) reasons.push('Your pattern looks irregular this cycle, which lowers certainty.');

  // Keep it short for normal people.
  return reasons.slice(0, 4);
}

export function TodayScreen() {
  const todayQuery = useQuery({
    queryKey: ['today'],
    queryFn: () => apiJson<TodayData>('/api/today'),
  });

  const chartQuery = useQuery({
    queryKey: ['chart'],
    queryFn: () => apiJson<ChartData>('/api/chart'),
    enabled: todayQuery.isSuccess,
  });

  const loading = todayQuery.isLoading;
  const data: TodayData =
    todayQuery.data ??
    (todayQuery.isError
      ? {
          date: new Date().toISOString().slice(0, 10),
          risk: 'HIGH',
          explanation: 'Network error — cannot determine risk. Assume fertile.',
          disclaimer: '',
        }
      : { date: new Date().toISOString().slice(0, 10), risk: 'HIGH', explanation: '', disclaimer: '' });

  const chart = chartQuery.isError ? null : chartQuery.data ?? null;
  const risk = data.risk ?? 'HIGH';
  const whyReasons = deriveWhyReasons({ chart });
  const analytics = data.analytics ?? null;
  const confPct = analytics ? Math.round((analytics.confidence ?? 0) * 100) : null;
  const conf = confidenceLabel(analytics?.confidence ?? null);
  const reasons = analytics ? keyReasons(analytics) : whyReasons;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Today</div>
        <div className="text-sm text-muted-foreground tabular-nums">{data.date ?? ''}</div>
      </div>

      {/* Main Status - Hero Section */}
      <div className="space-y-3">
        <div className="text-center space-y-4">
          {risk === 'INSUFFICIENT_DATA' ? (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-200">
              <div className="text-3xl font-bold text-orange-600">!</div>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20">
              <div className="text-3xl font-bold text-primary">{risk}</div>
            </div>
          )}
          <div className="space-y-2">
            <div className="text-lg font-medium">{riskMeaning(risk)}</div>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="text-sm text-muted-foreground max-w-md mx-auto">{data?.explanation ?? ''}</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 pt-2">
          <Button asChild className="flex-1">
            <a href="/app#/log">
              <ClipboardList className="mr-2 h-4 w-4" />
              {risk === 'INSUFFICIENT_DATA' ? 'Start logging' : 'Log today'}
            </a>
          </Button>
          {risk !== 'INSUFFICIENT_DATA' && (
            <Button asChild variant="outline" className="flex-1">
              <a href="/app#/chart">
                <TrendingUp className="mr-2 h-4 w-4" />
                View chart
              </a>
            </Button>
          )}
          {risk === 'INSUFFICIENT_DATA' && (
            <Button asChild variant="outline" className="flex-1">
              <a href="/app#/chart">
                <Info className="mr-2 h-4 w-4" />
                Learn more
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Today's Analysis */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {risk === 'INSUFFICIENT_DATA' ? (
              /* Insufficient Data Guidance */
              <div className="space-y-4">
                <div className="text-center space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Getting started</div>
                  <div className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    To provide accurate fertility assessments, we need some basic information about your cycle.
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-medium text-blue-700">1</span>
                    </div>
                    <div className="text-sm text-blue-800">
                      <div className="font-medium">Log your temperature</div>
                      <div className="text-blue-700">Take your basal body temperature first thing in the morning.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-medium text-blue-700">2</span>
                    </div>
                    <div className="text-sm text-blue-800">
                      <div className="font-medium">Note your cervical mucus</div>
                      <div className="text-blue-700">Observe and record changes in your cervical fluid.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-medium text-blue-700">3</span>
                    </div>
                    <div className="text-sm text-blue-800">
                      <div className="font-medium">Track other signs</div>
                      <div className="text-blue-700">Record bleeding, LH tests, and how you feel.</div>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <div className="text-xs text-muted-foreground">
                    Start with today's observations to begin building your fertility profile.
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Analysis */
              <>
                <div className="space-y-3">
                  <div className="text-sm font-medium">Today's assessment</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {riskMeaning(risk)}
                  </div>
                </div>

                {/* Confidence Level */}
                {analytics && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Confidence</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {confPct}% ({conf.label.toLowerCase()})
                    </div>
                  </div>
                )}

                {/* Today's Warnings */}
                {analytics?.warnings?.length && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">{analytics.warnings[0]}</div>
                  </div>
                )}

                {/* Why Today */}
                <details className="group">
                  <summary className="cursor-pointer flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium">Why this assessment?</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-3 space-y-3 pl-3 border-l-2 border-muted">
                    {reasons.map((reason, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {reason}
                      </div>
                    ))}
                    <div className="pt-2 text-xs text-muted-foreground border-t border-muted/50">
                      This app uses conservative estimates. When in doubt, assume fertile.
                    </div>
                  </div>
                </details>
              </>
            )}

            {/* Disclaimer */}
            {data?.disclaimer && (
              <div className="text-xs text-muted-foreground pt-2 border-t border-muted/50">
                {data.disclaimer}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
