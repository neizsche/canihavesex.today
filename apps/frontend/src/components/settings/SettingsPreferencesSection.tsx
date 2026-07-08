import { Activity, EyeOff, Moon, Thermometer } from 'lucide-react';

import { InsetGroup } from '@/components/common/ui/inset-group';
import {
  SettingsActionRow,
  SettingsToggleRow,
  SETTINGS_DIVIDER,
} from '@/components/common/ui/settings-row';
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
      <SettingsActionRow
        icon={<Activity className="icon-sm text-white" />}
        iconBgColor="bg-[#FF3B30] dark:bg-[#FF453A]"
        label="Cycle"
        detail={`${cycleLength}d cycle · ${periodLength}d period · ${regularity}`}
        onClick={onOpenCycle}
      />
      <div className={SETTINGS_DIVIDER} />
      <SettingsToggleRow
        icon={<Moon className="icon-sm text-white" />}
        iconBgColor="bg-[#5856D6] dark:bg-[#5E5CE6]"
        label={SETTINGS_SCREEN_LABELS.appearance.darkMode}
        description={SETTINGS_SCREEN_LABELS.appearance.darkModeHint}
        checked={theme === 'dark'}
        onChange={onThemeChange}
      />
      <div className={SETTINGS_DIVIDER} />
      <SettingsToggleRow
        icon={<EyeOff className="icon-sm text-white" />}
        iconBgColor="bg-zinc-500"
        label={SETTINGS_SCREEN_LABELS.account.discreetMode}
        description={SETTINGS_SCREEN_LABELS.account.discreetModeHint}
        checked={!brandingVisible}
        onChange={onDiscreetModeChange}
      />
      <div className={SETTINGS_DIVIDER} />
      <SettingsActionRow
        icon={<Thermometer className="icon-sm text-white" />}
        iconBgColor="bg-[#FF9500] dark:bg-[#FF9F0A]"
        label={SETTINGS_SCREEN_LABELS.appearance.temperatureUnit}
        detail={temperatureUnit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
        onClick={onTemperatureUnitChange}
      />
    </InsetGroup>
  );
}
