export type UserRole =
  | 'SUPER_ADMIN'
  | 'COLLEGE_ADMIN'
  | 'PRINCIPAL'
  | 'HOD'
  | 'FACULTY'
  | 'STUDENT'
  | 'STAFF_ACCOUNTS'
  | 'STAFF_EXAMINATION'
  | 'STAFF_SUPPORT';

export type QueryStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_STUDENT'
  | 'WAITING_FOR_STAFF'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED';

export type QueryPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  departmentCode?: string;
  enrollmentNumber?: string;
  designation?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  logoUrl?: string;
  domain?: string;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments?: { name: string; size: string; url: string }[];
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  department: string;
  departmentCode: string;
  studentName: string;
  studentEmail: string;
  studentEnrollment: string;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  priority: QueryPriority;
  status: QueryStatus;
  slaDeadline: string;
  isBreached: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: TicketMessage[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  publishedAt: string;
  version: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpfulCount: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hodName: string;
  facultyCount: number;
  studentCount: number;
  openQueriesCount: number;
  slaCompliance: number;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  departmentCode: string;
  degreeType: string;
  durationSemesters: number;
  studentCount: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  studentLimit: number;
  facultyLimit: number;
  staffLimit: number;
  queryLimitMonthly: number;
  storageLimitMb: number;
  features: string[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  status: 'PAID' | 'OPEN' | 'VOID';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  createdAt: string;
  details?: Record<string, any>;
}
