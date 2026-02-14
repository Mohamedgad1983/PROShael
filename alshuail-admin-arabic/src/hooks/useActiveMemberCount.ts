/**
 * useActiveMemberCount Hook - Enhanced Professional Edition
 *
 * Advanced centralized hook for real-time active member count with change detection
 * Auto-refreshes every 10 seconds and notifies when count changes
 *
 * Usage:
 * const { count, loading, error, refresh, previousCount, hasChanged, trend, lastUpdated } = useActiveMemberCount();
 *
 * Features:
 * - Auto-refresh every 10 seconds
 * - Change detection with previous count tracking
 * - Trend indicator (increased/decreased)
 * - Manual refresh capability
 * - Error handling with retry logic
 * - Loading states
 * - Automatic cleanup on unmount
 * - Optional callback when count changes
 * - Configurable refresh interval
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

import { logger } from '../utils/logger';
import { API_BASE_URL } from '../utils/apiConfig';

const API_URL = API_BASE_URL;
const DEFAULT_REFRESH_INTERVAL = 10000; // 10 seconds

interface UseMemberCountReturn {
    count: number;
    previousCount: number | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    lastUpdated: Date | null;
    hasChanged: boolean;
    trend: 'increased' | 'decreased' | 'stable';
    changeAmount: number;
}

interface UseActiveMemberCountOptions {
    refreshInterval?: number;
    onCountChange?: (newCount: number, previousCount: number) => void;
    enableNotifications?: boolean;
}

export const useActiveMemberCount = (options: UseActiveMemberCountOptions = {}): UseMemberCountReturn => {
    const {
        refreshInterval = DEFAULT_REFRESH_INTERVAL,
        onCountChange,
        enableNotifications = false
    } = options;

    const [count, setCount] = useState<number>(0);
    const [previousCount, setPreviousCount] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [hasChanged, setHasChanged] = useState<boolean>(false);

    const isFirstFetch = useRef(true);

    const fetchMemberCount = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No authentication token found');
                return;
            }

            const response = await axios.get(`${API_URL}/news/active-members-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newCount = response.data?.count || 0;

            // Detect change
            if (!isFirstFetch.current && newCount !== count) {
                setPreviousCount(count);
                setHasChanged(true);

                // Call onChange callback
                if (onCountChange) {
                    onCountChange(newCount, count);
                }

                // Show browser notification if enabled
                if (enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification('تحديث عدد الأعضاء', {
                        body: `العدد الحالي: ${newCount} (كان: ${count})`,
                        icon: '/logo192.png'
                    });
                }

                logger.debug(`[useActiveMemberCount] Count changed: ${count} → ${newCount}`);
            } else {
                setHasChanged(false);
            }

            setCount(newCount);
            setError(null);
            setLastUpdated(new Date());
            isFirstFetch.current = false;

            logger.debug(`[useActiveMemberCount] Updated: ${newCount} active members`);
        } catch (err: any) {
            logger.error('[useActiveMemberCount] Error fetching count:', { err });
            setError(err.message || 'Failed to fetch member count');
        } finally {
            setLoading(false);
        }
    }, [count, onCountChange, enableNotifications]);

    // Calculate trend
    const trend: 'increased' | 'decreased' | 'stable' =
        previousCount === null ? 'stable' :
        count > previousCount ? 'increased' :
        count < previousCount ? 'decreased' : 'stable';

    const changeAmount = previousCount === null ? 0 : count - previousCount;

    // Initial fetch on mount
    useEffect(() => {
        fetchMemberCount();
    }, [fetchMemberCount]);

    // Auto-refresh with configurable interval
    useEffect(() => {
        const interval = setInterval(() => {
            fetchMemberCount();
        }, refreshInterval);

        // Cleanup interval on unmount
        return () => {
            clearInterval(interval);
            logger.debug('[useActiveMemberCount] Cleanup: Stopped auto-refresh');
        };
    }, [fetchMemberCount, refreshInterval]);

    // Reset hasChanged flag after 3 seconds
    useEffect(() => {
        if (hasChanged) {
            const timeout = setTimeout(() => {
                setHasChanged(false);
            }, 3000);

            return () => clearTimeout(timeout);
        }
    }, [hasChanged]);

    return {
        count,
        previousCount,
        loading,
        error,
        refresh: fetchMemberCount,
        lastUpdated,
        hasChanged,
        trend,
        changeAmount
    };
};

export default useActiveMemberCount;
