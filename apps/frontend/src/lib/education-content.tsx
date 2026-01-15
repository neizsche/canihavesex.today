/**
 * Education content for contextual fertility awareness flows
 * 
 * Philosophy: Communicate that ovulation (not menstruation) determines fertility,
 * and that biological signals improve estimates without being didactic.
 */
import * as React from 'react';

export interface EducationScreen {
    title: string;
    body: string | React.ReactNode;
    helperText?: string;
    finalAction?: string;
}

export interface EducationFlow {
    screens: EducationScreen[];
}

/**
 * Global concept education - shown once before any feature-specific education
 * Communicates core philosophy: fertility depends on ovulation, not just dates
 */
export const GLOBAL_EDUCATION: EducationFlow = {
    screens: [
        {
            title: "How this app works",
            body: (
                <div className="flex flex-col gap-6 text-left w-full mt-2">
                    <div className="space-y-1">
                        <div className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">More than just dates</div>
                        <div className="text-[15px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Most apps guess based on calendars. Pregnancy depends on ovulation, which varies each cycle.
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">Biological signals</div>
                        <div className="text-[15px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Your body gives real signs (like temperature and fluid) that reveal when you are actually fertile.
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">Adaptive predictions</div>
                        <div className="text-[15px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            We combine your cycle history with these real-time signals to narrow down uncertainty.
                        </div>
                    </div>
                </div>
            )
        }
    ]
};

/**
 * Cervical Mucus education
 * Explains that mucus changes reflect fertile window approaching
 */
export const MUCUS_EDUCATION: EducationFlow = {
    screens: [
        {
            title: "Cervical mucus reflects fertile days",
            body: "As ovulation approaches, cervical mucus changes to support sperm survival.\nThese changes help identify the fertile window."
        },
        {
            title: "What to notice",
            body: "• Dry or sticky\n• Creamy\n• Clear, slippery, stretchy",
            helperText: "Clear and slippery mucus usually appears closest to ovulation.",
            finalAction: "Start tracking"
        }
    ]
};

/**
 * Basal Body Temperature education
 * Explains that temperature confirms ovulation retroactively, doesn't predict it
 */
export const BBT_EDUCATION: EducationFlow = {
    screens: [
        {
            title: "Temperature confirms ovulation",
            body: "Resting body temperature rises slightly *after* ovulation.\nThis helps confirm that ovulation has already occurred."
        },
        {
            title: "How it's used",
            body: "Temperature does not predict ovulation.\nIt confirms timing and improves accuracy in future cycles.",
            finalAction: "Start temperature tracking"
        }
    ]
};

/**
 * LH Test education
 * Explains that LH surge indicates ovulation is imminent but not guaranteed
 */
export const LH_EDUCATION: EducationFlow = {
    screens: [
        {
            title: "LH surge signals ovulation soon",
            body: "A positive LH test usually means ovulation may occur within the next 12–36 hours."
        },
        {
            title: "How this improves estimates",
            body: "LH tests narrow timing when combined with cycle history and other signs.\nOvulation is still inferred, not guaranteed.",
            finalAction: "Log LH test"
        }
    ]
};

/**
 * Combined Signals Overview (Apple "Highlights" Style)
 * Consolidates Mucus, BBT, and LH into one screen for shorter onboarding.
 */
export const SIGNALS_OVERVIEW: EducationFlow = {
    screens: [
        {
            title: "Understanding your signs",
            body: (
                <div className="flex flex-col gap-6 text-left w-full mt-2" >
                    <div className="space-y-1">
                        <div className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100"> Cervical Mucus</ div >
                        <div className="text-[15px] text-zinc-500 dark:text-zinc-400 leading-relaxed" >
                            Changes from dry to slippery to identify your fertile window as it approaches.
                        </div>
                    </div>
                    < div className="space-y-1" >
                        <div className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100" > Body Temperature </div>
                        < div className="text-[15px] text-zinc-500 dark:text-zinc-400 leading-relaxed" >
                            A slight rise confirms that ovulation has effectively occurred.
                        </div>
                    </div>
                    < div className="space-y-1" >
                        <div className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100" > LH Tests </div>
                        < div className="text-[15px] text-zinc-500 dark:text-zinc-400 leading-relaxed" >
                            Positive tests narrow down the exact 12–36 hour window.
                        </div>
                    </div>
                </div>
            ),
            finalAction: "Start tracking"
        }
    ]
};

/**
 * "How estimates work" info sheet content
 * Optional educational content for Charts screen
 */
export const ESTIMATES_INFO = {
    title: "How fertility estimates are made",
    body: "Menstrual cycles provide context.\nFertility awareness provides biological signals.\nTogether, they narrow uncertainty — never eliminate it.",
    footer: "Estimates improve with consistent observation."
};
