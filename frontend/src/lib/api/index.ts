// ==============================================================================
// CollegeQuery SaaS — Typed API Service Modules (api/index.ts)
// ==============================================================================

import { apiClient } from '../api-client';
import {
  MOCK_USERS_LIST,
  MOCK_TICKETS,
  MOCK_DEPARTMENTS,
  MOCK_COURSES,
  MOCK_ACADEMIC_SESSIONS,
  MOCK_STUDENTS,
  MOCK_STAFF,
  MOCK_QUERY_CATEGORIES,
  MOCK_SLA_POLICIES,
  MOCK_ESCALATION_RULES,
  MOCK_KB_ARTICLES,
  MOCK_FAQS,
  MOCK_FEEDBACK,
  MOCK_NOTIFICATIONS,
  MOCK_COLLEGES,
  MOCK_TENANT_CONFIG,
} from '../mock-data';
import {
  User,
  Ticket,
  Department,
  Course,
  AcademicSession,
  StudentProfile,
  StaffMember,
  QueryCategoryItem,
  SlaPolicyItem,
  EscalationRule,
  QueryFeedbackItem,
  NotificationItem,
  CollegeItem,
  TenantConfiguration,
  TicketMessage,
} from '../types';

// ==============================================================================
// 1. Auth API
// ==============================================================================
export const authApi = {
  async login(dto: { email: string; password: string }) {
    const res = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: any;
    }>('/auth/login', dto);
    if (res?.accessToken) {
      apiClient.setToken(res.accessToken);
      if (res.user?.tenantId) {
        apiClient.setTenant(res.user.tenantId, res.user.tenantSlug);
      }
    }
    return res;
  },

  async register(dto: any) {
    return apiClient.post('/auth/register', dto);
  },

  async logout() {
    apiClient.setToken(null);
  },
};

// ==============================================================================
// 2. Users API
// ==============================================================================
export const usersApi = {
  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    return apiClient.get<User[]>('/users', params, MOCK_USERS_LIST);
  },

  async getById(id: string) {
    const fallback = MOCK_USERS_LIST.find((u) => u.id === id);
    return apiClient.get<User>(`/users/${id}`, undefined, fallback);
  },

  async create(dto: any) {
    return apiClient.post<User>('/users', dto, {
      id: `usr-${Date.now()}`,
      ...dto,
      role: dto.role || 'STUDENT',
      createdAt: new Date().toISOString(),
    });
  },

  async update(id: string, dto: any) {
    return apiClient.patch<User>(`/users/${id}`, dto);
  },

  async delete(id: string) {
    return apiClient.delete(`/users/${id}`);
  },
};

