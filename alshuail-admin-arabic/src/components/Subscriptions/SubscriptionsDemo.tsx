/**
 * Subscriptions Management System Demo
 *
 * This file demonstrates all the features and capabilities of the
 * Subscriptions Management System for the Al-Shuail Family Admin Dashboard.
 *
 * Features Included:
 * - Beautiful glassmorphism design with Arabic RTL support
 * - Subscription plans management
 * - Member subscription tracking
 * - Payment monitoring and timeline
 * - Interactive modals and forms
 * - Responsive design for all devices
 * - Loading states and animations
 * - Empty states with clear CTAs
 */

import React from 'react';
import Subscriptions from './Subscriptions';

// Example data structure for subscription plans
export const exampleSubscriptionPlan = {
  id: '1',
  name: 'Premium Plan',
  nameAr: 'الخطة المميزة',
  price: 250,
  duration: 'monthly' as const,
  features: [
    'جميع مميزات الخطة الأساسية',
    'أولوية في الأنشطة الخاصة',
    'دعم مخصص على مدار الساعة',
    'خصومات على المناسبات'
  ],
  isPopular: true,
  color: '#8B5CF6'
};

// Example data structure for member subscription
export const exampleSubscription = {
  id: '1',
  memberId: 'M001',
  memberName: 'أحمد الشعيل',
  planId: '2',
  status: 'active' as const,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  amount: 250,
  lastPayment: new Date('2024-11-01'),
  nextPayment: new Date('2024-12-01')
};

// Status types and their visual representations
export const subscriptionStatuses = {
  active: {
    label: 'نشط',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  pending: {
    label: 'قيد الانتظار',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  overdue: {
    label: 'متأخر',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  cancelled: {
    label: 'ملغي',
    color: '#9CA3AF',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    borderColor: 'rgba(156, 163, 175, 0.3)'
  }
};

// Component usage examples
export const SubscriptionsDemo: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      direction: 'rtl'
    }}>
      {/* Full Subscriptions Component */}
      <Subscriptions />

      {/*
        The Subscriptions component includes:

        1. Tab Navigation:
           - Overview: Dashboard with statistics and recent activity
           - Plans: Manage subscription plans with pricing
           - Members: Track member subscriptions and status
           - Payments: Monitor payment timeline and history

        2. Interactive Features:
           - Search and filter functionality
           - Add/Edit subscription plans
           - Status badges with real-time updates
           - Responsive modal dialogs

        3. Visual Elements:
           - Glassmorphism cards with blur effects
           - Gradient backgrounds and buttons
           - Smooth animations and transitions
           - Loading skeletons for async data

        4. Mobile Optimization:
           - Touch-friendly interface
           - Swipeable tabs
           - Responsive grid layouts
           - Collapsible sections

        5. Arabic RTL Support:
           - Proper text alignment
           - Mirrored layouts
           - Arabic number formatting
           - RTL-aware animations
      */}
    </div>
  );
};

// API Integration Example
export const subscriptionAPIExample = {
  // Fetch all subscription plans
  getPlans: async () => {
    const response = await fetch('/api/subscriptions/plans');
    return response.json();
  },

  // Create a new subscription plan
  createPlan: async (plan: any) => {
    const response = await fetch('/api/subscriptions/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    });
    return response.json();
  },

  // Update member subscription
  updateSubscription: async (subscriptionId: string, data: any) => {
    const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Get payment history
  getPaymentHistory: async (memberId: string) => {
    const response = await fetch(`/api/payments/member/${memberId}`);
    return response.json();
  }
};

// Custom hooks for subscription management
export const useSubscriptions = () => {
  const [subscriptions, setSubscriptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchSubscriptions = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await subscriptionAPIExample.getPlans();
      setSubscriptions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return { subscriptions, loading, error, refetch: fetchSubscriptions };
};

export default SubscriptionsDemo;