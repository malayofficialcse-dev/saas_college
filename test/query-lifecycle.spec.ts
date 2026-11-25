import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueriesService } from '../src/modules/queries/queries.service.js';
import { FeedbackService } from '../src/modules/feedback/feedback.service.js';
import { QueryStatus, QueryPriority } from '@prisma/client';

describe('End-to-End Query Lifecycle & Feedback Suite', () => {
  let queriesService: QueriesService;
  let feedbackService: FeedbackService;
  let mockPrisma: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockEventEmitter = {
      emit: vi.fn(),
    };

    mockPrisma = {
      student: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      queryCategory: {
        findFirst: vi.fn(),
      },
      faculty: {
        findFirst: vi.fn(),
        // findMany used by findLeastLoadedStaff for workload-aware routing
        findMany: vi.fn(),
      },
      employee: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      query: {
        count: vi.fn().mockResolvedValue(41),
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      queryStatusHistory: {
        create: vi.fn(),
      },
      queryAssignment: {
        create: vi.fn(),
      },
      queryFeedback: {
        create: vi.fn(),
        upsert: vi.fn(),
      },
      attachment: {
        updateMany: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    queriesService = new QueriesService(mockPrisma as any, mockEventEmitter as any);
    feedbackService = new FeedbackService(mockPrisma as any);
  });

  it('should create a query, calculate SLA deadline, auto-assign faculty, and emit events', async () => {
    const tenantId = 'tenant-acme';
    const studentUserId = 'user-student-1';

    // student.findFirst is called by queries.service.ts create()
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'student-id-10',
      userId: studentUserId,
      departmentId: 'dept-accounts',
      courseId: 'course-btech',
    });

    mockPrisma.queryCategory.findFirst.mockResolvedValue({
      id: 'cat-fees',
      defaultPriority: QueryPriority.HIGH,
      defaultSlaHours: 24,
      departmentId: 'dept-accounts',
    });

    // faculty.findMany is called by findLeastLoadedStaff
    mockPrisma.faculty.findMany.mockResolvedValue([
      {
        id: 'faculty-id-5',
        userId: 'user-faculty-5',
        maxActiveQueries: 10,
        _count: { queryAssignments: 2 },
      },
    ]);

    mockPrisma.query.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'query-uuid-1', ticketNumber: 'CQ-2026-00042', status: QueryStatus.ASSIGNED, ...data }),
    );

    const query = await queriesService.create(tenantId, studentUserId, {
      categoryId: 'cat-fees',
      departmentId: 'dept-accounts',
      title: 'Fee payment receipt not generated',
      description: 'Transaction deducted but portal says pending dues',
      priority: QueryPriority.HIGH,
    });

    expect(query.ticketNumber).toBe('CQ-2026-00042');
    expect(query.status).toBe(QueryStatus.ASSIGNED);
    expect(mockPrisma.queryAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedToUserId: 'user-faculty-5',
          assignmentType: 'AUTO',
        }),
      }),
    );
    expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'QUERY_CREATED',
        }),
      }),
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('query.created', expect.any(Object));
  });

  it('should transition query to IN_PROGRESS upon staff response', async () => {
    // findOne -> query.findFirst
    mockPrisma.query.findFirst.mockResolvedValue({
      id: 'query-1',
      tenantId: 'tenant-acme',
      ticketNumber: 'CQ-2026-00001',
      status: QueryStatus.ASSIGNED,
      firstRespondedAt: null,
      closedAt: null,
      student: { userId: 'student-user-1' },
      assignments: [],
      statusHistory: [],
      escalations: [],
      attachments: [],
      feedback: null,
    });
    mockPrisma.query.update.mockResolvedValue({
      id: 'query-1',
      status: QueryStatus.IN_PROGRESS,
    });

    const updated = await queriesService.updateStatus(
      'tenant-acme',
      'user-faculty-1',
      'query-1',
      { status: QueryStatus.IN_PROGRESS, remarks: 'Checking bank transaction ledger' },
    );

    expect(updated.status).toBe(QueryStatus.IN_PROGRESS);
    expect(mockPrisma.queryStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          newStatus: QueryStatus.IN_PROGRESS,
        }),
      }),
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('query.status_changed', expect.any(Object));
  });

  it('should allow staff to resolve query with resolution summary', async () => {
    // findOne -> query.findFirst (with student relation needed for notification)
    mockPrisma.query.findFirst.mockResolvedValue({
      id: 'query-1',
      tenantId: 'tenant-acme',
      ticketNumber: 'CQ-2026-00001',
      status: QueryStatus.IN_PROGRESS,
      firstRespondedAt: new Date(),
      closedAt: null,
      student: { userId: 'student-user-1', user: { firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com' } },
      assignments: [],
      statusHistory: [],
      escalations: [],
      attachments: [],
      feedback: null,
    });
    mockPrisma.query.update.mockResolvedValue({
      id: 'query-1',
      status: QueryStatus.RESOLVED,
    });

    const resolved = await queriesService.resolve(
      'tenant-acme',
      'user-faculty-1',
      'query-1',
      { resolutionSummary: 'Receipt generated manually and sent to student email.' },
    );

    expect(resolved.status).toBe(QueryStatus.RESOLVED);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('query.resolved', expect.any(Object));
  });

  it('should record student CSAT feedback and permanently close ticket', async () => {
    mockPrisma.query.findFirst.mockResolvedValue({
      id: 'query-1',
      tenantId: 'tenant-acme',
      ticketNumber: 'CQ-2026-00001',
      status: QueryStatus.RESOLVED,
      student: { userId: 'student-user-1' },
      feedback: null,
      assignments: [],
      statusHistory: [],
      escalations: [],
      attachments: [],
    });

    mockPrisma.queryFeedback.create.mockResolvedValue({
      id: 'feedback-1',
      queryId: 'query-1',
      rating: 5,
      feedbackText: 'Quick turnaround!',
    });

    const feedback = await feedbackService.submit(
      'tenant-acme',
      'student-user-1',
      'query-1',
      { rating: 5, feedbackText: 'Quick turnaround!' },
    );

    expect(feedback.rating).toBe(5);
    expect(mockPrisma.query.update).toHaveBeenCalledWith({
      where: { id: 'query-1' },
      data: expect.objectContaining({ status: QueryStatus.CLOSED }),
    });
  });
});
