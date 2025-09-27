import { useEffect, useState } from 'react';
import { apiService } from '../services/api.js';

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

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await typedApiService.getDashboardStats();
        const payload = extractData(response, emptyDashboardData);
        if (isMounted) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(toErrorMessage(err));
        setData(emptyDashboardData);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, DASHBOARD_REFRESH_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
};

export const useMembers = () => {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await typedApiService.getMembers();
      setMembers(extractData(response, []));
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return { members, loading, error, refetch: fetchMembers };
};

export const usePayments = (filters: PaymentFilters = {}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await typedApiService.getPayments(filters);
      setPayments(extractData(response, []));
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [JSON.stringify(filters)]);

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
