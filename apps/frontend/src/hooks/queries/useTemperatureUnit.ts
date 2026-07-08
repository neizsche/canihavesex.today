import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { useSession } from './useSession';
import type { TemperatureUnit } from '@/components/log/temperatureUnits';

const STORAGE_KEY = 'temperature_unit';

/**
 * Last-known unit, read synchronously so the BBT field renders in the user's
 * real unit on frame one. Without this the input would briefly show °C (the
 * default) and then flip to °F once the profile query resolves. Defaults to
 * 'celsius'.
 */
function readCached(): TemperatureUnit {
  if (typeof localStorage === 'undefined') return 'celsius';
  return localStorage.getItem(STORAGE_KEY) === 'fahrenheit' ? 'fahrenheit' : 'celsius';
}

/**
 * The user's basal-body-temperature display/input unit. Canonical storage is
 * always Celsius — this only controls how the value is shown and entered.
 * Returns 'celsius' for unauthenticated users or before data loads.
 */
export function useTemperatureUnit(): TemperatureUnit {
  const { data: session } = useSession();

  const { data } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiJson<{ temperature_unit: TemperatureUnit }>('/api/v1/user/profile'),
    enabled: !!session?.userId,
    // Single-writer profile: never auto-refetch. A background GET on navigation
    // could race a just-saved change and revert the unit. See useProfileSettings.
    staleTime: Infinity,
    select: (profile) => profile.temperature_unit,
  });

  // Persist the resolved value so subsequent loads render correctly on frame one.
  React.useEffect(() => {
    if (data === 'celsius' || data === 'fahrenheit') {
      try {
        localStorage.setItem(STORAGE_KEY, data);
      } catch {
        // ignore — non-critical persistence
      }
    }
  }, [data]);

  return data ?? readCached();
}
