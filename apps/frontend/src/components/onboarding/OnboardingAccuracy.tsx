import * as React from 'react';
import { InsetGroup } from '@/components/common/ui/inset-group';

interface OnboardingAccuracyProps {
  regularity: 'regular' | 'irregular' | 'unsure' | null;
  contextFlags: string[];
  onUpdate: (data: {
    regularity?: 'regular' | 'irregular' | 'unsure';
    contextFlags?: string[];
  }) => void;
  onContinue: () => void;
}

export function OnboardingAccuracy({
  regularity,
  contextFlags,
  onUpdate,
  onContinue,
}: OnboardingAccuracyProps) {
  const regularityOptions = [
    { value: 'regular' as const, label: 'Usually regular' },
    { value: 'irregular' as const, label: 'Sometimes irregular' },
    { value: 'unsure' as const, label: 'Unsure' },
  ];

  const contextOptions = [
    { value: 'breastfeeding', label: 'Breastfeeding / postpartum' },
    { value: 'post_hormones', label: 'Recently stopped hormones' },
  ];

  const toggleContextFlag = (flag: string) => {
    const updated = contextFlags.includes(flag)
      ? contextFlags.filter((f) => f !== flag)
      : [...contextFlags, flag];
    onUpdate({ contextFlags: updated });
  };

  return (
    <div className="h-full bg-background font-sans flex flex-col overflow-y-auto">
      <div className="max-w-md mx-auto w-full px-4 pt-20 pb-8 space-y-8">
        <h1 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight px-4">
          Help improve accuracy
        </h1>

        {/* Cycle Regularity */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-4">
            How regular are your cycles?
          </h3>
          <InsetGroup>
            {regularityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onUpdate({ regularity: option.value })}
                className="w-full h-12 flex items-center justify-between px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700 border-b last:border-b-0 border-zinc-200 dark:border-zinc-700/50"
              >
                <span className="text-[17px] text-zinc-900 dark:text-zinc-100">{option.label}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    regularity === option.value
                      ? 'border-[#007aff] bg-[#007aff]'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  {regularity === option.value && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </InsetGroup>
        </div>

        {/* Context Flags */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-4">
            Do any of these apply?
          </h3>
          <InsetGroup>
            {contextOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleContextFlag(option.value)}
                className="w-full h-12 flex items-center justify-between px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700 border-b last:border-b-0 border-zinc-200 dark:border-zinc-700/50"
              >
                <span className="text-[17px] text-zinc-900 dark:text-zinc-100">{option.label}</span>
                <input
                  type="checkbox"
                  checked={contextFlags.includes(option.value)}
                  onChange={() => {}}
                  className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-[#007aff] focus:ring-0 pointer-events-none"
                />
              </button>
            ))}
            <button
              onClick={() => onUpdate({ contextFlags: [] })}
              className="w-full h-12 flex items-center justify-between px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
            >
              <span className="text-[17px] text-zinc-900 dark:text-zinc-100">None</span>
              <input
                type="checkbox"
                checked={contextFlags.length === 0}
                onChange={() => {}}
                className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-[#007aff] focus:ring-0 pointer-events-none"
              />
            </button>
          </InsetGroup>
        </div>

        {/* Continue Button */}
        <div className="px-4 pt-4">
          <button
            onClick={onContinue}
            disabled={!regularity}
            className="w-full h-12 rounded-xl bg-[#007aff] text-white font-semibold text-[17px] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
