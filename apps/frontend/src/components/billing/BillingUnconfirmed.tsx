import { AlertCircle } from 'lucide-react';

/**
 * Shown when a checkout return didn't result in access: a failed/cancelled
 * payment, or a successful one whose webhook hasn't activated the plan yet.
 * Honest about the uncertainty (BRAND.md voice) and points back to the plans.
 */
export function BillingUnconfirmed({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        <AlertCircle className="h-5 w-5 text-zinc-500 dark:text-zinc-400" strokeWidth={2.5} />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Payment not confirmed
        </h1>
        <p className="mx-auto max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          If you were charged, your plan will activate shortly — try refreshing in a moment.
          Otherwise you can choose a plan again.
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="rounded-full bg-[#007aff] px-6 py-2.5 text-[17px] font-semibold text-white transition-all duration-150 active:scale-[0.99] dark:bg-[#0a84ff]"
      >
        Back to plans
      </button>
    </div>
  );
}
