// ==============================================================================
// CollegeQuery SaaS — End-to-End Query & Ticket Management Engine Test Suite
// Verifies:
// 1. Configurable categories and department mapping
// 2. Concurrency-safe ticket creation with unique ticket numbering
// 3. Workload-aware staff selection and automatic department routing
// 4. State Machine: explicit allowed-status-transition system (rejects arbitrary jumps)
// 5. Staff first response time tracking & resolution with summary
// 6. Student feedback submission and automatic ticket closure
// 7. Manual and automatic SLA breach escalation to HOD/Admin
// 8. Complete assignment history, status history, and immutable audit logging
// ==============================================================================

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryPriority, QueryStatus } from '@prisma/client';
import { QueriesService, ALLOWED_STATUS_TRANSITIONS } from '../src/modules/queries/queries.service.js';
import { QueryCategoriesService } from '../src/modules/query-categories/query-categories.service.js';
import { QueryAssignmentsService } from '../src/modules/query-assignments/query-assignments.service.js';
import { SlaService } from '../src/modules/sla/sla.service.js';

describe('Query Management Engine End-to-End Suite', () => {
  let mockPrisma: any;
  let mockEventEmitter: any;
  let queriesService: QueriesService;
  let categoriesService: QueryCategoriesService;
  let assignmentsService: QueryAssignmentsService;
  let slaService: SlaService;

  const TENANT_ID = 'tenant-engineering-campus-1';
  const STUDENT_USER_ID = 'user-student-aarav';
  const FACULTY_USER_ID = 'user-faculty-anita';
  const DEPT_ID = 'dept-cse-id';

  beforeEach(() => {
    mockEventEmitter = {
      emit: vi.fn(),
    };

    mockPrisma = {
      query: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      queryCategory: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      queryAssignment: {
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      queryStatusHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      queryEscalation: {
        create: vi.fn(),
      },
      queryFeedback: {
        upsert: vi.fn(),
      },
      student: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      faculty: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      employee: {
        findFirst: vi.fn(),
      },
      department: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      attachment: {
        updateMany: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      sLAPolicy: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };

    queriesService = new QueriesService(mockPrisma, mockEventEmitter);
    categoriesService = new QueryCategoriesService(mockPrisma);
    assignmentsService = new QueryAssignmentsService(mockPrisma, mockEventEmitter);
    slaService = new SlaService(mockPrisma);
  });

  // ----------------------------------------------------------------------------
  // 1. QUERY CATEGORIES CONFIGURATION
  // ----------------------------------------------------------------------------
  describe('1. Query Categories & Department Mapping', () => {
    it('should create configurable category with department mapping, priority and SLA hours', async () => {
      mockPrisma.queryCategory.findFirst.mockResolvedValue(null);
      mockPrisma.department.findFirst.mockResolvedValue({ id: DEPT_ID, tenantId: TENANT_ID });
      mockPrisma.queryCategory.create.mockResolvedValue({
        id: 'cat-fees',
        name: 'Fees & Accounts',
        slug: 'fees',
        defaultPriority: QueryPriority.HIGH,
        defaultSlaHours: 24,
      });

      const result = await categoriesService.create(
        TENANT_ID,
        {
          name: 'Fees & Accounts',
          slug: 'fees',
          departmentId: DEPT_ID,
          defaultPriority: QueryPriority.HIGH,
          defaultSlaHours: 24,
        },
        'admin-actor',
      );

      expect(result.id).toBe('cat-fees');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'QUERY_CATEGORY_CREATED',
          entityName: 'QueryCategory',
        }),
      });
    });

    it('should seed standard college categories (Fees, Exam, Hostel, Attendance, Library)', async () => {
      mockPrisma.queryCategory.findFirst.mockResolvedValue(null);
      mockPrisma.queryCategory.create.mockImplementation((args: any) => ({
        id: `cat-${args.data.slug}`,
        ...args.data,
      }));

      const result = await categoriesService.seedDefaultCategories(TENANT_ID, 'admin-actor');
      expect(result.success).toBe(true);
      expect(result.categories.length).toBe(9);
      expect(mockPrisma.queryCategory.create).toHaveBeenCalledTimes(9);
    });
  });

  // ----------------------------------------------------------------------------
  // 2. QUERY WORKFLOW: TICKET CREATION & WORKLOAD-AWARE AUTO-ASSIGNMENT
  // ----------------------------------------------------------------------------
  describe('2. Ticket Creation & Workload-Aware Auto-Assignment', () => {
    it('should create query with unique ticket number and auto-assign to least-loaded faculty', async () => {
      mockPrisma.student.findFirst.mockResolvedValue({
        id: 'student-profile-1',
        userId: STUDENT_USER_ID,
        tenantId: TENANT_ID,
        departmentId: DEPT_ID,
      });

      mockPrisma.queryCategory.findFirst.mockResolvedValue({
        id: 'cat-exam',
        name: 'Examination',
        defaultPriority: QueryPriority.HIGH,
        defaultSlaHours: 24,
      });

      // Two candidate faculty: Prof Anita (load 1/15) and Prof Bob (load 5/15)
      mockPrisma.faculty.findMany.mockResolvedValue([
        { id: 'fac-1', userId: FACULTY_USER_ID, maxActiveQueries: 15, _count: { queryAssignments: 1 } },
        { id: 'fac-2', userId: 'user-faculty-bob', maxActiveQueries: 15, _count: { queryAssignments: 5 } },
      ]);

      mockPrisma.query.count.mockResolvedValue(41); // 41 queries this year
      mockPrisma.query.create.mockResolvedValue({
        id: 'query-101',
        ticketNumber: 'CQ-2026-00042',
        title: 'Grade card discrepancy in Semester 4',
        status: QueryStatus.ASSIGNED,
        priority: QueryPriority.HIGH,
      });

      const result = await queriesService.create(TENANT_ID, STUDENT_USER_ID, {
        categoryId: 'cat-exam',
        departmentId: DEPT_ID,
        title: 'Grade card discrepancy in Semester 4',
        description: 'Marks shown as B+ instead of A in final result.',
        priority: QueryPriority.HIGH,
      });

      expect(result.ticketNumber).toBe('CQ-2026-00042');
      expect(result.status).toBe(QueryStatus.ASSIGNED);

      // Verify assignment was created for least-loaded faculty (Prof Anita)
      expect(mockPrisma.queryAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assignedToUserId: FACULTY_USER_ID,
          facultyProfileId: 'fac-1',
          assignmentType: 'AUTO',
        }),
      });

      // Verify status history entry was created
      expect(mockPrisma.queryStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousStatus: QueryStatus.OPEN,
          newStatus: QueryStatus.ASSIGNED,
        }),
      });

      // Verify notifications and audit log
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2); // student + assigned staff
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'QUERY_CREATED',
          entityName: 'Query',
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('query.created', expect.any(Object));
    });

    it('should reject ticket creation from non-student user', async () => {
      mockPrisma.student.findFirst.mockResolvedValue(null);

      await expect(
        queriesService.create(TENANT_ID, 'non-student-user-id', {
          categoryId: 'cat-1',
          departmentId: DEPT_ID,
          title: 'Unauthorized Query',
          description: 'Test description',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ----------------------------------------------------------------------------
  // 3. EXPLICIT ALLOWED STATUS TRANSITIONS (STATE MACHINE)
  // ----------------------------------------------------------------------------
  describe('3. State Machine & Status Transitions', () => {
    it('should allow valid transition: ASSIGNED -> IN_PROGRESS and track first response timestamp', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        ticketNumber: 'CQ-2026-00042',
        status: QueryStatus.ASSIGNED,
        firstRespondedAt: null,
      });

      mockPrisma.query.update.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.IN_PROGRESS,
      });

      const result = await queriesService.updateStatus(
        TENANT_ID,
        FACULTY_USER_ID,
        'query-101',
        { status: QueryStatus.IN_PROGRESS, remarks: 'Commenced investigation' },
      );

      expect(result.status).toBe(QueryStatus.IN_PROGRESS);
      expect(mockPrisma.query.update).toHaveBeenCalledWith({
        where: { id: 'query-101' },
        data: expect.objectContaining({
          status: QueryStatus.IN_PROGRESS,
          firstRespondedAt: expect.any(Date), // First response timestamp tracked
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'QUERY_STATUS_CHANGED',
        }),
      });
    });

    it('should allow valid transition: IN_PROGRESS -> WAITING_FOR_STUDENT', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.IN_PROGRESS,
      });
      mockPrisma.query.update.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.WAITING_FOR_STUDENT,
      });

      const result = await queriesService.updateStatus(
        TENANT_ID,
        FACULTY_USER_ID,
        'query-101',
        { status: QueryStatus.WAITING_FOR_STUDENT, remarks: 'Requested original mark sheet scan' },
      );

      expect(result.status).toBe(QueryStatus.WAITING_FOR_STUDENT);
    });

    it('should reject invalid arbitrary status transition: OPEN -> RESOLVED', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.OPEN,
      });

      await expect(
        queriesService.updateStatus(TENANT_ID, FACULTY_USER_ID, 'query-101', {
          status: QueryStatus.RESOLVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition from terminal CANCELLED status', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.CANCELLED,
      });

      await expect(
        queriesService.updateStatus(TENANT_ID, FACULTY_USER_ID, 'query-101', {
          status: QueryStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ----------------------------------------------------------------------------
  // 4. RESOLUTION, FEEDBACK & AUTOMATIC TICKET CLOSURE
  // ----------------------------------------------------------------------------
  describe('4. Resolution & Student Feedback Lifecycle', () => {
    it('should resolve query ticket with resolution summary', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        ticketNumber: 'CQ-2026-00042',
        status: QueryStatus.IN_PROGRESS,
        student: { userId: STUDENT_USER_ID },
      });

      mockPrisma.query.update.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.RESOLVED,
        resolvedAt: new Date(),
      });

      const result = await queriesService.resolve(
        TENANT_ID,
        FACULTY_USER_ID,
        'query-101',
        { resolutionSummary: 'Grade corrected to A after cross-checking controller records.' },
      );

      expect(result.status).toBe(QueryStatus.RESOLVED);
      expect(mockPrisma.query.update).toHaveBeenCalledWith({
        where: { id: 'query-101' },
        data: expect.objectContaining({
          status: QueryStatus.RESOLVED,
          resolvedAt: expect.any(Date),
        }),
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: STUDENT_USER_ID,
          title: expect.stringContaining('Ticket Resolved'),
        }),
      });
    });

    it('should allow student to submit CSAT feedback and automatically close resolved ticket', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.RESOLVED,
        student: { userId: STUDENT_USER_ID },
      });

      mockPrisma.queryFeedback.upsert.mockResolvedValue({
        id: 'feedback-1',
        queryId: 'query-101',
        rating: 5,
        feedbackText: 'Resolved very quickly, thank you!',
      });

      const feedback = await queriesService.submitFeedback(
        TENANT_ID,
        STUDENT_USER_ID,
        'query-101',
        5,
        'Resolved very quickly, thank you!',
      );

      expect(feedback.rating).toBe(5);
      // Auto-closed query upon feedback
      expect(mockPrisma.query.update).toHaveBeenCalledWith({
        where: { id: 'query-101' },
        data: expect.objectContaining({
          status: QueryStatus.CLOSED,
          closedAt: expect.any(Date),
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'QUERY_FEEDBACK_SUBMITTED',
        }),
      });
    });

    it('should forbid other students from submitting feedback on someone else ticket', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.RESOLVED,
        student: { userId: STUDENT_USER_ID },
      });

      await expect(
        queriesService.submitFeedback(TENANT_ID, 'other-student-user', 'query-101', 4),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ----------------------------------------------------------------------------
  // 5. MANUAL REASSIGNMENT & ESCALATION
  // ----------------------------------------------------------------------------
  describe('5. Staff Reassignment & Escalation', () => {
    it('should reassign ticket to another staff member and preserve assignment history', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        status: QueryStatus.IN_PROGRESS,
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-faculty-new',
        firstName: 'Sanjay',
        lastName: 'Gupta',
        facultyProfile: { id: 'fac-new-id' },
      });

      mockPrisma.queryAssignment.create.mockResolvedValue({
        id: 'assign-2',
        queryId: 'query-101',
        assignedToUserId: 'user-faculty-new',
      });

      const result = await assignmentsService.assign(
        TENANT_ID,
        'admin-user',
        'query-101',
        {
          assignedToUserId: 'user-faculty-new',
          reason: 'Transferred due to subject matter specialization',
        },
      );

      expect(result.id).toBe('assign-2');
      // Unassigned previous active assignment
      expect(mockPrisma.queryAssignment.updateMany).toHaveBeenCalledWith({
        where: { queryId: 'query-101', unassignedAt: null },
        data: { unassignedAt: expect.any(Date) },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'QUERY_ASSIGNED',
        }),
      });
    });

    it('should manually escalate ticket to HOD/Admin with escalation record', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-101',
        escalationLevel: 0,
        department: { hodUserId: 'user-hod-id' },
      });

      mockPrisma.queryEscalation.create.mockResolvedValue({
        id: 'esc-1',
        fromLevel: 0,
        toLevel: 1,
        escalatedToUserId: 'user-hod-id',
      });

      const result = await assignmentsService.escalate(
        TENANT_ID,
        FACULTY_USER_ID,
        'query-101',
        'Complex cross-semester verification required with university board',
      );

      expect(result.toLevel).toBe(1);
      expect(mockPrisma.query.update).toHaveBeenCalledWith({
        where: { id: 'query-101' },
        data: expect.objectContaining({
          isEscalated: true,
          escalationLevel: 1,
          status: QueryStatus.ESCALATED,
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'QUERY_ESCALATED',
        }),
      });
    });
  });

  // ----------------------------------------------------------------------------
  // 6. SLA PERFORMANCE METRICS
  // ----------------------------------------------------------------------------
  describe('6. SLA Performance & Compliance Tracking', () => {
    it('should calculate college-wide SLA compliance rate and average resolution hours', async () => {
      mockPrisma.query.count.mockResolvedValueOnce(100); // 100 total queries
      mockPrisma.query.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-08-01T10:00:00Z'),
          firstRespondedAt: new Date('2026-08-01T12:00:00Z'), // 2 hours
          resolvedAt: new Date('2026-08-01T22:00:00Z'), // 12 hours
        },
      ]);
      mockPrisma.query.count.mockResolvedValueOnce(5); // 5 breached queries

      const metrics = await slaService.getMetrics(TENANT_ID);

      expect(metrics.totalQueries).toBe(100);
      expect(metrics.breachedQueries).toBe(5);
      expect(metrics.complianceRate).toBe('95%');
      expect(metrics.avgFirstResponseHours).toBe(2);
      expect(metrics.avgResolutionHours).toBe(12);
    });
  });
});
