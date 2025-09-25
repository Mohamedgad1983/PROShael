export interface Occasion {
  id: string;
  title: string;
  description: string;
  type: OccasionType;
  date: Date;
  time: string;
  location: string;
  organizerId: string;
  organizerName: string;
  status: OccasionStatus;
  maxAttendees?: number;
  rsvpDeadline?: Date;
  isPublic: boolean;
  tags: string[];
  createdDate: Date;
  updatedDate: Date;
}

export interface RSVP {
  id: string;
  occasionId: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  status: RSVPStatus;
  responseDate: Date;
  notes?: string;
  guestCount: number;
}

export type OccasionType =
  | 'wedding'
  | 'birth'
  | 'graduation'
  | 'celebration'
  | 'conference'
  | 'meeting'
  | 'charity'
  | 'social'
  | 'religious'
  | 'family';

export type OccasionStatus =
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'completed'
  | 'postponed';

export type RSVPStatus =
  | 'confirmed'
  | 'declined'
  | 'maybe'
  | 'pending';

export interface OccasionFormData {
  title: string;
  description: string;
  type: OccasionType;
  date: string;
  time: string;
  location: string;
  maxAttendees?: number;
  rsvpDeadline?: string;
  isPublic: boolean;
  tags: string[];
}

export interface OccasionFilters {
  type?: OccasionType;
  status?: OccasionStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface OccasionStatistics {
  totalOccasions: number;
  upcomingOccasions: number;
  completedOccasions: number;
  totalAttendees: number;
  averageAttendance: number;
  mostPopularType: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: OccasionType;
  status: OccasionStatus;
  attendeesCount: number;
}