import * as React from 'react';
import { ConfidenceBlock } from '../../../lib/mock-data';

interface ConfidenceCardProps {
    data: ConfidenceBlock;
}

export function ConfidenceCard({ data }: ConfidenceCardProps) {
    if (!data) return null;

    return (
        <div className="mb-8 p-5 rounded-[24px] bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden relative">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-bold text-zinc-400 tracking-widest uppercase">
                    Confidence Level
                </h4>
                <div className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                    <span className="text-[11px] font-bold text-teal-400 tracking-wide">
                        {data.label}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-zinc-800 rounded-full mb-5 overflow-hidden">
                <div
                    className="h-full bg-teal-400 rounded-full"
                    style={{ width: `${data.score}%` }}
                />
            </div>

            {/* Description */}
            <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-[14px] leading-snug text-zinc-400">
                    {data.message}
                </p>
            </div>
        </div>
    );
}
