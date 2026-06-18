import * as React from 'react';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { ToggleTile } from '@/components/common/ui/toggle-tile';
import { Check, Activity, Pill, Baby } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingSkipLink } from './OnboardingSkipLink';

interface OnboardingSetupProps {
  // intent handled by default now
  regularity?: 'regular' | 'irregular' | 'unsure' | null;
  contextFlags?: string[];
  lastPeriodStart?: string;
  cycleLengthMin?: number;
  cycleLengthMax?: number;
  onUpdate: (data: {
    regularity?: any;
    contextFlags?: string[];
    lastPeriodStart?: string;
    cycleLengthMin?: number;
    cycleLengthMax?: number;
  }) => void;
  onContinue: () => void;
  onSkip?: () => void;
  skipBusy?: boolean;
}

export function OnboardingSetup({
  regularity,
  contextFlags,
  lastPeriodStart,
  cycleLengthMin = 26,
  cycleLengthMax = 30,
  onUpdate,
  onContinue,
  onSkip,
  skipBusy,
}: OnboardingSetupProps) {
  const flags = contextFlags || [];
  const [useRange, setUseRange] = React.useState(true);
  const [knowsDate, setKnowsDate] = React.useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const handleFlagToggle = (flag: string) => {
    const newFlags = flags.includes(flag)
      ? flags.filter((f: string) => f !== flag)
      : [...flags, flag];
    onUpdate({ contextFlags: newFlags });
  };

  return (
    <div className="flex h-full w-full flex-col bg-background font-sans">
      {/* Scrollable form region — the Continue button below stays pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4">
        <div className="mx-auto max-w-md space-y-6">
          {/* Header Area */}
          <div className="space-y-2 px-4">
            <h1 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              About Your Cycle
            </h1>
            <p className="text-[17px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              Quick details for better predictions.
            </p>
          </div>

          <div className="space-y-6">
            {/* 2. Regularity Section */}
            <InsetGroup
              title="Cycle Regularity"
              className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50"
            >
              {[
                { id: 'regular', label: 'Regular', desc: ' varies by <7 days' },
                { id: 'irregular', label: 'Irregular', desc: ' varies widely' },
                { id: 'unsure', label: 'Unsure', desc: " I don't know" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdate({ regularity: opt.id })}
                  className={cn(
                    'w-full flex items-center justify-between p-4 transition-colors text-left',
                    regularity === opt.id
                      ? 'bg-blue-50/50 dark:bg-blue-900/10'
                      : 'hover:bg-zinc-50 dark:hover:bg-white/5'
                  )}
                >
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        'text-[17px]',
                        regularity === opt.id
                          ? 'font-semibold text-[#007aff]'
                          : 'text-zinc-900 dark:text-zinc-100'
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[13px] text-muted-foreground">{opt.desc}</span>
                  </div>
                  {regularity === opt.id && (
                    <Check className="w-5 h-5 text-[#007aff]" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </InsetGroup>

            {/* 3. Context Flags (Optional) */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1 px-4">
                <h3 className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">
                  Additional Context
                </h3>
                <p className="text-[15px] text-zinc-500 dark:text-zinc-400">
                  Select any that apply to help tune your cycle predictions.
                </p>
              </div>

              <div className="px-4">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      id: 'pcos',
                      label: 'PCOS',
                      icon: Activity,
                      bg: 'bg-purple-500/10',
                      text: 'text-purple-500',
                    },
                    {
                      id: 'thyroid',
                      label: 'Thyroid',
                      icon: Activity,
                      bg: 'bg-orange-500/10',
                      text: 'text-orange-500',
                    },
                    {
                      id: 'post_birth_control',
                      label: 'Post-BC',
                      icon: Pill,
                      bg: 'bg-blue-500/10',
                      text: 'text-blue-500',
                    },
                    {
                      id: 'breastfeeding',
                      label: 'Nursing',
                      icon: Baby,
                      bg: 'bg-pink-500/10',
                      text: 'text-pink-500',
                    },
                  ].map((flag) => (
                    <ToggleTile
                      key={flag.id}
                      label={flag.label}
                      icon={flag.icon}
                      activeBgClass={flag.bg}
                      activeTextClass={flag.text}
                      checked={flags.includes(flag.id)}
                      onChange={() => handleFlagToggle(flag.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Last Period Start */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1 px-4">
              <h3 className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">
                Last Period
              </h3>
            </div>
            <InsetGroup>
              <div className="p-4 space-y-4">
                {knowsDate ? (
                  <input
                    type="date"
                    value={lastPeriodStart}
                    max={today}
                    onChange={(e) => onUpdate({ lastPeriodStart: e.target.value })}
                    className="w-full h-12 px-4 text-[17px] bg-transparent border-none text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#007aff] rounded-lg"
                  />
                ) : (
                  <div className="text-center py-2">
                    <p className="text-[15px] text-zinc-600 dark:text-zinc-400">
                      No worries. We'll start tracking from today.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    const newKnows = !knowsDate;
                    setKnowsDate(newKnows);
                    if (!newKnows) {
                      // If skipping, assume today for backend requirement
                      onUpdate({ lastPeriodStart: today });
                    }
                  }}
                  className="w-full text-[15px] text-[#007aff] font-medium active:opacity-70 transition-opacity"
                >
                  {knowsDate ? "I don't remember" : 'I know the date'}
                </button>
              </div>
            </InsetGroup>
          </div>

          {/* 5. Cycle Length */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1 px-4">
              <h3 className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">
                Typical Cycle Length
              </h3>
            </div>
            <InsetGroup>
              <div className="p-6 space-y-6">
                {useRange ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] text-zinc-600 dark:text-zinc-400">
                          Minimum
                        </span>
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
                            onUpdate({ cycleLengthMin: newMin });
                          }
                        }}
                        className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#007aff]"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] text-zinc-600 dark:text-zinc-400">
                          Maximum
                        </span>
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
                            onUpdate({ cycleLengthMax: newMax });
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
        </div>
      </div>

      {/* Pinned footer — Continue is always visible without scrolling to it. */}
      <div className="mx-auto w-full max-w-md flex-shrink-0 space-y-3 px-4 pt-2 pb-8">
        <button
          onClick={onContinue}
          className="h-14 w-full rounded-xl bg-[#007aff] text-[17px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#0051d5] active:scale-[0.98]"
        >
          Continue
        </button>
        {onSkip && <OnboardingSkipLink onClick={onSkip} disabled={skipBusy} />}
      </div>
    </div>
  );
}
