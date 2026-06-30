import { LogOut, Trash2 } from 'lucide-react';

import { InsetGroup } from '@/components/common/ui/inset-group';
import { SettingsActionRow } from '@/components/common/ui/settings-row';
import { SETTINGS_SCREEN_LABELS } from './SettingsScreen.config';

export function SettingsAccountActions({
  email,
  busy,
  isDemo,
  onSignOut,
  onDeleteAllData,
  onDeleteAccount,
  onSignIn,
}: {
  email?: string | null;
  busy: boolean;
  isDemo: boolean;
  onSignOut: () => void;
  onDeleteAllData: () => void;
  onDeleteAccount: () => void;
  onSignIn: () => void;
}) {
  return (
    <InsetGroup>
      <div className="space-y-0 divide-y divide-border/30">
        {email ? (
          <>
            <SettingsActionRow
              icon={<LogOut className="icon-sm text-white" />}
              iconBgColor="bg-zinc-500"
              label={SETTINGS_SCREEN_LABELS.account.signOut}
              onClick={onSignOut}
              disabled={busy}
            />
            <SettingsActionRow
              icon={<Trash2 className="icon-sm text-white" />}
              iconBgColor="bg-amber-500"
              label={SETTINGS_SCREEN_LABELS.account.deleteAllData}
              onClick={onDeleteAllData}
              disabled={busy}
              locked={isDemo}
            />
            <SettingsActionRow
              icon={<Trash2 className="icon-sm text-white" />}
              iconBgColor="bg-red-600"
              label={SETTINGS_SCREEN_LABELS.account.deleteAccount}
              onClick={onDeleteAccount}
              disabled={busy}
              destructive
              locked={isDemo}
            />
          </>
        ) : (
          <SettingsActionRow
            icon={<LogOut className="icon-sm text-white" style={{ transform: 'scaleX(-1)' }} />}
            iconBgColor="bg-[#007aff]"
            label={SETTINGS_SCREEN_LABELS.account.signIn}
            onClick={onSignIn}
          />
        )}
      </div>
    </InsetGroup>
  );
}
