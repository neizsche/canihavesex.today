import { Spinner } from '@/components/common/ui/spinner';

/**
 * Shown for the moment after the user returns from a successful checkout, while
 * we poll for the webhook to activate the subscription. Calm and brief — it
 * resolves into the Today screen as soon as entitlement flips on.
 */
export function BillingActivating() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Spinner size={28} />
      <div className="space-y-1.5">
        <h1 className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Confirming your subscription
        </h1>
        <p className="text-[13px] text-muted-foreground">This only takes a moment.</p>
      </div>
    </div>
  );
}
