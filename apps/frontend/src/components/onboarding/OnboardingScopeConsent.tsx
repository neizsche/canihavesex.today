import * as React from 'react';
interface OnboardingScopeConsentProps {
  onContinue: () => void;
}

export function OnboardingScopeConsent({ onContinue }: OnboardingScopeConsentProps) {
  return (
    <div className="h-full bg-background font-sans flex flex-col overflow-y-auto">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full space-y-12 text-center">
          {/* Hero Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/10 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 flex items-center justify-center transition-transform hover:scale-105 duration-500">
                <img
                  src="/logo.png"
                  alt="App Logo"
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[34px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              Daily fertility <br />
              made simple.
            </h2>

            <p className="text-[19px] leading-relaxed text-zinc-600 dark:text-zinc-400 px-4">
              Track your cycle, understand your body, and get clear fertility estimates every day.
            </p>
          </div>

          <div className="space-y-6">
            <div className="pt-4">
              <button
                onClick={onContinue}
                className="w-full h-14 rounded-2xl bg-[#007aff] text-white font-bold text-[17px] transition-all hover:bg-[#0051d5] active:scale-[0.98] shadow-xl shadow-blue-500/25"
              >
                Get Started
              </button>
            </div>

            <p className="text-[13px] text-zinc-400 dark:text-zinc-500 max-w-[280px] mx-auto leading-relaxed font-medium">
              This app provides estimates based on your data. It does not provide medical advice or
              birth control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
