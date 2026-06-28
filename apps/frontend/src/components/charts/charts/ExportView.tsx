import * as React from 'react';
import { Download } from 'lucide-react';
import { EXPORT_VIEW_LABELS } from './ExportView.config';

export function ExportView() {
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

          {/* Action Button */}
          <div className="w-full">
            <button
              onClick={() => {
                // Trigger backend export
                window.location.href = '/api/v1/user/export';
              }}
              className="w-full bg-[#007aff] hover:bg-[#006ee6] active:scale-95 transition-all duration-200 text-white font-semibold h-12 rounded-xl text-[17px] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {EXPORT_VIEW_LABELS.buttons.download}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
