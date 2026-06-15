import * as React from 'react';
import { InsetGroup } from '@/components/common/ui/inset-group';

interface OnboardingCycleBasicsProps {
  lastPeriodStart: string;
  cycleLengthMin: number;
  cycleLengthMax: number;
  onUpdate: (data: {
    last_period_start?: string;
    cycle_length_min?: number;
    cycle_length_max?: number;
  }) => void;
  onComplete: () => void;
  busy: boolean;
}

export function OnboardingCycleBasics({
  lastPeriodStart,
  cycleLengthMin,
  cycleLengthMax,
  onUpdate,
  onComplete,
  busy,
}: OnboardingCycleBasicsProps) {
  const [useRange, setUseRange] = React.useState(true);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="h-full bg-background font-sans flex flex-col overflow-y-auto">
      <div className="max-w-md mx-auto w-full px-4 pt-20 pb-8 space-y-8">
        <h1 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight px-4">
          Cycle basics
        </h1>

        {/* Last Period Start */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-4">
            Last period start
          </h3>
          <InsetGroup>
            <div className="p-4">
              <input
                type="date"
                value={lastPeriodStart}
                max={today}
                onChange={(e) => onUpdate({ last_period_start: e.target.value })}
                className="w-full h-12 px-4 text-[17px] bg-transparent border-none text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#007aff] rounded-lg"
              />
            </div>
          </InsetGroup>
        </div>

        {/* Cycle Length */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-4">
            Typical cycle length
          </h3>
          <InsetGroup>
            <div className="p-6 space-y-6">
              {useRange ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] text-zinc-600 dark:text-zinc-400">Minimum</span>
                      <span className="text-[22px] font-semibold text-zinc-900 dark:text-zinc-100">
                        {cycleLengthMin} days
                      </span>
                    </div>
                    <input
                      type="range"
                      min={21}
                      max={35}
                      value={cycleLengthMin}
                      onChange={(e) => {
                        const newMin = Number(e.target.value);
                        if (newMin <= cycleLengthMax) {
                          onUpdate({ cycle_length_min: newMin });
                        }
                      }}
                      className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#007aff]"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] text-zinc-600 dark:text-zinc-400">Maximum</span>
                      <span className="text-[22px] font-semibold text-zinc-900 dark:text-zinc-100">
                        {cycleLengthMax} days
                      </span>
                    </div>
                    <input
                      type="range"
                      min={21}
                      max={35}
                      value={cycleLengthMax}
                      onChange={(e) => {
                        const newMax = Number(e.target.value);
                        if (newMax >= cycleLengthMin) {
                          onUpdate({ cycle_length_max: newMax });
                        }
                      }}
                      className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#007aff]"
                    />
                  </div>

                  <div className="text-center pt-2">
                    <span className="text-[15px] text-zinc-500 dark:text-zinc-400">
                      {cycleLengthMin === cycleLengthMax
                        ? `${cycleLengthMin} days`
                        : `${cycleLengthMin}–${cycleLengthMax} days`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <p className="text-[15px] text-zinc-600 dark:text-zinc-400">
                    No problem. We'll learn from your logs.
                  </p>
                </div>
              )}

              <button
                onClick={() => setUseRange(!useRange)}
                className="w-full text-[15px] text-[#007aff] font-medium active:opacity-70 transition-opacity"
              >
                {useRange ? 'Not sure' : 'I know my cycle length'}
              </button>
            </div>
          </InsetGroup>
        </div>

        {/* Done Button */}
        <div className="px-4 pt-4">
          <button
            onClick={onComplete}
            disabled={busy || !lastPeriodStart}
            className="w-full h-12 rounded-xl bg-[#007aff] text-white font-semibold text-[17px] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80"
          >
            {busy ? 'Loading...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
