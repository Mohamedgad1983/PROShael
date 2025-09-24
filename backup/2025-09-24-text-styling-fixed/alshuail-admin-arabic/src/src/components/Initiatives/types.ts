export interface Initiative {
  id: string;
  title: string;
  description: string;
  category: InitiativeCategory;
  targetAmount: number;
  raisedAmount: number;
  startDate: Date;
  endDate?: Date;
  status: InitiativeStatus;
  organizerId: string;
  organizerName: string;
  image?: string;
  tags: string[];
  isUrgent: boolean;
  beneficiaries?: string;
  location?: string;
  createdDate: Date;
  updatedDate: Date;
}

export interface Contribution {
  id: string;
  initiativeId: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  amount: number;
  paymentMethod: string;
  status: ContributionStatus;
  contributionDate: Date;
  notes?: string;
  isAnonymous: boolean;
}

export type InitiativeCategory =
  | 'education'
  | 'health'
  | 'charity'
  | 'community'
  | 'environment'
  | 'technology'
  | 'emergency'
  | 'infrastructure';

export type InitiativeStatus =
  | 'active'
  | 'completed'
  | 'paused'
  | 'cancelled'
  | 'draft';

export type ContributionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded';

export interface InitiativeFormData {
  title: string;
  description: string;
  category: InitiativeCategory;
  targetAmount: number;
  startDate: string;
  endDate?: string;
  image?: File;
  tags: string[];
  isUrgent: boolean;
  beneficiaries?: string;
  location?: string;
}

export interface ContributionFormData {
  amount: number;
  paymentMethod: string;
  notes?: string;
  isAnonymous: boolean;
}

export interface InitiativeFilters {
  category?: InitiativeCategory;
  status?: InitiativeStatus;
  amountRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  isUrgent?: boolean;
}

export interface InitiativeStatistics {
  totalInitiatives: number;
  activeInitiatives: number;
  completedInitiatives: number;
  totalRaised: number;
  totalContributions: number;
  averageContribution: number;
  mostPopularCategory: string;
  successRate: number;
}

export interface InitiativeProgress {
  percentage: number;
  remaining: number;
  contributors: number;
  daysLeft?: number;
  recentContributions: Contribution[];
}