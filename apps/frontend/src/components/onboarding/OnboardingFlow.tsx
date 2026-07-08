import * as React from 'react';
import { apiJson } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarX2, Droplets, Sparkles } from 'lucide-react';
import { OnboardingFrame, type OnboardingStepView } from './OnboardingFrame';
import { welcomeStep } from './OnboardingWelcome';
import { educationStep, type EducationItem } from './OnboardingEducation';
import { setupStep } from './OnboardingSetup';
import { readyStep } from './OnboardingReady';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { detectTemperatureUnit } from '@/components/log/temperatureUnits';
import { toIsoDate } from '@/lib/date';

type OnboardingStep = 'welcome' | 'education' | 'setup' | 'ready';

// Position of each step in the flow — drives the header progress dots.
const STEP_INDEX: Record<OnboardingStep, number> = {
  welcome: 0,
  education: 1,
  setup: 2,
  ready: 3,
};

interface OnboardingData {
  cycle_regularity: 'regular' | 'irregular' | 'unsure' | null;
  cycle_length: number;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  /**
   * Shared demo session: run the flow as a walkthrough only. Nothing is
   * persisted — the account is read-only and keeps its seeded cycle config, so
   * completion just drops the visitor into the seeded app.
   */
  isDemo?: boolean;
}

// The one education screen: what makes this different from a calendar app.
const EDUCATION_ITEMS: EducationItem[] = [
  {
    icon: CalendarX2,
    title: 'Ovulation moves',
    desc: "It shifts from cycle to cycle, so dates alone can't pin your fertile window.",
  },
  {
    icon: Droplets,
    title: 'Your body shows it',
    desc: "Fluid, temperature, and ovulation tests reveal what's actually happening.",
  },
  {
    icon: Sparkles,
    title: 'Estimates that adapt',
    desc: "We blend your history with today's signals to sharpen every prediction.",
  },
];

export function OnboardingFlow({ onComplete, isDemo = false }: OnboardingFlowProps) {
  const queryClient = useQueryClient();
  const { canPrompt, isInstalled, promptInstall } = useInstallPrompt();
  const [step, setStep] = React.useState<OnboardingStep>('welcome');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<OnboardingData>({
    cycle_regularity: 'regular', // Default to make the flow skippable.
    cycle_length: 28,
  });

  const updateData = (partial: Partial<OnboardingData>) => {
    // Functional update to prevent state loss from concurrent renders.
    setData((prev) => ({ ...prev, ...partial }));
  };

  async function handleComplete() {
    // Prevent concurrent submissions.
    if (busy) return;

    if (!data.cycle_regularity) {
      setError('Please complete all required fields.');
      return;
    }

    // Demo is read-only: don't call the API (it would 403) or mutate the seeded
    // config — just finish the walkthrough and land in the app.
    if (isDemo) {
      onComplete();
      return;
    }

    setBusy(true);
    setError(null);
    // Initialize temperature unit based on device locale.
    const temperatureUnit = detectTemperatureUnit();

    try {
      const response = await apiJson<any>(
        '/api/v1/user/preferences',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cycle_regularity: data.cycle_regularity,
            // Set both bounds to the same value to represent a single average cycle length.
            cycle_length_min: data.cycle_length,
            cycle_length_max: data.cycle_length,
            temperature_unit: temperatureUnit,
          }),
        },
        // Retry fetch on transient failures.
        { retries: 2, timeoutMs: 15000 }
      );

      // Update session cache.
      queryClient.setQueryData(['session'], response);

      // Update profile cache to sync settings.
      queryClient.setQueryData(['user-profile'], (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          cycle_regularity: data.cycle_regularity,
          avg_cycle_length: data.cycle_length,
          temperature_unit: temperatureUnit,
        };
      });

      onComplete();
    } catch (err) {
      setError("Couldn't finish setup. Check your connection and try again.");
      setBusy(false);
    }
  }

  // Skip (from the setup step) completes onboarding using the default values.
  const handleSkip = handleComplete;

  // Trigger the PWA install prompt if available, then complete onboarding.
  async function handleFinish() {
    if (busy) return;
    try {
      await promptInstall();
    } catch {
      // Ignore install-prompt failures to ensure onboarding completes.
    }
    await handleComplete();
  }

  // Optional standalone PWA install action, surfaced on the final step.
  async function handleInstall() {
    try {
      await promptInstall();
    } catch {
      // Ignore install-prompt failures.
    }
  }
  const installCta =
    canPrompt && !isInstalled ? { label: 'Install App', onClick: handleInstall } : null;

  // Build just the content + footer for the current step. The frame itself is
  // rendered once below and stays mounted, so only this inner view changes.
  const view: OnboardingStepView = (() => {
    switch (step) {
      case 'welcome':
        return welcomeStep({ onContinue: () => setStep('education') });

      case 'education':
        return educationStep({
          title: 'Calendars guess. Your body knows.',
          items: EDUCATION_ITEMS,
          onContinue: () => setStep('setup'),
        });

      case 'setup':
        return setupStep({
          regularity: data.cycle_regularity,
          cycleLength: data.cycle_length,
          onUpdate: (updates) => {
            const payload: Partial<OnboardingData> = {};
            if (updates.regularity !== undefined) payload.cycle_regularity = updates.regularity;
            if (updates.cycleLength !== undefined) payload.cycle_length = updates.cycleLength;
            updateData(payload);
          },
          onContinue: () => setStep('ready'),
          onSkip: handleSkip,
          skipBusy: busy,
        });

      case 'ready':
        return readyStep({
          onFinish: handleFinish,
          busy,
          error,
          secondaryCta: installCta,
        });
    }
  })();

  return (
    <OnboardingFrame
      stepIndex={STEP_INDEX[step]}
      contentKey={step}
      footer={view.footer}
      contentClassName={view.contentClassName}
    >
      {view.content}
    </OnboardingFrame>
  );
}
