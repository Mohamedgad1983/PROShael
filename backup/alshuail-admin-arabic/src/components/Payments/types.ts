// Type definitions for payment management system

export interface Payment {
  id: string;
  referenceNumber: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  amount: number;
  category: PaymentCategory;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  description?: string;
  dueDate: Date;
  paidDate?: Date;
  createdDate: Date;
  createdBy: string;
  approvedBy?: string;
  approvedDate?: Date;
  receiptUrl?: string;
  refundReason?: string;
  refundDate?: Date;
  isRecurring?: boolean;
  recurringPeriod?: 'monthly' | 'quarterly' | 'yearly';
  tags?: string[];
  hijri_formatted?: string;
  hijri_date_string?: string;
  hijri_year?: number;
  hijri_month?: number;
  hijri_day?: number;
}

export type PaymentCategory =
  | 'subscription'
  | 'activity'
  | 'membership'
  | 'donation'
  | 'penalty'
  | 'refund';

export type PaymentType =
  | 'regular'
  | 'flexible'
  | 'installment'
  | 'one_time';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'credit_card'
  | 'debit_card'
  | 'digital_wallet'
  | 'app_payment'
  | 'check';

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'paid'
  | 'overdue'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export interface PaymentFilters {
  status?: PaymentStatus[];
  category?: PaymentCategory[];
  method?: PaymentMethod[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  memberId?: string;
  search?: string;
}

export interface PaymentStatistics {
  totalPayments: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingAmount: number;
  overduePayments: number;
  overdueAmount: number;
  approvedPayments: number;
  approvedAmount: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
}

export interface PaymentFormData {
  memberId: string;
  amount: number;
  category: PaymentCategory;
  type: PaymentType;
  method: PaymentMethod;
  description?: string;
  dueDate: Date;
  isRecurring?: boolean;
  recurringPeriod?: 'monthly' | 'quarterly' | 'yearly';
  tags?: string[];
}

export interface PaymentValidation {
  isValid: boolean;
  errors: {
    [key in keyof PaymentFormData]?: string;
  };
}

export interface PaymentAction {
  type: 'approve' | 'reject' | 'refund' | 'cancel' | 'receipt';
  reason?: string;
  amount?: number; // for partial refunds
}

export interface PaymentHistoryEntry {
  id: string;
  action: string;
  actionBy: string;
  actionDate: Date;
  previousStatus?: PaymentStatus;
  newStatus?: PaymentStatus;
  notes?: string;
}

export interface PaymentReceipt {
  id: string;
  paymentId: string;
  receiptNumber: string;
  generatedDate: Date;
  generatedBy: string;
  pdfUrl?: string;
}

// Arabic number conversion utility type
export interface ArabicNumberUtils {
  toArabicNumerals: (num: number | string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date) => string;
}

// Component props types
export interface PaymentsOverviewProps {
  onCreatePayment?: () => void;
  onFilterChange?: (filters: PaymentFilters) => void;
}

export interface PaymentsTableProps {
  payments: Payment[];
  filters: PaymentFilters;
  onFilterChange: (filters: PaymentFilters) => void;
  onPaymentSelect: (payment: Payment) => void;
  onPaymentAction: (paymentId: string, action: PaymentAction) => void;
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export interface CreatePaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  initialData?: Partial<PaymentFormData>;
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

export interface PaymentDetailsModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: PaymentAction) => void;
  history?: PaymentHistoryEntry[];
}

// State management types
export interface PaymentState {
  payments: Payment[];
  statistics: PaymentStatistics;
  filters: PaymentFilters;
  selectedPayment: Payment | null;
  loading: boolean;
  error: string | null;
  showCreateForm: boolean;
  showDetailsModal: boolean;
}

export interface PaymentContextType {
  state: PaymentState;
  actions: {
    fetchPayments: (filters?: PaymentFilters) => Promise<void>;
    createPayment: (data: PaymentFormData) => Promise<void>;
    updatePayment: (id: string, data: Partial<Payment>) => Promise<void>;
    performPaymentAction: (id: string, action: PaymentAction) => Promise<void>;
    setFilters: (filters: PaymentFilters) => void;
    selectPayment: (payment: Payment | null) => void;
    showCreateForm: () => void;
    hideCreateForm: () => void;
    showDetailsModal: (payment: Payment) => void;
    hideDetailsModal: () => void;
  };
}