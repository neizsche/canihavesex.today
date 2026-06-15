import * as React from 'react';
import { InsightPageData } from '@/lib/mock-data';
interface InsightContentProps {
  data: InsightPageData;
}

export function InsightContent({ data }: InsightContentProps) {
  return (
    <>
      {/* Generic Source Text */}
      {data.sourceText && (
        <div className="mb-8 px-5 py-4 rounded-[24px] bg-white/50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] text-center backdrop-blur-md shadow-sm">
          <p className="text-[12px] text-black/40 dark:text-white/40 font-bold tracking-[0.1em] uppercase pb-1.5">
            Data Source
          </p>
          <p className="text-[15px] text-black/80 dark:text-white/80 leading-snug font-medium">
            {data.sourceText}
          </p>
        </div>
      )}

      {/* Notify Messages List */}
      {data.notifications && data.notifications.length > 0 && (
        <div className="mt-6 space-y-3">
          {data.notifications.map((note, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 px-5 py-4 rounded-[24px] bg-white/60 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] backdrop-blur-md shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <p className="text-[15px] text-black/70 dark:text-white/70 leading-relaxed font-medium">
                {note}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Optional Warning */}
      {data.warning && (
        <div className="mt-6 p-5 rounded-[24px] bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="p-1.5 rounded-full bg-amber-500/20 mt-0.5">
              <svg
                className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-[16px] text-amber-900 dark:text-amber-200 mb-1 tracking-tight">
                {data.warning.title}
              </div>
              <div className="text-[15px] text-amber-800 dark:text-amber-300 leading-relaxed">
                {data.warning.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
