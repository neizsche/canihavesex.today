import * as React from 'react';
import { cn } from '../../lib/utils';
import { Header } from '../common/Header';
import { InsetGroup } from '../common/ui/inset-group';

interface CycleSettingsScreenProps {
    onBack: () => void;
    lastPeriod: string;
    setLastPeriod: (value: string) => void;
    cycleMin: number;
    setCycleMin: (value: number) => void;
    cycleMax: number;
    setCycleMax: (value: number) => void;
    periodLength: number;
    setPeriodLength: (value: number) => void;
    regularity: 'regular' | 'irregular' | 'unsure';
    setRegularity: (value: 'regular' | 'irregular' | 'unsure') => void;
}

export function CycleSettingsScreen({
    onBack,
    lastPeriod,
    setLastPeriod,
    cycleMin,
    setCycleMin,
    cycleMax,
    setCycleMax,
    periodLength,
    setPeriodLength,
    regularity,
    setRegularity
}: CycleSettingsScreenProps) {
    return (
        <div className="h-full bg-background font-sans flex flex-col animate-in slide-in-from-right duration-300">
            <Header onBack={onBack} title="Cycle Settings" />

            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="pb-24 pt-6 sm:pt-8 bg-[#F2F2F7] dark:bg-black min-h-full">
                    <div className="max-w-md mx-auto space-y-6 sm:space-y-8">

                        <div className="px-6 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                            Accurate cycle details help us provide better fertility insights.
                        </div>

                        {/* Profile - Cycle Settings */}
                        <InsetGroup title="Cycle Details">
                            <div className="px-4 py-4 space-y-6">
                                {/* Last Period Start */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                        Last Period Start
                                    </label>
                                    <input
                                        type="date"
                                        value={lastPeriod}
                                        onChange={(e) => setLastPeriod(e.target.value)}
                                        max={new Date().toISOString().slice(0, 10)}
                                        className="w-full h-10 px-3 text-[15px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Cycle Length Range */}
                                <div className="space-y-3">
                                    <label className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                        Cycle Length Range
                                    </label>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[13px] text-zinc-600 dark:text-zinc-400">Minimum</span>
                                                <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{cycleMin} days</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={21}
                                                max={35}
                                                value={cycleMin}
                                                onChange={(e) => {
                                                    const newMin = Number(e.target.value);
                                                    if (newMin <= cycleMax) {
                                                        setCycleMin(newMin);
                                                    }
                                                }}
                                                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[13px] text-zinc-600 dark:text-zinc-400">Maximum</span>
                                                <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{cycleMax} days</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={21}
                                                max={35}
                                                value={cycleMax}
                                                onChange={(e) => {
                                                    const newMax = Number(e.target.value);
                                                    if (newMax >= cycleMin) {
                                                        setCycleMax(newMax);
                                                    }
                                                }}
                                                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Period Length */}
                                <div className="space-y-3">
                                    <label className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                        Period Length
                                    </label>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[13px] text-zinc-600 dark:text-zinc-400">Typical duration</span>
                                            <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{periodLength} days</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={3}
                                            max={7}
                                            value={periodLength}
                                            onChange={(e) => setPeriodLength(Number(e.target.value))}
                                            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Regularity */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                        Cycle Regularity
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['regular', 'irregular', 'unsure'] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setRegularity(option)}
                                                className={cn(
                                                    "h-9 rounded-lg text-[13px] font-medium transition-all capitalize",
                                                    regularity === option
                                                        ? "bg-blue-500 text-white"
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                )}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </InsetGroup>

                    </div>
                </div>
            </div>
        </div>
    );
}
