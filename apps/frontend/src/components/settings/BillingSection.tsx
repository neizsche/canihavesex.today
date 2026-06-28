import * as React from 'react';
import { CreditCard, HelpCircle, Infinity as InfinityIcon } from 'lucide-react';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { SettingsActionRow, SettingsExpandableRow } from '@/components/common/ui/settings-row';
import { useBillingStatus } from '@/hooks/queries/useBillingStatus';
import { PlanPicker } from '@/components/billing/PlanPicker';
import { usePlanCheckout } from '@/components/billing/usePlanCheckout';
import { ActionSheet } from '@/components/common/ui/action-sheet';
import { PLANS } from '@/components/billing/plans';
import { CONTACT_EMAIL } from '@/lib/siteConfig';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/**
 * Subscription card in Settings (cloud only, BILLING_ENABLED). A single
 * collapsible row that mirrors the rest of the settings list.
 */
export function BillingSection({
  session,
  email,
  onHelp,
}: {
  session?: { userId?: string } | null;
  email?: string | null;
  onHelp?: () => void;
}) {
  const { data: billing, isLoading } = useBillingStatus();
  const { checkoutBusy, cancelBusy, startCheckout, cancelSubscription } = usePlanCheckout();
  const [open, setOpen] = React.useState(false);
  const [cancelSheetOpen, setCancelSheetOpen] = React.useState(false);

  const autoOpened = React.useRef(false);
  React.useEffect(() => {
    if (!billing || autoOpened.current) return;
    autoOpened.current = true;
    if (billing.state !== 'active' && billing.state !== 'demo') setOpen(true);
  }, [billing]);

  if (!session?.userId || isLoading || !billing?.billingEnabled) return null;

  const { state, plan, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd } = billing;
  const isDemo = state === 'demo';
  const isActivePaid = state === 'active';
  const isYearly = isActivePaid && plan === 'yearly';
  const isLifetime = (isActivePaid && plan === 'lifetime') || isDemo;

  const summary = (() => {
    if (isLifetime) return 'Lifetime · yours forever';
    if (isYearly) {
      if (cancelAtPeriodEnd) {
        return currentPeriodEnd
          ? `Cancels ${formatDate(currentPeriodEnd)}`
          : 'Cancels at period end';
      }
      return currentPeriodEnd ? `Yearly · renews ${formatDate(currentPeriodEnd)}` : 'Yearly';
    }
    if (state === 'trialing') {
      const left = daysUntil(trialEndsAt);
      return left !== null ? `Free trial · ${left} day${left === 1 ? '' : 's'} left` : 'Free trial';
    }
    if (state === 'expired') return 'Trial ended';
    return 'No active plan';
  })();

  return (
    <>
      <InsetGroup>
        {email && (
          <>
            <div className="px-4 py-3.5 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                Signed in as
              </div>
              <div className="mt-1 text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {email}
              </div>
            </div>
            <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50 mx-4" />
          </>
        )}
        <SettingsExpandableRow
          icon={<CreditCard className="icon-sm text-white" />}
          iconBgColor="bg-[#007aff]"
          title="Subscription"
          description={summary}
          open={open}
          onToggle={() => setOpen((prev) => !prev)}
        >
          {!isActivePaid && !isDemo && (
            <>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {state === 'trialing' && trialEndsAt
                  ? `Your free trial runs through ${formatDate(trialEndsAt)}. Subscribe anytime to keep going.`
                  : state === 'expired'
                    ? 'Your trial has ended. Choose a plan to keep logging.'
                    : 'Choose a plan to continue.'}
              </p>
              <PlanPicker defaultPlan={plan ?? 'yearly'} />
            </>
          )}

          {isYearly && (
            <div className="space-y-3">
              {cancelAtPeriodEnd && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Your plan cancels on {formatDate(currentPeriodEnd)}. You keep full access until
                  then.
                </p>
              )}

              <div className="overflow-hidden rounded-2xl border border-[#007aff]/25 bg-gradient-to-b from-[#007aff]/[0.06] to-[#007aff]/[0.02] dark:border-[#0a84ff]/25 dark:from-[#0a84ff]/[0.12] dark:to-[#0a84ff]/[0.04]">
                <div className="flex items-center gap-3 px-4 pt-4">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#007aff]/10 dark:bg-[#0a84ff]/20">
                    <InfinityIcon
                      className="h-[18px] w-[18px] text-[#007aff] dark:text-[#0a84ff]"
                      strokeWidth={2.25}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                      {PLANS.lifetime.name}
                    </div>
                    <div className="text-[12px] text-muted-foreground">Pay once. Never renews.</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {PLANS.lifetime.price}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {PLANS.lifetime.cadence}
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-3">
                  <button
                    type="button"
                    disabled={checkoutBusy !== null}
                    onClick={() => startCheckout('lifetime')}
                    className="w-full rounded-full bg-[#007aff] py-3 text-[15px] font-semibold text-white transition-all duration-150 active:scale-[0.99] disabled:opacity-60 dark:bg-[#0a84ff]"
                  >
                    {checkoutBusy === 'lifetime' ? 'Redirecting…' : 'Upgrade to Lifetime'}
                  </button>
                </div>
              </div>

              {!cancelAtPeriodEnd && (
                <button
                  type="button"
                  disabled={cancelBusy}
                  onClick={() => setCancelSheetOpen(true)}
                  className="w-full rounded-full border border-border/40 bg-zinc-50/60 py-2.5 text-[13px] font-medium text-zinc-600 transition-opacity active:opacity-70 disabled:opacity-50 dark:bg-zinc-900/40 dark:text-zinc-300"
                >
                  {cancelBusy ? 'Canceling…' : 'Cancel subscription'}
                </button>
              )}
            </div>
          )}

          {isLifetime && (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              You have lifetime access — there's nothing to manage. Thank you for the support.
            </p>
          )}

          {isActivePaid && (
            <p className="pt-1 text-center text-[12px] text-muted-foreground">
              Billing question?{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-[#007aff] transition-opacity active:opacity-70 dark:text-[#0a84ff]"
              >
                Contact us
              </a>
            </p>
          )}
        </SettingsExpandableRow>

        {onHelp && (
          <>
            <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50 mx-4" />
            <SettingsActionRow
              icon={<HelpCircle className="icon-sm text-white" />}
              iconBgColor="bg-blue-500"
              label="Help & Feedback"
              onClick={onHelp}
            />
          </>
        )}
      </InsetGroup>

      <ActionSheet
        isOpen={cancelSheetOpen}
        onClose={() => setCancelSheetOpen(false)}
        title="Cancel subscription?"
        description="You keep full access until the end of your current billing period. No further charges."
        actions={[
          {
            label: 'Cancel subscription',
            isDestructive: true,
            onClick: () => void cancelSubscription(),
          },
        ]}
      />
    </>
  );
}
