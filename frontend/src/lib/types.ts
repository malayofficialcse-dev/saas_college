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
  status?: 'ACTIVE' | 'DEACTIVATED' | 'PENDING';
  lastLoginAt?: string;
  isMfaEnabled?: boolean;
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

export type ConversationMessage = TicketMessage;

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

export interface AcademicSession {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'ACTIVE' | 'UPCOMING' | 'ARCHIVED';
}

export interface StudentProfile {
  id: string;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentCode: string;
  courseCode: string;
  currentSemester: number;
  admissionYear: number;
  status: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED';
  totalQueries: number;
  openQueries: number;
}

export interface StaffMember {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  staffCategory: string;
  departmentCode: string;
  designation: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  assignedQueriesCount: number;
  resolvedQueriesCount: number;
}

export interface QueryCategoryItem {
  id: string;
  name: string;
  code: string;
  description: string;
  departmentCode: string;
  defaultPriority: QueryPriority;
  responseTimeHours: number;
  resolutionTimeHours: number;
  isActive: boolean;
}

export interface SlaPolicyItem {
  id: string;
  name: string;
  priority: QueryPriority;
  responseTimeHours: number;
  resolutionTimeHours: number;
  escalationHours: number;
  isEnabled: boolean;
}

export interface EscalationRule {
  id: string;
  level: number;
  name: string;
  triggerCondition: string;
  escalateToRole: string;
  notifyEmail: boolean;
}

export interface QueryFeedbackItem {
  id: string;
  queryId: string;
  queryTicketNumber: string;
  studentName: string;
  studentEmail: string;
  rating: number; // 1 to 5
  comment: string;
  tags: string[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'QUERY_CREATED' | 'QUERY_ASSIGNED' | 'QUERY_REPLIED' | 'SLA_WARNING' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  linkId?: string;
}

export interface CollegeItem {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  domain: string;
  location: string;
  adminEmail: string;
  studentCount: number;
  staffCount: number;
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'PROVISIONING';
  createdAt: string;
}

export interface TenantConfiguration {
  collegeName: string;
  collegeCode: string;
  domain: string;
  primaryColor: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  autoAssignmentStrategy: 'ROUND_ROBIN' | 'WORKLOAD_BALANCED' | 'MANUAL';
  emailNotifications: boolean;
  slaAlerts: boolean;
  maintenanceMode: boolean;
}
