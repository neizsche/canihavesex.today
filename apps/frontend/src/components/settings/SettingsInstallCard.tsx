import { Plus, Share } from 'lucide-react';

import { SETTINGS_SCREEN_LABELS } from './SettingsScreen.config';

export function SettingsInstallCard({
  canPrompt,
  isIOS,
  installOpen,
  manualSteps,
  onToggleInstall,
  onPromptInstall,
}: {
  canPrompt: boolean;
  isIOS: boolean;
  installOpen: boolean;
  manualSteps: string[];
  onToggleInstall: () => void;
  onPromptInstall: () => void;
}) {
  return (
    <div className="relative mx-4 overflow-hidden rounded-[20px] bg-gradient-to-b from-white to-[#f4f4f7] shadow-[0_8px_24px_-10px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06] dark:from-[#2c2c2e] dark:to-[#1f1f22] dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] dark:ring-white/10">
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-3.5">
          <img
            src="/apple-touch-icon.png"
            alt=""
            width={80}
            height={80}
            className="h-20 w-20 flex-shrink-0 object-contain"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[18px] font-bold tracking-tight text-zinc-900 dark:text-white">
              {SETTINGS_SCREEN_LABELS.install.title}
            </div>
            <div className="mt-0.5 truncate text-[13px] font-medium leading-snug text-zinc-500 dark:text-zinc-400">
              {SETTINGS_SCREEN_LABELS.install.prompt}
            </div>
          </div>
          <button
            type="button"
            onClick={canPrompt ? onPromptInstall : onToggleInstall}
            className="flex-shrink-0 rounded-full bg-[#007aff] px-[18px] py-2 text-[13px] font-semibold text-white transition-opacity active:opacity-80"
          >
            {canPrompt ? 'Get' : installOpen ? 'Close' : 'Get'}
          </button>
        </div>

        {!canPrompt && installOpen && (
          <ol className="mt-3.5 space-y-2.5 border-t border-black/5 pt-3.5 dark:border-white/10">
            {manualSteps.map((step, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[12px] font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {i + 1}
                </span>
                <span className="flex items-center gap-1.5 text-[13px] text-zinc-600 dark:text-zinc-300">
                  {step}
                  {isIOS && i === 0 && (
                    <Share className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  )}
                  {isIOS && i === 1 && (
                    <Plus className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
