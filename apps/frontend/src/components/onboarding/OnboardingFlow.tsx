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
            // The engine only stores the average; send the single value as both
            // bounds so the existing min/max API resolves to exactly it.
            cycle_length_min: data.cycle_length,
            cycle_length_max: data.cycle_length,
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
          avg_cycle_length: data.cycle_length,
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

  // Content for "How it Works" — lead with the plain promise so someone with no
  // fertility-tracking background feels welcome before any biology shows up.
  const HOW_IT_WORKS_ITEMS = [
    {
      title: 'A clear answer each day',
      desc: 'Open the app and see your chance of pregnancy today — higher, lower, or unsure. No charts to decode.',
    },
    {
      title: 'Starts with your period',
      desc: 'Just log when your period starts. That alone is enough to map your cycle and flag your higher-risk days.',
    },
    {
      title: 'Gets sharper over time',
      desc: 'The more you log, the better it learns your unique rhythm and narrows down the guesswork.',
    },
  ];

  // Content for "Signals Overview" — framed as an optional upgrade, not homework.
  // The period-only path already works; these only sharpen the prediction.
  const SIGNALS_ITEMS = [
    {
      title: 'Cervical fluid',
      desc: 'Changes from dry to slippery as your fertile days approach — the earliest natural sign, and no kit needed.',
    },
    {
      title: 'Body temperature',
      desc: 'A slight rise confirms your fertile window has passed for this cycle. Optional, but it adds certainty.',
    },
    {
      title: 'LH tests',
      desc: 'Optional drugstore strips that pinpoint your most fertile day or two.',
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
          title="Optional: sharpen your answer"
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
