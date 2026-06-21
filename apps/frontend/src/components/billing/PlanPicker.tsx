import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLANS, type PaidPlan } from './plans';
import { usePlanCheckout } from './usePlanCheckout';

function PlanOption({
  plan,
  selected,
  onSelect,
}: {
  plan: PaidPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  const info = PLANS[plan];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-colors duration-150',
        selected
          ? 'border-[#007aff] bg-[#007aff]/[0.05] dark:border-[#0a84ff] dark:bg-[#0a84ff]/[0.1]'
          : 'border-border/40 bg-card hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
      )}
    >
      {/* Radio */}
      <span
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected
            ? 'border-[#007aff] bg-[#007aff] dark:border-[#0a84ff] dark:bg-[#0a84ff]'
            : 'border-zinc-300 dark:border-zinc-600'
        )}
      >
        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
          {info.name}
        </div>
        <div className="text-[12px] text-muted-foreground">{info.note}</div>
      </div>

      <div className="text-right">
        <div className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {info.price}
        </div>
        <div className="text-[11px] text-muted-foreground">{info.cadence}</div>
      </div>
    </button>
  );
}

/**
 * Two selectable plans + a single primary "Subscribe" action. Used in the
 * Settings subscription card and the full-screen paywall. Ink + grey + the one
 * iOS blue accent — no decorative color (per BRAND.md).
 */
export function PlanPicker({ defaultPlan = 'yearly' }: { defaultPlan?: PaidPlan }) {
  const [selected, setSelected] = React.useState<PaidPlan>(defaultPlan);
  const { checkoutBusy, startCheckout } = usePlanCheckout();

  return (
    <div className="space-y-2.5">
      <PlanOption
        plan="yearly"
        selected={selected === 'yearly'}
        onSelect={() => setSelected('yearly')}
      />
      <PlanOption
        plan="lifetime"
        selected={selected === 'lifetime'}
        onSelect={() => setSelected('lifetime')}
      />
      <button
        type="button"
        disabled={!!checkoutBusy}
        onClick={() => startCheckout(selected)}
        className="mt-1.5 w-full rounded-full bg-[#007aff] py-3 text-[15px] font-semibold text-white transition-all duration-150 active:scale-[0.99] disabled:opacity-60 dark:bg-[#0a84ff]"
      >
        {checkoutBusy ? 'Redirecting…' : 'Subscribe'}
      </button>
    </div>
  );
}
