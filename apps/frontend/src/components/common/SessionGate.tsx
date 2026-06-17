import * as React from 'react';
import { useSession } from '@/hooks/queries/useSession';
import { currentReturnTo, UnauthorizedError } from '@/lib/api';
import { SignInPage } from './SignInPage';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

interface SessionGateProps {
  children: React.ReactNode;
}

function redirectToAuth(): void {
  const rt = currentReturnTo();
  window.location.href = `/?openAuth=true&returnTo=${encodeURIComponent(rt)}`;
}

export function SessionGate({ children }: SessionGateProps) {
  const session = useSession();

  React.useEffect(() => {
    if (session.isError && session.error instanceof UnauthorizedError) {
      redirectToAuth();
    }
  }, [session.isError, session.error]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !session.data?.userId) return;

    const isAtOnboarding = window.location.hash === '#/onboarding';

    if (session.data?.onboardingCompleted === false) {
      if (!isAtOnboarding) {
        window.location.hash = '#/onboarding';
      }
      return;
    }

    if (isAtOnboarding) {
      // If onboarding is completed but user is on #/onboarding, redirect to #/today
      window.location.hash = '#/today';
    }
  }, [session.data?.userId, session.data?.onboardingCompleted]);

  if (session.isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="text-sm text-zinc-500 animate-pulse">Loading session…</div>
      </div>
    );
  }

  if (session.isError) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Unable to connect</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            We couldn't reach the server. Please check your connection or try again.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // No user session -> show SignInPage inline
  if (!session.data?.userId) {
    return <SignInPage returnTo={currentReturnTo()} />;
  }

  // Gate onboarding synchronously during render. The hash-sync effect above
  // only runs after a commit, so relying on it to swap routes briefly flashes
  // the Today screen first. Returning here keeps the app chrome from mounting.
  if (session.data.onboardingCompleted === false) {
    return <OnboardingFlow onComplete={() => (window.location.hash = '#/today')} />;
  }

  return <>{children}</>;
}
