import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { useSession } from './useSession';

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

    return {
        /** true = show brand, false = hide brand (discreet mode ON) */
        showBranding: data ?? true,
    };
}
