import * as React from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Header } from '@/components/common/Header';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { DateNavigator } from '@/components/common/ui/date-navigator';
import { ChartsView } from './charts/ChartsView';
import { ExportView } from './charts/ExportView';
import { QuickStats } from './charts/QuickStats';
import { useSwipe } from '@/components/common/hooks/useSwipe';
import { apiJson } from '@/lib/api';
import { toIsoDate, todayIso } from '@/lib/date';
// Removed local ChartDay/ChartData types below

export function ChartScreen() {
  const { showBranding } = useDiscreetMode();
  // Viewed Month State
  const [viewDate, setViewDate] = React.useState(new Date());
  const [activeTab, setActiveTab] = React.useState<'calendar' | 'stats' | 'export' | 'today'>(
    'calendar'
  );

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(next);
  };

  // Calculate range for the current view
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Calendar Vars
  const today = new Date();
  const todayStr = todayIso();
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
  const queryClient = useQueryClient();

  // 1. Calendar Data (Includes QuickStats)
  interface CalendarDay {
    date: string;
    status: 'period' | 'fertile' | 'safe' | 'unsure';
    ovulationConfirmed: boolean;
    hasLog?: boolean;
    isToday: boolean;
  }

  interface CalendarResponse {
    days: CalendarDay[];
    quickStats: any;
    minDate?: string;
  }

  // Shared options builder so the active query and the prefetch of adjacent
  // months use identical keys/fetchers (otherwise prefetch wouldn't populate
  // the cache the navigation reads from).
  const calendarOptions = (year: number, month: number) => {
    const start = toIsoDate(new Date(year, month, 1));
    const end = toIsoDate(new Date(year, month + 1, 0));
    return {
      queryKey: ['calendar', start, end],
      queryFn: async () =>
        apiJson<CalendarResponse>(`/api/v1/insights/calendar?start=${start}&end=${end}`),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
    };
  };

  const calendarQuery = useQuery({
    ...calendarOptions(currentYear, currentMonth),
    // Keep showing the current month while the next one loads, so changing
    // months updates in place instead of unmounting to a full-screen spinner.
    placeholderData: keepPreviousData,
  });

  // Warm the cache for the previous and next month so navigating to them shows
  // the colours instantly instead of after a network round-trip.
  React.useEffect(() => {
    for (const offset of [-1, 1]) {
      const d = new Date(currentYear, currentMonth + offset, 1);
      void queryClient.prefetchQuery(calendarOptions(d.getFullYear(), d.getMonth()));
    }
    // calendarOptions is recreated each render but only depends on these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, currentMonth, queryClient]);

  // 2. Stats Data (Cycle History)
  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: async () => apiJson<any>('/api/v1/insights/stats'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
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
    phase: 'Follicular',
    lostTrack: false,
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
        <div className="text-sm text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  // Empty State Handling Removed - Always show grid
  // If we have no history, we still show the grid so users can see the restricted range.

  const dayMap = new Map(data.days.map((d: any) => [d.date, d]));

  // Group a calendar day into a band category for continuous range rendering.
  // Consecutive same-group days merge into one rounded band (see day grid below).
  const groupOf = (dd?: any): 'period' | 'fertile' | null => {
    const s = dd?.status?.toLowerCase();
    return s === 'period' ? 'period' : s === 'fertile' ? 'fertile' : null;
  };

  return (
    <div className="h-full bg-background font-sans flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col min-h-0">
        <div className={cn('px-6 py-4 flex flex-col h-full', !showBranding && 'pt-10 sm:pt-12')}>
          <div className="max-w-md mx-auto w-full flex flex-col h-full">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1">
              <button
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200',
                  activeTab === 'calendar'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200',
                  activeTab === 'stats'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                Stats
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200',
                  activeTab === 'export'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                Data
              </button>
            </div>

            {/* Tab Content - fills remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {/* Calendar Tab */}
              {activeTab === 'calendar' && (
                <div className="pt-2 px-3 pb-6">
                  {/* Simple Container Card */}
                  <div
                    className="w-full max-w-sm mx-auto bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col"
                    {...swipeHandlers}
                  >
                    {/* Header */}
                    <div className="pt-2 px-1">
                      <DateNavigator
                        label={calendarTitle}
                        sublabel={isCurrentMonth ? 'Current' : undefined}
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
                          <div
                            key={idx}
                            className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest"
                          >
                            {d}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-y-1">
                        {/* Empty pre-padding */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-12" />
                        ))}

                        {/* Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const dayNum = i + 1;
                          const dateIso = toIsoDate(new Date(currentYear, currentMonth, dayNum));

                          const dayData = dayMap.get(dateIso);
                          const isFuture = dateIso > todayStr;
                          const isToday = dateIso === todayStr;
                          const isRestricted = dateIso < minDateStr;

                          // Continuous range bands: consecutive days of the same
                          // group (period / fertile) merge into one rounded band so a
                          // window reads as a span, not scattered dots. We round only
                          // the open ends of each run within a row.
                          const group = groupOf(dayData);
                          const col = (firstDay + i) % 7;
                          const prevGroup =
                            col === 0
                              ? null
                              : groupOf(
                                dayMap.get(
                                  toIsoDate(new Date(currentYear, currentMonth, dayNum - 1))
                                )
                              );
                          const nextGroup =
                            col === 6
                              ? null
                              : groupOf(
                                dayMap.get(
                                  toIsoDate(new Date(currentYear, currentMonth, dayNum + 1))
                                )
                              );
                          const connectLeft = !!group && prevGroup === group;
                          const connectRight = !!group && nextGroup === group;

                          const radiusClass = !group
                            ? ''
                            : connectLeft && connectRight
                              ? 'rounded-none'
                              : connectLeft
                                ? 'rounded-r-full'
                                : connectRight
                                  ? 'rounded-l-full'
                                  : 'rounded-full';

                          // Day-number typography encodes data state — this is the
                          // only signal for "did I log this day", so no extra marker
                          // is needed and the grid stays calm:
                          //   logged    → strong (full colour, semibold)
                          //   unlogged  → muted (regular weight) — a visible gap
                          //   predicted → faintest (future days)
                          let bandClass = '';
                          const isOvulation = !!dayData?.ovulationConfirmed;
                          const state: 'logged' | 'unlogged' | 'predicted' = isFuture
                            ? 'predicted'
                            : dayData?.hasLog
                              ? 'logged'
                              : 'unlogged';

                          // Base hue is set by the cell type; the state then picks
                          // weight + opacity within that hue.
                          let textClass: string;
                          if (group === 'period') {
                            if (isFuture) {
                              // Predicted period — faded, dashed outline.
                              bandClass = cn(
                                'bg-[#ff3b30]/[0.12] border-y border-dashed border-[#ff3b30]/45',
                                'dark:bg-[#ff453a]/[0.16] dark:border-[#ff453a]/50',
                                !connectLeft && 'border-l',
                                !connectRight && 'border-r'
                              );
                              textClass = 'text-[#ff3b30]/85 dark:text-[#ff6961] font-normal';
                            } else {
                              bandClass = 'bg-[#ff3b30] dark:bg-[#ff453a]';
                              textClass =
                                state === 'logged'
                                  ? 'text-white font-semibold'
                                  : 'text-white/75 font-medium';
                            }
                          } else if (group === 'fertile') {
                            bandClass = 'bg-[#af52de]/15 dark:bg-[#bf5af2]/25';
                            textClass =
                              state === 'logged'
                                ? 'text-[#7e3aa8] dark:text-[#e3b8f5] font-semibold'
                                : state === 'unlogged'
                                  ? 'text-[#7e3aa8]/70 dark:text-[#e3b8f5]/70 font-medium'
                                  : 'text-[#7e3aa8]/45 dark:text-[#e3b8f5]/45 font-normal';
                          } else {
                            // Safe / unsure — no band, so the number carries the whole signal.
                            textClass =
                              state === 'logged'
                                ? 'text-zinc-900 dark:text-white font-semibold'
                                : state === 'unlogged'
                                  ? 'text-zinc-500 dark:text-zinc-400 font-medium'
                                  : 'text-zinc-300 dark:text-zinc-700 font-normal';
                          }

                          if (isOvulation) {
                            // Ovulation is a confirmed event — always reads strongest.
                            textClass = 'text-white font-semibold';
                          }
                          if (isRestricted) {
                            textClass = 'text-zinc-300 dark:text-zinc-700 font-normal';
                          }

                          return (
                            <div
                              key={dayNum}
                              onClick={() => {
                                if (isFuture || isRestricted) return;
                                window.location.hash = `#/log?date=${dateIso}`;
                              }}
                              className={cn(
                                'relative h-12 flex items-center justify-center group',
                                isFuture || isRestricted ? 'cursor-default' : 'cursor-pointer',
                                isRestricted && 'opacity-40'
                              )}
                            >
                              {/* Continuous range band (period / fertile window) —
                                  a chunky rounded track so windows feel full, not slim. */}
                              {bandClass && (
                                <div
                                  className={cn(
                                    'absolute inset-y-[2px] left-0 right-0',
                                    radiusClass,
                                    bandClass
                                  )}
                                />
                              )}

                              {/* Ovulation marker. Always renders as a pill with rounded corners. */}
                              {isOvulation && (
                                <div
                                  className="absolute inset-y-[2px] left-0 right-0 bg-[#af52de] dark:bg-[#bf5af2] rounded-full shadow-sm"
                                />
                              )}

                              <span
                                className={cn(
                                  'relative z-10 text-[15px] transition-transform duration-300',
                                  !isFuture && !isRestricted && 'group-hover:scale-110',
                                  textClass,
                                  // Today is marked purely by a larger, bolder number
                                  // (no ring) so it reads as "now" without extra chrome.
                                  isToday && 'text-[18px] font-bold'
                                )}
                              >
                                {dayNum}
                              </span>

                              {/* Logged-day tick — small check tucked inside the top
                                  of the band / ring. White on solid fills (period,
                                  ovulation) so it stays legible; accent blue otherwise. */}
                              {state === 'logged' && (
                                <svg
                                  viewBox="0 0 12 12"
                                  className={cn(
                                    'absolute top-[7px] left-1/2 z-20 h-2 w-2 -translate-x-1/2 opacity-60',
                                    group === 'period' || isOvulation
                                      ? 'text-white'
                                      : 'text-[#007aff] dark:text-[#5aa9ff]'
                                  )}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M2.4 6.3 L4.9 8.8 L9.6 3.4" />
                                </svg>
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
                        Tap a day to log or review your signals
                      </p>
                    </div>
                  </div>

                  {/* Smooth Legend (Outside Card) */}
                  <div className="mt-6 px-6">
                    <div className="flex justify-between max-w-[300px] mx-auto text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] dark:bg-[#ff453a]" />
                        <span>Period</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#af52de]/25 dark:bg-[#bf5af2]/30" />
                        <span>Fertile</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#af52de] dark:bg-[#bf5af2]" />
                        <span>Ovulation</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white" />
                        <span>Today</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats - Added Phase 4 */}
                  {!quickStats.lostTrack && <QuickStats data={quickStats} />}
                </div>
              )}

              {/* Stats Tab */}
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

              {/* Export Tab */}
              {activeTab === 'export' && <ExportView data={statsData} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