// ==============================================================================
// 3. Queries / Tickets API
// ==============================================================================
export const queriesApi = {
  async getAll(params?: {
    status?: string;
    priority?: string;
    departmentId?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return apiClient.get<Ticket[]>('/queries', params, MOCK_TICKETS);
  },

  async getById(id: string) {
    const fallback = MOCK_TICKETS.find((t) => t.id === id);
    return apiClient.get<Ticket>(`/queries/${id}`, undefined, fallback);
  },

  async create(dto: any) {
    return apiClient.post<Ticket>('/queries', dto);
  },

  async updateStatus(id: string, status: string, remarks?: string) {
    return apiClient.patch<Ticket>(`/queries/${id}/status`, { status, remarks });
  },

  async assign(id: string, assignedToId: string) {
    return apiClient.patch<Ticket>(`/queries/${id}/assign`, { assignedToId });
  },

  async resolve(id: string, resolutionRemarks: string) {
    return apiClient.patch<Ticket>(`/queries/${id}/resolve`, { resolutionRemarks });
  },

  async escalate(id: string, dto: { reason: string; escalateToUserId?: string; level?: number }) {
    return apiClient.post(`/queries/${id}/escalations`, dto);
  },
};

// ==============================================================================
// 4. Conversations / Messages API
// ==============================================================================
export const conversationsApi = {
  async getMessages(queryId: string) {
    const ticket = MOCK_TICKETS.find((t) => t.id === queryId);
    return apiClient.get<TicketMessage[]>(
      `/queries/${queryId}/messages`,
      undefined,
      ticket?.messages || []
    );
  },

  async sendMessage(queryId: string, dto: { content: string; isInternal?: boolean }) {
    return apiClient.post<TicketMessage>(`/queries/${queryId}/messages`, dto);
  },
};

// ==============================================================================
// 5. Academic API (Departments, Courses, Sessions)
// ==============================================================================
export const academicApi = {
  async getDepartments() {
    return apiClient.get<Department[]>('/departments', undefined, MOCK_DEPARTMENTS);
  },

  async createDepartment(dto: any) {
    return apiClient.post<Department>('/departments', dto, {
      id: `dept-${Date.now()}`,
      studentCount: 0,
      openTickets: 0,
      resolvedTickets: 0,
      ...dto,
    });
  },

  async getCourses() {
    return apiClient.get<Course[]>('/courses', undefined, MOCK_COURSES);
  },

  async createCourse(dto: any) {
    return apiClient.post<Course>('/courses', dto, {
      id: `crs-${Date.now()}`,
      studentCount: 0,
      ...dto,
    });
  },

  async getSessions() {
    return apiClient.get<AcademicSession[]>('/academic-sessions', undefined, MOCK_ACADEMIC_SESSIONS);
  },

  async createSession(dto: any) {
    return apiClient.post<AcademicSession>('/academic-sessions', dto, {
      id: `ses-${Date.now()}`,
      isCurrent: false,
      ...dto,
    });
  },
};

// ==============================================================================
// 6. Students API
// ==============================================================================
export const studentsApi = {
  async getAll(params?: { page?: number; limit?: number; search?: string; departmentId?: string }) {
    return apiClient.get<StudentProfile[]>('/students', params, MOCK_STUDENTS);
  },

  async getById(id: string) {
    const fallback = MOCK_STUDENTS.find((s) => s.id === id);
    return apiClient.get<StudentProfile>(`/students/${id}`, undefined, fallback);
  },

  async create(dto: any) {
    return apiClient.post<StudentProfile>('/students', dto);
  },

  async update(id: string, dto: any) {
    return apiClient.patch<StudentProfile>(`/students/${id}`, dto);
  },
};

// ==============================================================================
// 7. Faculty & Staff API
// ==============================================================================
export const staffApi = {
  async getFaculty() {
    return apiClient.get<StaffMember[]>('/faculty', undefined, MOCK_STAFF);
  },

  async getEmployees() {
    return apiClient.get<StaffMember[]>('/employees', undefined, MOCK_STAFF);
  },

  async createStaff(dto: any) {
    return apiClient.post<StaffMember>('/employees', dto);
  },

  async getRoles() {
    return apiClient.get<any[]>('/roles', undefined, [
      'SUPER_ADMIN',
      'COLLEGE_ADMIN',
      'PRINCIPAL',
      'HOD',
      'FACULTY',
      'STUDENT',
      'STAFF_ACCOUNTS',
      'STAFF_EXAMINATION',
      'STAFF_SUPPORT',
    ]);
  },

  async getPermissions() {
    return apiClient.get<any[]>('/permissions');
  },
};

// ==============================================================================
// 8. SLA & Categories API
// ==============================================================================
export const slaApi = {
  async getCategories(departmentId?: string) {
    return apiClient.get<QueryCategoryItem[]>(
      '/query-categories',
      departmentId ? { departmentId } : undefined,
      MOCK_QUERY_CATEGORIES
    );
  },

  async createCategory(dto: any) {
    return apiClient.post<QueryCategoryItem>('/query-categories', dto, {
      id: `cat-${Date.now()}`,
      isActive: true,
      ...dto,
    });
  },

  async getPolicies() {
    return apiClient.get<SlaPolicyItem[]>('/sla/policies', undefined, MOCK_SLA_POLICIES);
  },

  async createPolicy(dto: any) {
    return apiClient.post<SlaPolicyItem>('/sla/policies', dto, {
      id: `sla-${Date.now()}`,
      isActive: true,
      ...dto,
    });
  },

  async getEscalationRules() {
    return apiClient.get<EscalationRule[]>(
      '/query-escalations/rules',
      undefined,
      MOCK_ESCALATION_RULES
    );
  },
};

// ==============================================================================
// 9. Knowledge Base & FAQs API
// ==============================================================================
export const kbApi = {
  async search(query = '', categoryId?: string) {
    return apiClient.get('/knowledge-base/search', { q: query, categoryId });
  },

  async getArticles() {
    return apiClient.get<any[]>('/knowledge-base/articles', undefined, MOCK_KB_ARTICLES);
  },

  async createArticle(dto: any) {
    return apiClient.post('/knowledge-base/articles', dto);
  },

  async voteArticle(id: string, isHelpful: boolean) {
    return apiClient.post(`/knowledge-base/articles/${id}/feedback`, { isHelpful });
  },

  async getFaqs(params?: { categoryId?: string; search?: string }) {
    return apiClient.get<any[]>('/faqs', params, MOCK_FAQS);
  },

  async createFaq(dto: any) {
    return apiClient.post('/faqs', dto);
  },
};

// ==============================================================================
// 10. Feedback API
// ==============================================================================
export const feedbackApi = {
  async getForQuery(queryId: string) {
    return apiClient.get(`/queries/${queryId}/feedback`);
  },

  async submitFeedback(queryId: string, dto: { rating: number; comments: string }) {
    return apiClient.post(`/queries/${queryId}/feedback`, dto);
  },

  async getAnalytics(departmentId?: string) {
    return apiClient.get('/feedback/analytics', { departmentId });
  },

  async getStudentHistory(params?: { page?: number; limit?: number }) {
    return apiClient.get<QueryFeedbackItem[]>('/feedback/my-history', params, MOCK_FEEDBACK);
  },
};

// ==============================================================================
// 11. Attachments API
// ==============================================================================
export const attachmentsApi = {
  async getByQuery(queryId: string) {
    return apiClient.get(`/attachments/query/${queryId}`);
  },

  async getPresignedPutUrl(dto: { fileName: string; fileType: string; fileSize: number }) {
    return apiClient.post('/attachments/presigned-url', dto);
  },

  async getDownloadUrl(attachmentId: string) {
    return apiClient.get(`/attachments/${attachmentId}/download-url`);
  },
};

// ==============================================================================
// 12. Notifications API
// ==============================================================================
export const notificationsApi = {
  async getAll(params?: { unreadOnly?: boolean; page?: number; limit?: number }) {
    return apiClient.get<NotificationItem[]>('/notifications', params, MOCK_NOTIFICATIONS);
  },

  async markAsRead(id: string) {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  async getPreferences() {
    return apiClient.get('/notifications/preferences');
  },

  async updatePreferences(dto: any) {
    return apiClient.patch('/notifications/preferences', dto);
  },
};

// ==============================================================================
// 13. Analytics API
// ==============================================================================
export const analyticsApi = {
  async getOverview() {
    return apiClient.get('/analytics/overview');
  },

  async getQueryVolume(params?: { startDate?: string; endDate?: string; bucket?: string }) {
    return apiClient.get('/analytics/query-volume', params);
  },
};

// ==============================================================================
// 14. Reports API
// ==============================================================================
export const reportsApi = {
  async exportCsv(params?: { startDate?: string; endDate?: string; departmentId?: string; status?: string }) {
    return apiClient.post('/reports/export/tickets-csv', params);
  },
};

// ==============================================================================
// 15. Subscriptions & Billing API
// ==============================================================================
export const subscriptionsApi = {
  async getPlans() {
    return apiClient.get('/subscriptions/plans');
  },

  async getCurrent() {
    return apiClient.get('/subscriptions/current');
  },

  async changePlan(dto: { planTier: string; billingCycle?: string }) {
    return apiClient.post('/subscriptions/change-plan', dto);
  },
};

// ==============================================================================
// 16. Payments API
// ==============================================================================
export const paymentsApi = {
  async initiate(dto: { invoiceId: string; amount: number; gateway: string }) {
    return apiClient.post('/payments/initiate', dto);
  },

  async verify(dto: { paymentId: string; signature: string; orderId: string }) {
    return apiClient.post('/payments/verify', dto);
  },
};

// ==============================================================================
// 17. Audit Logs API
// ==============================================================================
export const auditLogsApi = {
  async getAll(params?: { action?: string; entityName?: string; page?: number; limit?: number }) {
    return apiClient.get('/audit-logs', params);
  },
};

// ==============================================================================
// 18. Colleges & Tenants Directory API
// ==============================================================================
export const collegesApi = {
  async getAll() {
    return apiClient.get<CollegeItem[]>('/colleges', undefined, MOCK_COLLEGES);
  },

  async create(dto: any) {
    return apiClient.post<CollegeItem>('/colleges', dto, {
      id: `col-${Date.now()}`,
      activeUsers: 0,
      totalQueries: 0,
      status: 'ACTIVE',
      ...dto,
    });
  },

  async onboard(dto: any) {
    return apiClient.post('/colleges/onboard', dto);
  },
};

// ==============================================================================
// 19. Tenants API (Platform Super Admin)
// ==============================================================================
export const tenantsApi = {
  async getAll(params?: { page?: number; limit?: number }) {
    return apiClient.get('/tenants', params, MOCK_COLLEGES);
  },

  async getById(id: string) {
    return apiClient.get(`/tenants/${id}`);
  },

  async create(dto: any) {
    return apiClient.post('/tenants', dto);
  },
};

// ==============================================================================
// 20. Tenant Configuration API
// ==============================================================================
export const tenantConfigApi = {
  async getConfig() {
    return apiClient.get<TenantConfiguration>('/tenant-config', undefined, MOCK_TENANT_CONFIG);
  },

  async updateConfig(dto: Partial<TenantConfiguration>) {
    return apiClient.patch<TenantConfiguration>('/tenant-config', dto);
  },
};

// ==============================================================================
// 21. System Admin API
// ==============================================================================
export const systemAdminApi = {
  async getMetrics() {
    return apiClient.get('/system-admin/metrics');
  },

  async getTenants(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    return apiClient.get('/system-admin/tenants', params);
  },

  async impersonate(dto: { tenantId: string; reason: string }) {
    return apiClient.post('/system-admin/impersonate', dto);
  },
};
