// Type definitions for the flexible payment system

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface PaymentAmount {
  value: number;
  label: string;
  isRecommended?: boolean;
}

export interface PaymentValidationResult {
  isValid: boolean;
  error?: string;
}

export type SubscriptionDuration = 'monthly' | 'yearly' | 'lifetime';
export type PaymentMethod = 'card' | 'bank_transfer' | 'cash' | 'digital_wallet';

export interface PaymentConfirmationData {
  memberId: string;
  amount: number;
  duration: SubscriptionDuration;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface FlexiblePaymentData {
  amount: number;
  isValid: boolean;
  error?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  duration: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  isPopular?: boolean;
  color: string;
}

export interface Subscription {
  id: string;
  memberId: string;
  memberName: string;
  planId: string;
  status: 'active' | 'pending' | 'overdue' | 'cancelled';
  startDate: Date;
  endDate: Date;
  amount: number;
  lastPayment?: Date;
  nextPayment: Date;
  isFlexiblePayment?: boolean;
  flexibleAmount?: number;
}

export interface PaymentState {
  amount: number | null;
  isValid: boolean;
  selectedMember: Member | null;
  showConfirmationModal: boolean;
  isProcessing: boolean;
  error?: string;
}