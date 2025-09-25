export interface Diya {
  id: string;
  title: string;
  description: string;
  caseType: DiyaCaseType;
  compensationAmount: number;
  status: DiyaStatus;
  priority: DiyaPriority;
  caseDateOccurred: Date;
  reportedDate: Date;
  investigatorId?: string;
  investigatorName?: string;
  reportedById: string;
  reportedByName: string;
  involvedParties: InvolvedParty[];
  caseDetails: CaseDetails;
  resolutionDetails?: ResolutionDetails;
  paymentDetails?: PaymentDetails;
  documents: Document[];
  createdDate: Date;
  updatedDate: Date;
}

export interface InvolvedParty {
  id: string;
  name: string;
  role: PartyRole;
  contactInfo?: ContactInfo;
  relationship?: string;
  isResponsible: boolean;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

export interface CaseDetails {
  location: string;
  witnesses?: string[];
  damageDescription: string;
  medicalReports?: string[];
  policeReport?: string;
  estimatedCost?: number;
  insuranceClaim?: boolean;
}

export interface ResolutionDetails {
  resolutionDate: Date;
  resolutionMethod: ResolutionMethod;
  agreedAmount: number;
  paymentTerms: string;
  mediatorName?: string;
  notes?: string;
}

export interface PaymentDetails {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  paymentDate?: Date;
  installments?: PaymentInstallment[];
  bankReference?: string;
}

export interface PaymentInstallment {
  id: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: InstallmentStatus;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  uploadedBy: string;
  uploadedDate: Date;
  size: number;
}

export type DiyaCaseType =
  | 'accidentalDamage'
  | 'intentionalDamage'
  | 'medicalCompensation'
  | 'propertyDamage'
  | 'vehicleAccident'
  | 'personalInjury'
  | 'death'
  | 'financial';

export type DiyaStatus =
  | 'reported'
  | 'investigating'
  | 'mediation'
  | 'resolved'
  | 'awaitingPayment'
  | 'completed'
  | 'cancelled'
  | 'appealed';

export type DiyaPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export type PartyRole =
  | 'complainant'
  | 'respondent'
  | 'witness'
  | 'guardian'
  | 'representative';

export type ResolutionMethod =
  | 'mediation'
  | 'arbitration'
  | 'familyCouncil'
  | 'directAgreement'
  | 'court';

export type InstallmentStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type DocumentType =
  | 'medicalReport'
  | 'policeReport'
  | 'witness'
  | 'insurance'
  | 'photo'
  | 'agreement'
  | 'payment'
  | 'other';

export interface DiyaFormData {
  title: string;
  description: string;
  caseType: DiyaCaseType;
  compensationAmount: number;
  priority: DiyaPriority;
  caseDateOccurred: string;
  caseDetails: {
    location: string;
    damageDescription: string;
    estimatedCost?: number;
    insuranceClaim?: boolean;
  };
  involvedParties: Omit<InvolvedParty, 'id'>[];
}

export interface DiyaFilters {
  status?: DiyaStatus;
  caseType?: DiyaCaseType;
  priority?: DiyaPriority;
  dateRange?: {
    start: Date;
    end: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  search?: string;
}

export interface DiyaStatistics {
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  totalCompensation: number;
  averageResolutionTime: number;
  pendingPayments: number;
  successRate: number;
}