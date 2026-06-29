import * as React from 'react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/common/Header';
import { Loader2 } from 'lucide-react';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { DateNavigator } from '@/components/common/ui/date-navigator';
import { SegmentedTabs } from '@/components/common/ui/segmented-tabs';
import { ChartsView } from './stats/ChartsView';
import { ExportView } from './export/ExportView';
import { CalendarMonthGrid } from './calendar/CalendarMonthGrid';
import { CalendarLegend } from './calendar/CalendarLegend';
import { useSwipe } from '@/components/common/hooks/useSwipe';
import { toIsoDate } from '@/lib/date';
import { useChartData } from './useChartData';
import type { CalendarDayData } from '@/lib/calendar-cell';

type ChartTab = 'calendar' | 'stats' | 'export';

const CHART_TABS: { value: ChartTab; label: string }[] = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'stats', label: 'Stats' },
  { value: 'export', label: 'Data' },
];

export function ChartsScreen({ today: todayOverride }: { today?: Date } = {}) {
  const { showBranding } = useDiscreetMode();
  // "Today" is normally the wall-clock date, but can be injected — the engine
  // testing dashboard simulates a specific day so the calendar reflects it.
  const today = todayOverride ?? new Date();
  // Viewed Month State — starts on the month containing "today".
  const [viewDate, setViewDate] = React.useState(() => today);
  const [activeTab, setActiveTab] = React.useState<ChartTab>('calendar');

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(next);
  };

  // Calculate range for the current view
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Calendar Vars
  const todayStr = toIsoDate(today);
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

  // Re-entering the Calendar tab (incl. first mount) always lands on "now" — a
  // returning user should see the current month, not wherever they last browsed.
  React.useEffect(() => {
    if (activeTab === 'calendar') {
      setViewDate(todayOverride ?? new Date());
    }
  }, [activeTab, todayOverride]);

  // Data Fetching
  const { loading, data, statsData, statsQuery } = useChartData({ currentYear, currentMonth });

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
        <Loader2
          className="h-7 w-7 animate-spin text-[#007aff] dark:text-[#0a84ff]"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Empty State Handling Removed - Always show grid
  // If we have no history, we still show the grid so users can see the restricted range.
  const dayMap = new Map<string, CalendarDayData>(data.days.map((d) => [d.date, d]));

  return (
    <div className="h-full bg-background font-sans flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col min-h-0">
        <div className={cn('px-6 py-4 flex flex-col h-full', !showBranding && 'pt-10 sm:pt-12')}>
          <div className="max-w-md mx-auto w-full flex flex-col h-full">
            <SegmentedTabs
              tabs={CHART_TABS}
              value={activeTab}
              onChange={setActiveTab}
              className="mb-4"
            />

            {/* Tab Content - fills remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {activeTab === 'calendar' && (
                <div className="pt-2 pb-6">
                  {/* Bare calendar — the grid sits directly on the background with
                      no card, divider or footer chrome, so the month reads calm and
                      premium (Apple Health style). Whitespace is the container. */}
                  <div className="w-full max-w-sm mx-auto flex flex-col" {...swipeHandlers}>
                    <div className="px-1">
                      <DateNavigator
                        label={calendarTitle}
                        sublabel={isCurrentMonth ? 'Current' : undefined}
                        onPrev={() => changeMonth(-1)}
                        onNext={() => changeMonth(1)}
                        nextDisabled={isCurrentMonth}
                        prevDisabled={isPrevDisabled}
                      />
                    </div>

                    <div className="px-1 pt-4">
                      <CalendarMonthGrid
                        year={currentYear}
                        month={currentMonth}
                        firstDay={firstDay}
                        daysInMonth={daysInMonth}
                        dayMap={dayMap}
                        todayStr={todayStr}
                        minDateStr={minDateStr}
                        onSelectDay={(dateIso) => {
                          window.location.hash = `#/log?date=${dateIso}`;
                        }}
                      />
                    </div>

                    {/* Quiet footnote — the only nudge that days are tappable. Styled
                        like an Apple grouped-list caption: tiny, tertiary, no box. */}
                    <p className="mt-3.5 text-center text-[11px] font-medium text-zinc-400/90 dark:text-zinc-600">
                      Tap any day to view or edit
                    </p>
                  </div>

                  <CalendarLegend />
                </div>
              )}

              {activeTab === 'stats' && (
                <ChartsView
                  data={statsData}
                  insufficientData={statsQuery.data?.insufficientData}
                  trends={statsQuery.data?.trends || []}
                  summary={statsQuery.data?.summary || null}
                  averages={statsQuery.data?.averages || null}
                  patterns={statsQuery.data?.patterns || []}
                />
              )}

              {activeTab === 'export' && <ExportView />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
