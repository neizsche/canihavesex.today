import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Droplets,
  Info,
  Minus,
  Thermometer,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/common/ui/bottom-sheet';
import { SIGNAL_ROWS, type SignalState } from './todayShared';
import { INSET_CARD, INSET_DIVIDE, SECTION_CAPTION } from './todayStyles';
import { TodayHero } from './TodayHero';
import { useTodayModel } from './useTodayModel';

interface TodayInsightsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIGNAL_ICON: Record<
  (typeof SIGNAL_ROWS)[number]['key'],
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  lh: Activity,
  mucus: Droplets,
  calendar: CalendarDays,
  temp: Thermometer,
};

/**
 * "Today, explained" — a bottom sheet that expands the Today reading using the
 * deterministic engine payload. Shares the Today hero + {@link useTodayModel}
 * with the screen; adds a grouped facts card, the signals that fed in, and the
 * engine's messages (its reason for existing). Dismissed with "Done".
 */
export function TodayInsightsSheet({ isOpen, onClose }: TodayInsightsSheetProps) {
  const { status, phase, dynamicSubtitle, subtitleWarn, cycle, notes, today } = useTodayModel();

  const confidence = today?.confidence;
  const label: string = confidence?.label || '';
  const score: number | null = typeof confidence?.score === 'number' ? confidence.score : null;
  const signals: Record<string, SignalState | undefined> = confidence?.signals || {};
  const sourceText: string = today?.sourceText || '';

  // Grouped facts: only the rows we have data for.
  const factRows: Array<{ label: string; value: string }> = [];
  if (cycle?.day != null) factRows.push({ label: 'Cycle day', value: String(cycle.day) });
  if (cycle?.fertileStartDateStr && cycle?.fertileEndDateStr)
    factRows.push({
      label: 'Fertile window',
      value: `${cycle.fertileStartDateStr} – ${cycle.fertileEndDateStr}`,
    });
  if (cycle?.nextPeriodDateStr)
    factRows.push({ label: 'Next period', value: cycle.nextPeriodDateStr });
  if (label)
    factRows.push({ label: 'Confidence', value: `${label}${score != null ? ` · ${score}%` : ''}` });

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} actionLabel="Done" showGrabber>
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center px-6 pb-4 pt-6 text-center">
        {confidence ? (
          <>
            <TodayHero
              phase={phase}
              title={status.title}
              accent={status.accent}
              dot={status.dot}
              subtitle={dynamicSubtitle}
              subtitleWarn={subtitleWarn}
              as="h2"
            />

            {/* Facts + signals — grouped rows */}
            <div className={`mt-7 w-full ${INSET_CARD} text-left`}>
              <div className={INSET_DIVIDE}>
                {factRows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between py-[13px] text-[14px]"
                  >
                    <span className="text-zinc-500 dark:text-zinc-400">{r.label}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.value}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between py-[13px] text-[14px]">
                  <span className="text-zinc-500 dark:text-zinc-400">Signals</span>
                  <div className="flex items-center gap-3.5">
                    {SIGNAL_ROWS.map((row) => {
                      const state = signals[row.key]?.state ?? 'missing';
                      const used = state === 'used';
                      const excluded = state === 'excluded';
                      const Icon = SIGNAL_ICON[row.key];
                      return (
                        <span key={row.key} className="relative inline-flex" title={row.label}>
                          <Icon
                            className={cn(
                              'h-[17px] w-[17px]',
                              used
                                ? 'text-zinc-800 dark:text-zinc-100'
                                : 'text-zinc-300 dark:text-zinc-600'
                            )}
                            strokeWidth={2}
                          />
                          {excluded && (
                            <span className="absolute -bottom-1 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-zinc-400 dark:bg-zinc-500">
                              <Minus className="h-2 w-2 text-white" strokeWidth={4} />
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages — the engine's reasons (why this sheet beats the Today screen) */}
            {notes.length > 0 && (
              <div className="mt-4 w-full text-left">
                <div className={`mb-2 pl-1 ${SECTION_CAPTION}`}>
                  Notes
                </div>
                <div className={INSET_CARD}>
                  <div className={INSET_DIVIDE}>
                    {notes.map((note, i) => {
                      const warn = note.kind === 'warn';
                      const Icon = warn ? AlertTriangle : Info;
                      return (
                        <div key={`${note.text}-${i}`} className="flex gap-2.5 py-3">
                          <Icon
                            className={cn(
                              'mt-[1px] h-[15px] w-[15px] shrink-0',
                              warn ? 'text-amber-500' : 'text-zinc-400 dark:text-zinc-500'
                            )}
                            strokeWidth={2}
                          />
                          <span className="text-[13px] leading-[1.45] text-zinc-600 dark:text-zinc-300">
                            {note.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {sourceText && (
              <div className="mt-4 text-[12.5px] text-zinc-400 dark:text-zinc-500">
                {sourceText}
              </div>
            )}
          </>
        ) : (
          <p className="mt-16 max-w-[240px] text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            No reading yet. Log today to see what&apos;s behind your fertility status.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
