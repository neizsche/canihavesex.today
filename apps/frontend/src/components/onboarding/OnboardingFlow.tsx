import * as React from 'react';
import { apiJson } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { OnboardingScopeConsent } from './OnboardingScopeConsent';
import { OnboardingSetup } from './OnboardingSetup';
import { AnimatedEducationScreen } from './AnimatedEducationScreen';
import { BrandTitle } from '@/components/common/BrandTitle';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { detectTemperatureUnit } from '@/components/log/temperatureUnits';

type OnboardingStep = 'consent' | 'education' | 'setup' | 'cycle_basics' | 'signals_overview';

interface OnboardingData {
  consent: boolean;
  cycle_regularity: 'regular' | 'irregular' | 'unsure' | null;
  cycle_length: number;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

const BrandingHeader = () => (
  <div className="onboarding-header z-50">
    <BrandTitle />
  </div>
);

const BrandLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300 motion-reduce:animate-none">
    <BrandingHeader />
    <div className="flex-1 min-h-0 relative">{children}</div>
  </div>
);

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const queryClient = useQueryClient();
  const { canPrompt, isInstalled, promptInstall } = useInstallPrompt();
  const [step, setStep] = React.useState<OnboardingStep>('consent');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<OnboardingData>({
    consent: false,
    cycle_regularity: 'regular', // Default to make flow skippable
    cycle_length: 28,
  });

  const updateData = (partial: Partial<OnboardingData>) => {
    // Use functional state updates to prevent state loss from concurrent render updates.
    setData((prev) => ({ ...prev, ...partial }));
  };

  async function handleComplete() {
    // Prevent concurrent submissions.
    if (busy) return;

    if (!data.cycle_regularity) {
      setError('Please complete all required fields.');
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

  // Skip action completes onboarding using default values.
  const handleSkip = handleComplete;

  // Trigger PWA installation prompt if available, then complete onboarding.
  async function handleFinish() {
    if (busy) return;
    try {
      await promptInstall();
    } catch {
      // Ignore installation prompt failures to ensure onboarding completion.
    }
    await handleComplete();
  }

  // Optional standalone PWA install action.
  async function handleInstall() {
    try {
      await promptInstall();
    } catch {
      // Ignore installation prompt failures.
    }
  }
  const installCta =
    canPrompt && !isInstalled ? { label: 'Install App', onClick: handleInstall } : null;

  // Render current step
  if (step === 'consent') {
    return (
      <BrandLayout>
        <OnboardingScopeConsent
          onContinue={() => setStep('education')}
          onSkip={handleSkip}
          skipBusy={busy}
        />
      </BrandLayout>
    );
  }

  // Content for "How it Works"
  const HOW_IT_WORKS_ITEMS = [
    {
      title: 'More than just dates',
      desc: 'Most apps guess based on calendars. Pregnancy depends on ovulation, which varies each cycle.',
    },
    {
      title: 'Biological signals',
      desc: 'Your body gives real signs (like temperature and fluid) that reveal when you are actually fertile.',
    },
    {
      title: 'Adaptive predictions',
      desc: 'We combine your cycle history with these real-time signals to narrow down uncertainty.',
    },
  ];

  // Content for "Signals Overview"
  const SIGNALS_ITEMS = [
    {
      title: 'Cervical Mucus',
      desc: 'Changes from dry to slippery to identify your fertile window as it approaches.',
    },
    {
      title: 'Body Temperature',
      desc: 'A slight rise confirms that ovulation has effectively occurred.',
    },
    {
      title: 'LH Tests',
      desc: 'Positive tests narrow down the exact 12–36 hour window.',
    },
  ];

  if (step === 'education') {
    return (
      <AnimatedEducationScreen
        title="How this app works"
        items={HOW_IT_WORKS_ITEMS}
        onComplete={() => setStep('setup')}
        onSkip={handleSkip}
        busy={busy}
      />
    );
  }

  if (step === 'setup') {
    return (
      <BrandLayout>
        <OnboardingSetup
          regularity={data.cycle_regularity}
          cycleLength={data.cycle_length}
          onUpdate={(updates) => {
            const payload: Partial<typeof data> = {};
            if (updates.regularity !== undefined) payload.cycle_regularity = updates.regularity;
            if (updates.cycleLength !== undefined) payload.cycle_length = updates.cycleLength;
            updateData(payload);
          }}
          onContinue={() => setStep('signals_overview')}
          onSkip={handleSkip}
          skipBusy={busy}
        />
      </BrandLayout>
    );
  }

  return (
    <>
      {/* Cycle Basics step removed/merged into Setup */}

      {step === 'signals_overview' && (
        <AnimatedEducationScreen
          title="Understanding your signs"
          items={SIGNALS_ITEMS}
          onComplete={handleFinish}
          busy={busy}
          error={error}
          ctaLabel="Get started"
          secondaryCta={installCta}
        />
      )}
    </>
  );
}
