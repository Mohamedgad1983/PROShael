import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export const useDashboardData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getDashboardStats();
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
        // Fallback to empty data structure
        setData({
          members: { total: 0, active: 0, inactive: 0, newThisMonth: 0 },
          payments: { pending: 0, pendingAmount: 0, monthlyRevenue: 0, totalRevenue: 0 },
          subscriptions: { active: 0, expired: 0, total: 0, revenue: 0 },
          activities: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
};

export const useMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMembers();
      setMembers(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
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

export const usePayments = (filters = {}) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPayments(filters);
      setPayments(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
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
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSubscriptions();
      setSubscriptions(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
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