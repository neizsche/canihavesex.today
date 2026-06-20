import * as React from 'react';
import { apiJson } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { OnboardingScopeConsent } from './OnboardingScopeConsent';
import { OnboardingSetup } from './OnboardingSetup';
import { AnimatedEducationScreen } from './AnimatedEducationScreen';
import { BrandTitle } from '@/components/common/BrandTitle';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

type OnboardingStep = 'consent' | 'education' | 'setup' | 'cycle_basics' | 'signals_overview';

interface OnboardingData {
  consent: boolean;
  cycle_regularity: 'regular' | 'irregular' | 'unsure' | null;
  cycle_length_min: number;
  cycle_length_max: number;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

const BrandingHeader = () => (
  <div className="flex-shrink-0 pt-8 pb-4 flex items-center justify-center z-50">
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
    cycle_length_min: 26,
    cycle_length_max: 30,
  });

  const updateData = (partial: Partial<OnboardingData>) => {
    // Functional update: onboarding steps can fire several onUpdate calls in a
    // single render; a stale-closure spread would drop all but the last.
    setData((prev) => ({ ...prev, ...partial }));
  };

  async function handleComplete() {
    // Guard against double-submit (the button can be tapped twice before busy renders).
    if (busy) return;

    if (!data.cycle_regularity) {
      setError('Please complete all required fields.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await apiJson<any>(
        '/api/v1/user/preferences',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cycle_regularity: data.cycle_regularity,
            cycle_length_min: data.cycle_length_min,
            cycle_length_max: data.cycle_length_max,
          }),
        },
        // Retry transient failures (network blips / 5xx) with a 15s per-attempt cap.
        { retries: 2, timeoutMs: 15000 }
      );

      // Update session cache with response data (contains userId, email, onboardingCompleted)
      queryClient.setQueryData(['session'], response);

      // Update profile cache if it exists to keep settings in sync
      queryClient.setQueryData(['user-profile'], (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          cycle_regularity: data.cycle_regularity,
          avg_cycle_length: (data.cycle_length_min + data.cycle_length_max) / 2,
        };
      });

      onComplete();
    } catch (err) {
      setError("Couldn't finish setup. Check your connection and try again.");
      setBusy(false);
    }
  }

  // Skipping finalizes onboarding with whatever has been entered so far (the
  // defaults are all valid), so it reuses the same submit path as the CTA.
  const handleSkip = handleComplete;

  // Final CTA: offer the native "add to home screen" prompt as part of finishing.
  // It must be triggered inside the click gesture; it's a no-op on platforms
  // without a deferred prompt (iOS, already installed), so completion never blocks.
  async function handleFinish() {
    if (busy) return;
    try {
      await promptInstall();
    } catch {
      // Never let an install hiccup get in the way of finishing onboarding.
    }
    await handleComplete();
  }

  // Explicit "Install App" button on the final step. Fires the native prompt
  // without completing onboarding, so the user can install and still review the
  // last screen. Only shown when a deferred prompt is actually available.
  async function handleInstall() {
    try {
      await promptInstall();
    } catch {
      // Non-blocking — the user can still finish via the primary CTA.
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
          cycleLengthMin={data.cycle_length_min}
          cycleLengthMax={data.cycle_length_max}
          onUpdate={(updates) => {
            const payload: Partial<typeof data> = {};
            if (updates.regularity !== undefined) payload.cycle_regularity = updates.regularity;
            if (updates.cycleLengthMin !== undefined)
              payload.cycle_length_min = updates.cycleLengthMin;
            if (updates.cycleLengthMax !== undefined)
              payload.cycle_length_max = updates.cycleLengthMax;
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
