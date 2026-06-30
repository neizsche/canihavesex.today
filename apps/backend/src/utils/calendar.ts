import { addDaysIso, backlogFloorIso, daysBetweenIso } from './dates.js';
import { logHasMeaningfulData, type Log } from '../repositories/LogRepository.js';
import type { DailyStatus } from '../repositories/DailyStatusRepository.js';
import type { Cycle } from '../repositories/CycleRepository.js';

export interface CalendarDay {
  date: string;
  status: string;
  ovulationConfirmed: boolean;
  hasLog: boolean;
  isToday: boolean;
}

export interface CalendarResponse {
  days: CalendarDay[];
  quickStats: Record<string, unknown> | null;
  minDate: string;
}

export interface BuildCalendarInput {
  statuses: DailyStatus[];
  cycles: Cycle[];
  rangeLogs: Log[];
  /** Sticky break/pregnant state — suppresses forward predictions. */
  paused: boolean;
  today: string;
  /** Inclusive view range (ISO dates). */
  start: string;
  end: string;
}

/**
 * Pure composition for GET /api/v1/insights/calendar. The route handles the DB
 * fetch + caching; this turns engine output (statuses + cycles + logs) into the
 * calendar response. Extracted so the engine testing dashboard can reuse the
 * exact same logic without copying it.
 */
export function buildCalendarResponse({
  statuses,
  cycles,
  rangeLogs,
  paused,
  today,
  start,
  end,
}: BuildCalendarInput): CalendarResponse {
  // Suppress forward predictions when paused or drifting (lost track): the
  // calendar then shows only logged history — no prediction colors for any
  // day after the last log date. Logged/confirmed days have is_predicted=false
  // so they always remain (logged data takes precedence over predictions).
  const todayStatus = statuses.find((st) => st.date === today);
  const lostTrack = !!todayStatus?.insights_payload?.lostTrack;
  const suppressPredictions = paused || lostTrack;

  // Dates the user has actually logged something meaningful on, used to
  // surface a subtle "logged" marker on the calendar.
  const loggedDates = new Set(
    rangeLogs.filter((log) => logHasMeaningfulData(log)).map((log) => log.date)
  );

  // Helper: Find cycle overlapping the middle of the view
  const midDate = addDaysIso(start, Math.floor(daysBetweenIso(start, end) / 2));
  const cycle = cycles.find(
    (c) => c.start_date <= midDate && (!c.end_date || c.end_date >= midDate)
  );

  let quickStats: Record<string, unknown> | null = null;
  if (cycle) {
    const isActive = !cycle.end_date;

    // Format for Frontend (QuickStatsData)
    if (isActive) {
      // ACTIVE CYCLE (Current)
      const cycleDay = daysBetweenIso(cycle.start_date, today) + 1;
      let daysToPeriod = null;

      // Single source of truth: next period = cycle start + the engine's
      // predicted cycle length (ovulationDay + luteal, or its fallback).
      // The Today cycle line reads the same activeCycleLength, so the two
      // screens always show the same "days to period".
      const activeCycleLength =
        todayStatus?.insights_payload?.activeCycleLength ??
        todayStatus?.insights_payload?.stats?.medianCycleLength ??
        28;
      const periodDate = addDaysIso(cycle.start_date, activeCycleLength);
      daysToPeriod = daysBetweenIso(today, periodDate);

      const phaseName = todayStatus?.phase || 'Follicular';

      quickStats = {
        statusText: 'Current Cycle',
        subText: `Day ${cycleDay}`,
        isHistorical: false,
        periodStartDate: new Date(cycle.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        ovulationDate: cycle.ovulation_confirmed_date || cycle.ovulation_prediction || null,
        daysToPeriod: suppressPredictions ? null : daysToPeriod,
        cycleDay: cycleDay,
        fertilityStatus:
          todayStatus?.fertility_status === 'fertile'
            ? 'High'
            : todayStatus?.fertility_status === 'period'
              ? 'Period'
              : 'Low',
        phase: phaseName.includes('Phase') ? phaseName : `${phaseName} Phase`,
        isPredicted: suppressPredictions ? false : daysToPeriod !== null,
        lostTrack,
      };
    } else {
      // HISTORICAL CYCLE (Past Month View)
      quickStats = {
        statusText: 'Period Started',
        subText: new Date(cycle.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        isHistorical: true,
        periodStartDate: new Date(cycle.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        ovulationDate: cycle.ovulation_confirmed_date || cycle.ovulation_prediction || null,
        daysToPeriod: null,
        cycleDay: null,
        fertilityStatus: 'Low',
        phase: 'Luteal Phase',
        isPredicted: false,
        lostTrack: false,
      };
    }
  }

  // Map Days
  const todayStr = today;
  const days = statuses
    .map((st) => {
      const s = st.fertility_status === 'not_fertile' ? 'safe' : st.fertility_status;
      return { ...st, mappedStatus: s };
    })
    .filter((st) => ['period', 'fertile', 'safe'].includes(st.mappedStatus))
    // Paused or lost track: drop forward predictions (days after the last log
    // date), keeping only logged history.
    .filter((st) => !(suppressPredictions && st.is_predicted))
    .map((st) => {
      // Check if this date is a confirmed ovulation date in ANY cycle
      const isOvulation = cycles.some((c) => c.ovulation_confirmed_date === st.date);
      return {
        date: st.date,
        status: st.mappedStatus,
        ovulationConfirmed: isOvulation,
        hasLog: loggedDates.has(st.date),
        isToday: st.date === todayStr,
      };
    });

  // minDate for swipe restriction. Floor is the back-log window so a
  // first-time user mid-cycle can still reach her last period; extended
  // further back when older logged cycles exist, so history stays viewable
  // (viewing is unrestricted — only editing is locked to the window).
  let minDate = backlogFloorIso(today);

  if (cycles.length > 0) {
    const earliestCycleStart = cycles.reduce((min, c) => {
      if (!c.start_date) return min;
      return c.start_date < min ? c.start_date : min;
    }, minDate);

    if (earliestCycleStart < minDate) {
      minDate = earliestCycleStart;
    }
  }

  return { days, quickStats, minDate };
}
