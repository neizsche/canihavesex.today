import * as React from 'react';
import { InsetGroup } from './ui/inset-group';

interface OnboardingScopeConsentProps {
    onContinue: () => void;
}

export function OnboardingScopeConsent({ onContinue }: OnboardingScopeConsentProps) {
    return (
        <div className="h-full bg-background font-sans flex flex-col overflow-y-auto">
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="max-w-md w-full space-y-8 text-center bg-transparent">
                    <div className="space-y-4">
                        <h2 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                            Daily fertility made simple.
                        </h2>

                        <p className="text-[17px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Track your cycle, understand your body, and get clear fertility estimates every day.
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={onContinue}
                            className="w-full h-14 rounded-xl bg-[#007aff] text-white font-semibold text-[17px] transition-all hover:bg-[#0051d5] active:scale-[0.98] shadow-lg shadow-blue-500/20"
                        >
                            Continue
                        </button>
                    </div>

                    <p className="text-[13px] text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto leading-relaxed">
                        This app provides estimates based on your data. It does not provide medical advice or birth control.
                    </p>
                </div>
            </div>
        </div>
    );
}
