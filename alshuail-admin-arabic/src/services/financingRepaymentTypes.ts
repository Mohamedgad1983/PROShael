export type FinancingProgramType = 'family_financing' | 'marriage_support';
export type RepaymentPlanStatus = 'scheduled' | 'active' | 'overdue' | 'paid' | 'cancelled';
export type InstallmentStatus = 'scheduled' | 'due' | 'partially_paid' | 'paid' | 'overdue';

export interface RepaymentInstallment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: string | number;
  paid_amount: string | number;
  status: InstallmentStatus;
  paid_at?: string | null;
}

export interface RepaymentPlan {
  id: string;
  program_type: FinancingProgramType;
  request_id: string;
  member_id: string;
  principal_amount: string | number;
  fee_amount: string | number;
  total_amount: string | number;
  outstanding_amount: string | number;
  installment_count: number;
  first_due_date: string;
  status: RepaymentPlanStatus;
  activated_at?: string;
  paid_at?: string | null;
  installments: RepaymentInstallment[];
}
