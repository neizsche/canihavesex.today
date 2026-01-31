import { useMemo } from 'react';

/**
 * Check if premium features are enabled via environment variable
 * Defaults to true if not set
 */
export function isPremiumEnabled(): boolean {
    // Check for Astro's PUBLIC_ prefixed env variable
    // Renamed from PUBLIC_ENABLE_PREMIUM to PUBLIC_IS_NOT_OPENCORE
    const envValue = import.meta.env.PUBLIC_IS_NOT_OPENCORE;

    // Default to true (premium-ready build) if not explicitly set to false
    if (envValue === undefined || envValue === null || envValue === '') {
        return true;
    }

    // Handle string values from env
    return envValue !== 'false' && envValue !== '0' && envValue !== false;
}

/**
 * React hook to access premium feature flag
 * Use this in components to conditionally render premium features
 */
export function usePremiumFeatures() {
    const premiumEnabled = useMemo(() => isPremiumEnabled(), []);

    return {
        premiumEnabled,
        isPremium: premiumEnabled, // Alias for convenience
    };
}

/**
 * Check if the user has active premium subscription (simulated via env)
 */
export function isPremiumStatusEnabled(): boolean {
    const envValue = import.meta.env.PUBLIC_IS_PREMIUM;
    // Default to false for this one (Freemium model defaults to free)
    if (envValue === undefined || envValue === null || envValue === '') {
        return false;
    }
    return envValue !== 'false' && envValue !== '0' && envValue !== false;
}

/**
 * React hook to access user subscription status
 */
export function usePremiumStatus() {
    const isPremium = useMemo(() => isPremiumStatusEnabled(), []);
    return { isPremium };
}
