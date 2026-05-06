import * as React from 'react';
import { CheckCircle2, FileText, CalendarRange, Download, Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { usePremiumFeatures } from '../../../lib/featureFlags';
import { type CycleData, downloadCSV } from '../../../lib/mock-data';
import { PremiumUnlockCard } from '../../common/ui/PremiumUnlockCard';
import { EXPORT_VIEW_LABELS } from './ExportView.config';

interface ExportViewProps {
    data: CycleData[];
}

export function ExportView({ data }: ExportViewProps) {
    const { premiumEnabled } = usePremiumFeatures();
    const [includeNotes, setIncludeNotes] = React.useState(false);

    return (
        <div className="flex flex-col h-full bg-background dark:bg-black">
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="px-6 py-12 max-w-md mx-auto space-y-8 flex flex-col items-center min-h-[60vh]">

                    {/* Header Section */}
                    <div className="flex flex-col items-center text-center space-y-3 max-w-xs pt-4">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-2">
                            <Download className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-[22px] font-bold text-zinc-900 dark:text-white">
                            {EXPORT_VIEW_LABELS.header.title}
                        </h2>
                        <p className="text-[16px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {EXPORT_VIEW_LABELS.header.description}
                        </p>
                    </div>

                    {/* Options Group */}
                    <div className="w-full space-y-3">
                        {/* Option 1: Personal Notes Toggle */}
                        <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300">{EXPORT_VIEW_LABELS.options.includeNotes}</span>
                            <button
                                onClick={() => setIncludeNotes(!includeNotes)}
                                className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${includeNotes ? 'bg-[#007aff]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${includeNotes ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Option 2: Doctor's Report (PDF) - Conditionally shown if premium */}
                        {premiumEnabled && (
                            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 opacity-70">
                                <div className="flex items-center gap-2">
                                    <span className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300">{EXPORT_VIEW_LABELS.options.doctorReport}</span>
                                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                                </div>
                                {/* Disabled Toggle Appearance */}
                                <div className="w-11 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center px-0.5 cursor-not-allowed">
                                    <div className="w-5 h-5 bg-white/50 dark:bg-zinc-600 rounded-full shadow-sm" />
                                </div>
                            </div>
                        )}

                        {/* Option 3: Date Range Filter - Conditionally shown if premium */}
                        {premiumEnabled && (
                            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 opacity-70 cursor-not-allowed">
                                <span className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300">{EXPORT_VIEW_LABELS.options.dateRange}</span>
                                <div className="flex items-center gap-2 bg-zinc-200 dark:bg-zinc-800 px-3 py-1.5 rounded-lg text-zinc-500">
                                    <span className="text-[13px] font-medium">{EXPORT_VIEW_LABELS.options.allTime}</span>
                                    <Lock className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        )}

                        {/* Main Action */}
                        <button
                            onClick={() => {
                                // Trigger backend export
                                window.location.href = `/api/v1/user/export?includeNotes=${includeNotes}`;
                            }}
                            className="w-full bg-[#007aff] hover:bg-[#006ee6] active:scale-95 transition-all duration-200 text-white font-semibold h-12 rounded-xl text-[17px] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-4"
                        >
                            <Download className="w-5 h-5" />
                            {EXPORT_VIEW_LABELS.buttons.download}
                        </button>
                    </div>

                    {/* Premium Component (Bottom) - Conditionally shown */}
                    {premiumEnabled && (
                        <div className="w-full mt-auto pt-8">
                            <PremiumUnlockCard
                                title={EXPORT_VIEW_LABELS.premium.title}
                                description={EXPORT_VIEW_LABELS.premium.description}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
