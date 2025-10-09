/**
 * useActiveMemberCount Hook
 *
 * Professional centralized hook for real-time active member count
 * Auto-refreshes every 10 seconds to keep count synchronized across all admin pages
 *
 * Usage:
 * const { count, loading, error, refresh } = useActiveMemberCount();
 *
 * Features:
 * - Auto-refresh every 10 seconds
 * - Manual refresh capability
 * - Error handling
 * - Loading states
 * - Automatic cleanup on unmount
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const REFRESH_INTERVAL = 10000; // 10 seconds

interface UseMemberCountReturn {
    count: number;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    lastUpdated: Date | null;
}

export const useActiveMemberCount = (): UseMemberCountReturn => {
    const [count, setCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
            setCount(newCount);
            setError(null);
            setLastUpdated(new Date());

            console.log(`[useActiveMemberCount] Updated: ${newCount} active members`);
        } catch (err: any) {
            console.error('[useActiveMemberCount] Error fetching count:', err);
            setError(err.message || 'Failed to fetch member count');
            setCount(0);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount
    useEffect(() => {
        fetchMemberCount();
    }, [fetchMemberCount]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchMemberCount();
        }, REFRESH_INTERVAL);

        // Cleanup interval on unmount
        return () => {
            clearInterval(interval);
            console.log('[useActiveMemberCount] Cleanup: Stopped auto-refresh');
        };
    }, [fetchMemberCount]);

    return {
        count,
        loading,
        error,
        refresh: fetchMemberCount,
        lastUpdated
    };
};

export default useActiveMemberCount;
