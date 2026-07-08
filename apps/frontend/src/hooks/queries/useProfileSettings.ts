import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiJson } from '@/lib/api';
import { useSession } from './useSession';

export interface UserProfile {
  cycle_regularity: string | null;
  avg_cycle_length: number;
  period_length: number;
  show_branding: boolean;
  theme: 'light' | 'dark';
  temperature_unit: 'celsius' | 'fahrenheit';
}

export type CycleRegularity = 'regular' | 'irregular' | 'unsure';

/**
 * Shared editable profile settings for the Settings screens.
 *
 * Owns the local mirror state for the cycle/period/regularity/temperature
 * fields plus a single debounced `saveProfile`. The cache write inside
 * saveProfile is optimistic and synchronous, so cross-screen consumers
 * (useTemperatureUnit, useDiscreetMode, ThemeSync) stay consistent the instant
 * a value changes — even if the user navigates away before the debounced PATCH
 * fires. Only the network write is debounced.
 *
 * Both the main Settings screen (temperature) and the Cycle sub-screen (cycle
 * length / period / regularity) call this. Only one of them is mounted at a
 * time, so each instance simply re-populates its mirrors from the shared
 * ['user-profile'] cache on mount.
 */
export function useProfileSettings() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [cycleLength, setCycleLength] = React.useState(28);
  const [periodLength, setPeriodLength] = React.useState(5);
  const [regularity, setRegularity] = React.useState<CycleRegularity>('regular');
  const [temperatureUnit, setTemperatureUnit] = React.useState<'celsius' | 'fahrenheit'>('celsius');
  const [profileSaved, setProfileSaved] = React.useState(false);
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Patches accumulate here between debounced flushes so a second change within
  // the debounce window doesn't clobber an earlier one.
  const pendingPatchRef = React.useRef<Record<string, unknown>>({});

  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiJson<UserProfile>('/api/v1/user/profile'),
    enabled: !!session?.userId,
    // The profile is single-writer — only this client mutates it, always via an
    // optimistic cache write in saveProfile. Never auto-refetch: a background
    // GET on navigation could race a still-debounced PATCH, read the old server
    // value, and revert a just-toggled setting (dark mode / discreet mode).
    staleTime: Infinity,
  });

  // Populate local mirrors from the server profile (once per mount).
  React.useEffect(() => {
    if (profileQuery.data && !profileLoaded) {
      const p = profileQuery.data;
      if (p.avg_cycle_length) setCycleLength(Math.round(p.avg_cycle_length));
      if (p.period_length) setPeriodLength(p.period_length);
      if (p.cycle_regularity) setRegularity(p.cycle_regularity as CycleRegularity);
      if (p.temperature_unit === 'celsius' || p.temperature_unit === 'fahrenheit')
        setTemperatureUnit(p.temperature_unit);
      setProfileLoaded(true);
    }
  }, [profileQuery.data, profileLoaded]);

  // Flushes any accumulated patch to the server. The shared ['user-profile']
  // cache was already updated optimistically in saveProfile, so this is purely
  // the network write — nothing visual depends on it completing.
  const flushProfileSave = React.useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const patch = pendingPatchRef.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatchRef.current = {};
    try {
      await apiJson('/api/v1/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {
      // Silent fail — non-critical save
    }
  }, []);

  const saveProfile = React.useCallback(
    (patch: Record<string, unknown>, options?: { immediate?: boolean }) => {
      // Abort any in-flight profile GET first so a load that started before this
      // change can't resolve later and overwrite our optimistic value.
      void queryClient.cancelQueries({ queryKey: ['user-profile'] });
      // Optimistically reflect the change in the shared cache right away.
      queryClient.setQueryData<UserProfile>(['user-profile'], (old) =>
        old ? { ...old, ...patch } : old
      );
      // Cycle config affects predictions, so refresh insights immediately too.
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 1200);

      // Accumulate so a quick second change doesn't drop the first patch.
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // Single-tap toggles (theme, discreet, temperature) persist immediately so
      // the server converges before the user can navigate; only continuous
      // inputs (cycle/period sliders) debounce.
      if (options?.immediate) {
        void flushProfileSave();
      } else {
        saveTimerRef.current = setTimeout(() => {
          void flushProfileSave();
        }, 800);
      }
    },
    [queryClient, flushProfileSave]
  );

  // Flush any pending save when leaving the screen so navigating away
  // mid-debounce doesn't lose the write.
  React.useEffect(() => {
    return () => {
      void flushProfileSave();
    };
  }, [flushProfileSave]);

  return {
    session,
    cycleLength,
    setCycleLength,
    periodLength,
    setPeriodLength,
    regularity,
    setRegularity,
    temperatureUnit,
    setTemperatureUnit,
    saveProfile,
    profileSaved,
  };
}
