import { useState, useCallback } from 'react';

/**
 * useRateLimit Hook
 * Prevents a function from being called too frequently.
 * @param limitMs - The cooldown period in milliseconds (default 1000ms)
 * @returns [isRateLimited, checkRateLimit]
 */
export function useRateLimit(limitMs: number = 1000) {
    const [lastCall, setLastCall] = useState<number>(0);

    const checkRateLimit = useCallback(() => {
        const now = Date.now();
        if (now - lastCall < limitMs) {
            return false; // Rate limited
        }
        setLastCall(now);
        return true; // Allowed
    }, [lastCall, limitMs]);

    return { checkRateLimit };
}
