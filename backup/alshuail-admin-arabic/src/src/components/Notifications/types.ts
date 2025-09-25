export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipientType: RecipientType;
  recipients: NotificationRecipient[];
  senderId: string;
  senderName: string;
  scheduledDate?: Date;
  sentDate?: Date;
  readCount: number;
  totalRecipients: number;
  attachments?: NotificationAttachment[];
  tags: string[];
  relatedEntity?: {
    type: 'occasion' | 'initiative' | 'diya' | 'payment';
    id: string;
    title: string;
  };
  createdDate: Date;
  updatedDate: Date;
}

export interface NotificationRecipient {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  status: RecipientStatus;
  readDate?: Date;
  deliveredDate?: Date;
  failureReason?: string;
}

export interface NotificationAttachment {
  id: string;
  name: string;
  url: string;
  type: AttachmentType;
  size: number;
}

export type NotificationType =
  | 'general'
  | 'urgent'
  | 'reminder'
  | 'announcement'
  | 'invitation'
  | 'payment'
  | 'system'
  | 'welcome';

export type NotificationPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export type NotificationStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export type RecipientType =
  | 'all'
  | 'group'
  | 'role'
  | 'individual'
  | 'custom';

export type RecipientStatus =
  | 'pending'
  | 'delivered'
  | 'read'
  | 'failed';

export type AttachmentType =
  | 'image'
  | 'document'
  | 'video'
  | 'audio'
  | 'other';

export interface NotificationFormData {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  recipientType: RecipientType;
  selectedRecipients: string[];
  selectedGroups?: string[];
  selectedRoles?: string[];
  scheduledDate?: string;
  scheduledTime?: string;
  tags: string[];
  attachments?: File[];
}

export interface NotificationFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  recipientType?: RecipientType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  unreadOnly?: boolean;
}

export interface NotificationStatistics {
  totalNotifications: number;
  sentNotifications: number;
  pendingNotifications: number;
  totalRecipients: number;
  totalReads: number;
  readRate: number;
  mostUsedType: string;
  recentActivity: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  createdDate: Date;
  usageCount: number;
}

export interface GroupInfo {
  id: string;
  name: string;
  memberCount: number;
  description?: string;
}

export interface RoleInfo {
  id: string;
  name: string;
  memberCount: number;
  permissions?: string[];
}