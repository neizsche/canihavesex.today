import * as React from 'react';

interface OnboardingSkipLinkProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Quiet "Skip for now" secondary action, rendered directly beneath the primary
 * CTA on each onboarding step. Reads as a conventional fallback rather than a
 * floating element competing with the hero content.
 */
export function OnboardingSkipLink({ onClick, disabled = false }: OnboardingSkipLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-1 text-center text-[15px] font-medium text-zinc-400 transition-colors hover:text-zinc-600 active:opacity-60 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-500 dark:hover:text-zinc-300"
    >
      Skip for now
    </button>
  );
}
