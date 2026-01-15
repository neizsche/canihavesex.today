import * as React from 'react';
import { apiJson } from '../lib/api';
import { updateCacheFromMutation, type MutationResponse } from '../lib/cacheUtils';
import { useQueryClient } from '@tanstack/react-query';
import { BRAND } from '../lib/siteConfig';
import { OnboardingScopeConsent } from './OnboardingScopeConsent';
import { OnboardingSetup } from './OnboardingSetup';
import { AnimatedEducationScreen } from './AnimatedEducationScreen';

type OnboardingStep = 'consent' | 'education' | 'setup' | 'cycle_basics' | 'signals_overview';

interface OnboardingData {
    consent: boolean;
    intent: 'avoid_pregnancy' | 'conceive' | 'understand_cycle' | null;
    cycle_regularity: 'regular' | 'irregular' | 'unsure' | null;
    context_flags: string[];
    last_period_start: string;
    cycle_length_min: number;
    cycle_length_max: number;
}

interface OnboardingFlowProps {
    onComplete: () => void;
}

const BrandingHeader = () => (
    <div className="flex-shrink-0 pt-8 pb-4 flex items-center justify-center z-50">
        <div className="text-[22px] tracking-tight text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
            {BRAND.PREFIX}<span className="text-rose-500 font-extrabold italic">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX}
        </div>
    </div>
);

const BrandLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
        <BrandingHeader />
        <div className="flex-1 min-h-0 relative">
            {children}
        </div>
    </div>
);

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
    const queryClient = useQueryClient();
    const [step, setStep] = React.useState<OnboardingStep>('consent');
    const [busy, setBusy] = React.useState(false);
    const [data, setData] = React.useState<OnboardingData>({
        consent: false,
        intent: 'avoid_pregnancy',     // Default per user request
        cycle_regularity: 'regular',   // Default to make flow skippable
        context_flags: [],
        last_period_start: new Date().toISOString().slice(0, 10),
        cycle_length_min: 26,
        cycle_length_max: 30
    });

    const updateData = (partial: Partial<OnboardingData>) => {
        setData({ ...data, ...partial });
    };

    async function handleComplete() {
        if (!data.intent || !data.cycle_regularity || !data.last_period_start) {
            alert('Please complete all required fields');
            return;
        }

        setBusy(true);
        try {
            const response = await apiJson<MutationResponse>('/api/onboarding/complete', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    intent: data.intent,
                    cycle_regularity: data.cycle_regularity,
                    context_flags: data.context_flags,
                    last_period_start: data.last_period_start
                })
            });

            // Update cache with response data
            updateCacheFromMutation(queryClient, response);

            // Invalidate onboarding status
            await queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });

            onComplete();
        } catch (err) {
            alert('Could not complete onboarding. Please try again.');
            setBusy(false);
        }
    }

    // Render current step
    if (step === 'consent') {
        return (
            <BrandLayout>
                <OnboardingScopeConsent onContinue={() => setStep('education')} />
            </BrandLayout>
        );
    }


    // Content for "How it Works"
    const HOW_IT_WORKS_ITEMS = [
        {
            title: "More than just dates",
            desc: "Most apps guess based on calendars. Pregnancy depends on ovulation, which varies each cycle."
        },
        {
            title: "Biological signals",
            desc: "Your body gives real signs (like temperature and fluid) that reveal when you are actually fertile."
        },
        {
            title: "Adaptive predictions",
            desc: "We combine your cycle history with these real-time signals to narrow down uncertainty."
        }
    ];

    // Content for "Signals Overview"
    const SIGNALS_ITEMS = [
        {
            title: "Cervical Mucus",
            desc: "Changes from dry to slippery to identify your fertile window as it approaches."
        },
        {
            title: "Body Temperature",
            desc: "A slight rise confirms that ovulation has effectively occurred."
        },
        {
            title: "LH Tests",
            desc: "Positive tests narrow down the exact 12–36 hour window."
        }
    ];

    if (step === 'education') {
        return (
            <AnimatedEducationScreen
                title="How this app works"
                items={HOW_IT_WORKS_ITEMS}
                onComplete={() => setStep('setup')}
            />
        );
    }

    if (step === 'setup') {
        return (
            <BrandLayout>
                <OnboardingSetup
                    regularity={data.cycle_regularity}
                    contextFlags={data.context_flags}
                    lastPeriodStart={data.last_period_start}
                    cycleLengthMin={data.cycle_length_min}
                    cycleLengthMax={data.cycle_length_max}
                    onUpdate={(updates) => {
                        const payload: Partial<typeof data> = {};
                        if (updates.regularity !== undefined) payload.cycle_regularity = updates.regularity;
                        if (updates.contextFlags !== undefined) payload.context_flags = updates.contextFlags;
                        if (updates.lastPeriodStart !== undefined) payload.last_period_start = updates.lastPeriodStart;
                        if (updates.cycleLengthMin !== undefined) payload.cycle_length_min = updates.cycleLengthMin;
                        if (updates.cycleLengthMax !== undefined) payload.cycle_length_max = updates.cycleLengthMax;
                        updateData(payload);
                    }}
                    onContinue={() => setStep('signals_overview')}
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
                    onComplete={handleComplete}
                />
            )}
        </>
    );
}
