import * as React from 'react';
import { InsightPageData } from '../../../lib/mock-data';
import { Lock } from 'lucide-react';
interface InsightContentProps {
    data: InsightPageData;
}

export function InsightContent({ data }: InsightContentProps) {
    return (
        <>
            {/* Generic Source Text */}
            {data.sourceText && (
                <div className="mb-8 px-4 py-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-center">
                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium pb-1">Data Source</p>
                    <p className="text-[15px] text-zinc-700 dark:text-zinc-300 leading-snug">
                        {data.sourceText}
                    </p>
                </div>
            )}

            {/* Notify Messages List */}
            {data.notifications && data.notifications.length > 0 && (
                <div className="mt-6 space-y-3">
                    {data.notifications.map((note, idx) => (
                        <div key={idx} className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <p className="text-[14px] text-zinc-600 dark:text-zinc-400 leading-snug">
                                {note}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Optional Warning */}
            {data.warning && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <div className="font-semibold text-[15px] text-amber-900 dark:text-amber-200 mb-1">
                                {data.warning.title}
                            </div>
                            <div className="text-[14px] text-amber-800 dark:text-amber-300">
                                {data.warning.description}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
