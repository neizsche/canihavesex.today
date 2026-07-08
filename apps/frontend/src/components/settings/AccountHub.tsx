import * as React from 'react';
import { Check, ChevronRight, Share, Plus } from 'lucide-react';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { Spinner } from '@/components/common/ui/spinner';
import { SettingsActionRow, SettingsExpandableRow } from '@/components/common/ui/settings-row';
import { useBillingStatus } from '@/hooks/queries/useBillingStatus';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { PlanPicker } from '@/components/billing/PlanPicker';
import { usePlanCheckout } from '@/components/billing/usePlanCheckout';
import { ActionSheet } from '@/components/common/ui/action-sheet';
import { PLANS } from '@/components/billing/plans';
import { CONTACT_EMAIL } from '@/lib/siteConfig';
import { SECTION_CAPTION } from '@/lib/typography';
import { SETTINGS_SCREEN_LABELS } from './SettingsScreen.config';

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
 * Account hub in Settings: signed-in email, install-app affordance, and
 * Help & Feedback — always shown. The Subscription row is added only when
 * billing is enabled (cloud, BILLING_ENABLED), so self-hosted installs still
 * get account, install, and help. Mirrors the rest of the settings list.
 */
export function AccountHub({
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
  const { canPrompt, isInstalled, isIOS, isAndroid, promptInstall } = useInstallPrompt();
  const [open, setOpen] = React.useState(false);
  const [cancelSheetOpen, setCancelSheetOpen] = React.useState(false);
  const [installOpen, setInstallOpen] = React.useState(false);

  const billingEnabled = !!billing?.billingEnabled && !isLoading;

  const autoOpened = React.useRef(false);
  React.useEffect(() => {
    if (!billing || !billing.billingEnabled || autoOpened.current) return;
    autoOpened.current = true;
    if (billing.state !== 'active' && billing.state !== 'demo') setOpen(true);
  }, [billing]);

  // Signed-out users have nothing here. Otherwise this always renders as the account
  // hub (username + install + help); subscription rows are added only when billing is
  // enabled (cloud), so self-hosted installs still get account, install, and help.
  if (!session?.userId) return null;

  const state = billing?.state;
  const plan = billing?.plan ?? null;
  const trialEndsAt = billing?.trialEndsAt ?? null;
  const currentPeriodEnd = billing?.currentPeriodEnd ?? null;
  const cancelAtPeriodEnd = billing?.cancelAtPeriodEnd ?? false;
  const isDemo = state === 'demo';
  const isActivePaid = state === 'active';

  // Install shows when it can do something (native prompt or mobile manual steps).
  // The public demo always surfaces it as a nudge to install the app.
  const showInstall = !isInstalled && (canPrompt || isIOS || isAndroid || isDemo);
  const manualSteps = isIOS
    ? SETTINGS_SCREEN_LABELS.install.iosSteps
    : SETTINGS_SCREEN_LABELS.install.androidSteps;
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
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-[17px] font-normal text-zinc-900 dark:text-zinc-100">Account</div>
            <div className="text-[15px] text-zinc-500 dark:text-zinc-400 truncate pl-4">
              {email}
            </div>
          </div>
        )}
        {showInstall && (
          <>
            {email && <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50 mx-4" />}
            {canPrompt ? (
              <SettingsActionRow
                label={SETTINGS_SCREEN_LABELS.install.title}
                detail={SETTINGS_SCREEN_LABELS.install.prompt}
                onClick={() => void promptInstall()}
                rightElement={
                  <div className="flex-shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity active:opacity-80">
                    Get
                  </div>
                }
              />
            ) : (
              <SettingsExpandableRow
                title={SETTINGS_SCREEN_LABELS.install.title}
                description={SETTINGS_SCREEN_LABELS.install.prompt}
                open={installOpen}
                onToggle={() => setInstallOpen((prev) => !prev)}
                rightElement={
                  <div className="flex-shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity active:opacity-80">
                    {installOpen ? 'Close' : 'Get'}
                  </div>
                }
              >
                <ol className="space-y-2.5">
                  {manualSteps.map((step, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[12px] font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                        {i + 1}
                      </span>
                      <span className="flex items-center gap-1.5 text-[13px] text-zinc-600 dark:text-zinc-300">
                        {step}
                        {isIOS && i === 0 && (
                          <Share className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        )}
                        {isIOS && i === 1 && (
                          <Plus className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </SettingsExpandableRow>
            )}
          </>
        )}

        {billingEnabled && (
          <>
            {(email || showInstall) && (
              <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50 mx-4" />
            )}
            <SettingsExpandableRow
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
                <div className="space-y-4">
                  {cancelAtPeriodEnd && (
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      Your plan cancels on {formatDate(currentPeriodEnd)}. You keep full access
                      until then.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <div className={`${SECTION_CAPTION} px-1`}>
                      Options
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                      {/* Yearly Row (Active) */}
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {PLANS.yearly.name}
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                              Active
                            </span>
                          </div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">
                            {cancelAtPeriodEnd
                              ? `Expires ${formatDate(currentPeriodEnd)}`
                              : currentPeriodEnd
                                ? `Renews ${formatDate(currentPeriodEnd)}`
                                : 'Active subscription'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                              {PLANS.yearly.price}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {PLANS.yearly.cadence}
                            </div>
                          </div>
                          <Check
                            className="h-4 w-4 text-accent"
                            strokeWidth={3}
                          />
                        </div>
                      </div>

                      {/* Lifetime Row (Upgrade Option) */}
                      <button
                        type="button"
                        disabled={checkoutBusy !== null}
                        onClick={() => startCheckout('lifetime')}
                        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors duration-150 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 active:bg-zinc-200/50 dark:active:bg-zinc-700/30 disabled:opacity-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                            {PLANS.lifetime.name}
                          </div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">
                            Pay once. Never renews.
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                              {PLANS.lifetime.price}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {PLANS.lifetime.cadence}
                            </div>
                          </div>
                          {checkoutBusy === 'lifetime' ? (
                            <Spinner size={16} />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                          )}
                        </div>
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
                    className="font-medium text-accent transition-opacity active:opacity-70"
                  >
                    Contact us
                  </a>
                </p>
              )}
            </SettingsExpandableRow>
          </>
        )}

        {onHelp && (
          <>
            {(email || billingEnabled || showInstall) && (
              <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50 mx-4" />
            )}
            <SettingsActionRow label="Help & feedback" onClick={onHelp} />
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
