import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiJson } from '@/lib/api';
import { useSession } from '@/hooks/queries/useSession';
import { useTheme } from '@/hooks/useTheme';

/**
 * Applies the server-stored theme preference app-wide on first paint.
 *
 * Renders nothing. Shares the ['user-profile'] query key with the settings
 * screen, so this adds no extra network request — it just ensures the synced
 * theme is applied no matter which route loads first.
 */
export function ThemeSync() {
  const { setTheme } = useTheme();
  const { data: session } = useSession();

  const { data } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiJson<{ theme?: 'light' | 'dark' }>('/api/v1/user/profile'),
    enabled: !!session?.userId,
    staleTime: 60_000,
  });

  React.useEffect(() => {
    if (data?.theme === 'light' || data?.theme === 'dark') {
      setTheme(data.theme);
    }
  }, [data?.theme, setTheme]);

  return null;
}
