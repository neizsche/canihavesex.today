import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { useSession } from './useSession';

const STORAGE_KEY = 'show_branding';

/**
 * Last-known preference, read synchronously so the very first render matches
 * the user's real setting. Without this the header would briefly show branding
 * (the default) and then collapse once the profile query resolves — a layout
 * jump on pages like Settings. Defaults to `true` (show branding).
 */
function readCached(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) !== 'false';
}

/**
 * Hook to check if the user has enabled discreet mode (hidden branding).
 * Returns `showBranding: true` by default (for unauthenticated users or before data loads).
 * Components should hide NSFW brand text when `showBranding === false`.
 */
export function useDiscreetMode() {
  const { data: session } = useSession();

  const { data } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiJson<{ show_branding: boolean }>('/api/v1/user/profile'),
    enabled: !!session?.userId,
    staleTime: 5 * 60 * 1000,
    select: (profile) => profile.show_branding,
  });

  // Persist the resolved value so subsequent loads render correctly on frame one.
  React.useEffect(() => {
    if (typeof data === 'boolean') {
      try {
        localStorage.setItem(STORAGE_KEY, String(data));
      } catch {
        // ignore — non-critical persistence
      }
    }
  }, [data]);

  return {
    /** true = show brand, false = hide brand (discreet mode ON) */
    showBranding: data ?? readCached(),
  };
}
