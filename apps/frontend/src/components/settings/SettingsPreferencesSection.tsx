import { Activity, EyeOff, Moon } from 'lucide-react';

import { InsetGroup } from '@/components/common/ui/inset-group';
import { SettingsActionRow, SettingsToggleRow } from '@/components/common/ui/settings-row';
import { SETTINGS_SCREEN_LABELS } from './SettingsScreen.config';

export function SettingsPreferencesSection({
  cycleLength,
  periodLength,
  regularity,
  temperatureUnit,
  brandingVisible,
  theme,
  onOpenCycle,
  onThemeChange,
  onDiscreetModeChange,
  onTemperatureUnitChange,
}: {
  cycleLength: number;
  periodLength: number;
  regularity: string;
  temperatureUnit: 'celsius' | 'fahrenheit';
  brandingVisible: boolean;
  theme: 'light' | 'dark';
  onOpenCycle: () => void;
  onThemeChange: (checked: boolean) => void;
  onDiscreetModeChange: (checked: boolean) => void;
  onTemperatureUnitChange: () => void;
}) {
  return (
    <InsetGroup>
      <div className="space-y-0 divide-y divide-border/30">
        <SettingsActionRow
          icon={<Activity className="icon-sm text-white" />}
          iconBgColor="bg-pink-500"
          label="Cycle"
          detail={`${cycleLength}d cycle · ${periodLength}d period · ${regularity}`}
          onClick={onOpenCycle}
        />
        <SettingsToggleRow
          icon={<Moon className="icon-sm text-white" />}
          iconBgColor="bg-slate-600"
          label={SETTINGS_SCREEN_LABELS.appearance.darkMode}
          description={SETTINGS_SCREEN_LABELS.appearance.darkModeHint}
          checked={theme === 'dark'}
          onChange={onThemeChange}
        />
        <SettingsToggleRow
          icon={<EyeOff className="icon-sm text-white" />}
          iconBgColor="bg-indigo-500"
          label={SETTINGS_SCREEN_LABELS.account.discreetMode}
          description={SETTINGS_SCREEN_LABELS.account.discreetModeHint}
          checked={!brandingVisible}
          onChange={onDiscreetModeChange}
        />
        <SettingsActionRow
          icon={<Moon className="icon-sm text-white" />}
          iconBgColor="bg-emerald-500"
          label={SETTINGS_SCREEN_LABELS.appearance.temperatureUnit}
          detail={temperatureUnit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
          onClick={onTemperatureUnitChange}
        />
      </div>
    </InsetGroup>
  );
}
