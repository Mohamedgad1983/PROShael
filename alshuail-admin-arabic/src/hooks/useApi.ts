import { useCallback,useEffect,useMemo,useState } from 'react';
import { apiService } from '../services/api.js';

import { logger } from '../utils/logger';

export type NullableNumber = number | null | undefined;

export interface DashboardMemberStats {
  total?: NullableNumber;
  active?: NullableNumber;
  inactive?: NullableNumber;
  newThisMonth?: NullableNumber;
}

export interface DashboardPaymentStats {
  pending?: NullableNumber;
  pendingAmount?: NullableNumber;
  monthlyRevenue?: NullableNumber;
  totalRevenue?: NullableNumber;
  totalPaid?: NullableNumber;
}

export interface DashboardSubscriptionStats {
  active?: NullableNumber;
  expired?: NullableNumber;
  total?: NullableNumber;
  revenue?: NullableNumber;
}

export interface DashboardActivity {
  id?: string | number;
  type?: string;
  description?: string;
  date?: string;
  amount?: NullableNumber;
}

export interface DashboardData {
  members?: DashboardMemberStats;
  payments?: DashboardPaymentStats;
  subscriptions?: DashboardSubscriptionStats;
  activities?: DashboardActivity[];
  [key: string]: unknown;
}

export interface DashboardDataHook {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

export type MemberRecord = Record<string, unknown>;
export type PaymentRecord = Record<string, unknown>;
export type SubscriptionRecord = Record<string, unknown>;
export type PaymentFilters = Record<string, string | number | boolean | undefined>;

const DASHBOARD_REFRESH_INTERVAL = 300000; // 5 minutes instead of 30 seconds for stability
const MAX_ERROR_RETRIES = 3;
const ERROR_RETRY_DELAY = 2000; // 2 seconds

const emptyDashboardData: DashboardData = {
  members: { total: 0, active: 0, inactive: 0, newThisMonth: 0 },
  payments: { pending: 0, pendingAmount: 0, monthlyRevenue: 0, totalRevenue: 0, totalPaid: 0 },
  subscriptions: { active: 0, expired: 0, total: 0, revenue: 0 },
  activities: []
};

interface DashboardApiService {
  getDashboardStats: () => Promise<{ data?: DashboardData } | null>;
  getMembers: () => Promise<{ data?: MemberRecord[] } | null>;
  getPayments: (filters?: PaymentFilters) => Promise<{ data?: PaymentRecord[] } | null>;
  getSubscriptions: () => Promise<{ data?: SubscriptionRecord[] } | null>;
}

const typedApiService = apiService as unknown as DashboardApiService;

const extractData = <T>(response: { data?: T } | null | undefined, fallback: T): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response.data ?? fallback) as T;
  }
  return fallback;
};

const toErrorMessage = (err: unknown, fallback = 'Unknown error'): string => {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return fallback;
};

export const useDashboardData = (): DashboardDataHook => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;

    const fetchData = async (isRetry = false) => {
      try {
        if (!isRetry) {
          setLoading(true);
        }

        logger.debug('📊 Fetching dashboard data...');
        const response = await typedApiService.getDashboardStats();
        const payload = extractData(response, emptyDashboardData);

        if (isMounted) {
          setData(payload);
          setError(null);
          setRetryCount(0); // Reset retry count on success
          logger.debug('✅ Dashboard data loaded successfully');
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        const errorMessage = toErrorMessage(err);
        logger.error('❌ Dashboard data fetch failed:', { errorMessage });

        // Only show error and use empty data if we've exhausted retries
        if (retryCount >= MAX_ERROR_RETRIES) {
          setError(`فشل في تحميل البيانات: ${errorMessage}`);
          setData(emptyDashboardData);
        } else {
          // Don't set error state during retry attempts
          setRetryCount(prev => prev + 1);

          // Schedule retry
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              logger.debug(`🔄 Retrying dashboard fetch (attempt ${retryCount + 1}/${MAX_ERROR_RETRIES});...`);
              fetchData(true);
            }
          }, ERROR_RETRY_DELAY * (retryCount + 1));
          return;
        }
      } finally {
        if (isMounted && !isRetry) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(() => fetchData(), DASHBOARD_REFRESH_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryCount]); // Add retryCount as dependency

  return { data, loading, error };
};

export const useMembers = () => {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      logger.debug('👥 Fetching members data...');
      const response = await typedApiService.getMembers();
      const membersData = extractData(response, []);

      setMembers(membersData);
      setError(null);
      logger.debug(`✅ Loaded ${membersData.length} members successfully`);
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      logger.error('❌ Members fetch failed:', { errorMessage });
      setError(`فشل في تحميل بيانات الأعضاء: ${errorMessage}`);
      // Don't clear members data on error, keep existing data
      setMembers((prev) => (prev.length === 0 ? [] : prev));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: () => fetchMembers(false) };
};

export const usePayments = (filters: PaymentFilters = {}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersKey = JSON.stringify(filters);
  const stableFilters = useMemo<PaymentFilters>(() => JSON.parse(filtersKey), [filtersKey]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await typedApiService.getPayments(stableFilters);
      setPayments(extractData(response, []));
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [stableFilters]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return { payments, loading, error, refetch: fetchPayments };
};

export const useSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await typedApiService.getSubscriptions();
      setSubscriptions(extractData(response, []));
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return { subscriptions, loading, error, refetch: fetchSubscriptions };
};
