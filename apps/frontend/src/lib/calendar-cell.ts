import { cn } from '@/lib/utils';
import { toIsoDate } from '@/lib/date';

export type DayGroup = 'period' | 'fertile' | null;
export type DayState = 'logged' | 'unlogged' | 'predicted';

export interface CalendarDayData {
  date: string;
  status?: string;
  ovulationConfirmed?: boolean;
  hasLog?: boolean;
}

/** Fully-resolved visual description of one calendar cell — pure data, no JSX. */
export interface DayCellVisual {
  dayNum: number;
  dateIso: string;
  isToday: boolean;
  isFuture: boolean;
  isRestricted: boolean;
  /** First day of a period run — gets the solid overlaid pill. */
  isPeriodStart: boolean;
  isOvulation: boolean;
  state: DayState;
  /** Background band track (period / fertile window). '' when no band. */
  bandClass: string;
  /** Rounds only the open ends of a run so a window reads as one span. */
  radiusClass: string;
  /** Day-number colour + weight, encoding group and logged state. */
  textClass: string;
  /** Colour of the logged-day tick (white on solid fills, else accent). */
  tickClass: string;
}

/** Bucket a day into the band category used for continuous-range rendering. */
export function groupOf(dd?: CalendarDayData): DayGroup {
  const s = dd?.status?.toLowerCase();
  return s === 'period' ? 'period' : s === 'fertile' ? 'fertile' : null;
}

interface DayCellParams {
  year: number;
  month: number;
  dayNum: number;
  /** Column within the week (0-6) — gates row-aware band joining. */
  col: number;
  dayMap: Map<string, CalendarDayData>;
  todayStr: string;
  minDateStr: string;
}

/**
 * Resolve everything needed to paint a single calendar cell. Kept pure so the
 * grid component is a thin map and the colour rules can be unit-tested.
 */
export function getDayCellVisual({
  year,
  month,
  dayNum,
  col,
  dayMap,
  todayStr,
  minDateStr,
}: DayCellParams): DayCellVisual {
  const dateIso = toIsoDate(new Date(year, month, dayNum));
  const dayData = dayMap.get(dateIso);

  const isFuture = dateIso > todayStr;
  const isToday = dateIso === todayStr;
  const isRestricted = dateIso < minDateStr;

  const group = groupOf(dayData);
  const neighbour = (offset: number) =>
    groupOf(dayMap.get(toIsoDate(new Date(year, month, dayNum + offset))));

  // Row-aware neighbours: a run is only joined within the same week, so bands
  // get rounded caps at week boundaries.
  const prevGroup = col === 0 ? null : neighbour(-1);
  const nextGroup = col === 6 ? null : neighbour(1);
  const connectLeft = !!group && prevGroup === group;
  const connectRight = !!group && nextGroup === group;

  // True period-start (ignores week wrapping, unlike prevGroup) — the first day
  // of a period run, which carries the solid overlaid pill.
  const isPeriodStart = group === 'period' && neighbour(-1) !== 'period';
  const isOvulation = !!dayData?.ovulationConfirmed;

  const radiusClass = !group
    ? ''
    : connectLeft && connectRight
      ? 'rounded-none'
      : connectLeft
        ? 'rounded-r-full'
        : connectRight
          ? 'rounded-l-full'
          : 'rounded-full';

  const state: DayState = isFuture ? 'predicted' : dayData?.hasLog ? 'logged' : 'unlogged';

  let bandClass = '';
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
      // One continuous faded red band across the whole period; the solid
      // period-start pill is overlaid by the cell component.
      bandClass = 'bg-[#ff3b30]/15 dark:bg-[#ff453a]/25';
      textClass =
        state === 'logged'
          ? 'text-[#b42318] dark:text-[#ff6961] font-semibold'
          : 'text-[#b42318]/70 dark:text-[#ff6961]/70 font-medium';
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

  if (isPeriodStart) {
    // Number sits on the solid start pill, so it reads white — like ovulation.
    textClass = state === 'logged' ? 'text-white font-semibold' : 'text-white/75 font-medium';
  }
  if (isOvulation) {
    // Ovulation is a confirmed event — always reads strongest.
    textClass = 'text-white font-semibold';
  }
  if (isRestricted) {
    textClass = 'text-zinc-300 dark:text-zinc-700 font-normal';
  }

  const tickClass =
    isPeriodStart || isOvulation
      ? 'text-white'
      : group === 'period'
        ? 'text-[#b42318] dark:text-[#ff6961]'
        : 'text-[#007aff] dark:text-[#5aa9ff]';

  return {
    dayNum,
    dateIso,
    isToday,
    isFuture,
    isRestricted,
    isPeriodStart,
    isOvulation,
    state,
    bandClass,
    radiusClass,
    textClass,
    tickClass,
  };
}
