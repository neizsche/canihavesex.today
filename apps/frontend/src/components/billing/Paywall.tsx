import * as React from 'react';
import { apiJson } from '@/lib/api';
import { BrandTitle } from '@/components/common/BrandTitle';
import { PlanPicker } from './PlanPicker';
import type { BillingState } from '@/hooks/queries/useBillingStatus';

// Invalidates the query cache on sign-out to prevent stale session data leaks.
async function signOut() {
  try {
    await apiJson('/api/signout', { method: 'POST' });

    try {
      window.localStorage.removeItem('chs-query-cache');
    } catch {}

    window.location.href = '/';
  } catch {
    alert('Signout failed. Please try again.');
  }
}

/**
 * Full-screen billing gate component rendered when billing is enabled and the user lacks active entitlements
 * (e.g., trial expired or no active subscription). Backend requests for logging and insights will return 402.
 * Settings remain accessible to allow data export or account deletion.
 */
export function Paywall({ state }: { state: BillingState }) {
  const expired = state === 'expired';

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-background font-sans">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 space-y-3 text-center">
          <img
            src="/assets/logo.png"
            alt="App Logo"
            width={64}
            height={64}
            decoding="sync"
            fetchPriority="high"
            className="mx-auto h-16 w-16 object-contain mix-blend-multiply dark:mix-blend-normal"
          />
          <BrandTitle className="justify-center text-[24px]" />
          {expired && (
            <h2 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
              Your trial has ended
            </h2>
          )}
          <p className="mx-auto max-w-xs text-[15px] leading-relaxed text-muted-foreground">
            Keep logging and seeing today's status. No ads, no tracking — your data stays yours.
          </p>
        </div>

        <PlanPicker />

        <button
          type="button"
          onClick={signOut}
          className="mx-auto mt-7 text-[13px] font-medium text-muted-foreground transition-opacity active:opacity-70"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
