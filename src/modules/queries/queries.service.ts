import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { CreateQueryDto } from './dto/create-query.dto.js';
import { UpdateQueryStatusDto } from './dto/update-query-status.dto.js';
import { ResolveQueryDto } from './dto/resolve-query.dto.js';

export const ALLOWED_STATUS_TRANSITIONS: Record<QueryStatus, QueryStatus[]> = {
  [QueryStatus.OPEN]: [
    QueryStatus.ASSIGNED,
    QueryStatus.IN_PROGRESS,
    QueryStatus.CANCELLED,
  ],
  [QueryStatus.ASSIGNED]: [
    QueryStatus.IN_PROGRESS,
    QueryStatus.WAITING_FOR_STUDENT,
    QueryStatus.WAITING_FOR_STAFF,
    QueryStatus.ESCALATED,
    QueryStatus.RESOLVED,
    QueryStatus.CANCELLED,
  ],
  [QueryStatus.IN_PROGRESS]: [
    QueryStatus.WAITING_FOR_STUDENT,
    QueryStatus.WAITING_FOR_STAFF,
    QueryStatus.ESCALATED,
    QueryStatus.RESOLVED,
    QueryStatus.CANCELLED,
  ],
  [QueryStatus.WAITING_FOR_STUDENT]: [
    QueryStatus.IN_PROGRESS,
    QueryStatus.WAITING_FOR_STAFF,
    QueryStatus.RESOLVED,
    QueryStatus.CLOSED,
    QueryStatus.CANCELLED,
  ],
  [QueryStatus.WAITING_FOR_STAFF]: [
    QueryStatus.IN_PROGRESS,
    QueryStatus.WAITING_FOR_STUDENT,
    QueryStatus.ESCALATED,
    QueryStatus.RESOLVED,
    QueryStatus.CANCELLED,
  ],
  [QueryStatus.ESCALATED]: [
    QueryStatus.IN_PROGRESS,
    QueryStatus.ASSIGNED,
    QueryStatus.RESOLVED,
    QueryStatus.CLOSED,
    QueryStatus.CANCELLED,
  ],
  [QueryStatus.RESOLVED]: [
    QueryStatus.CLOSED,
    QueryStatus.REOPENED,
  ],
  [QueryStatus.CLOSED]: [
    QueryStatus.REOPENED,
  ],
  [QueryStatus.REOPENED]: [
    QueryStatus.ASSIGNED,
    QueryStatus.IN_PROGRESS,
    QueryStatus.CANCELLED,
  ],
  [QueryStatus.CANCELLED]: [],
};

@Injectable()
export class QueriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  /**
   * Concurrency-safe ticket creation with workload-aware department auto-routing
   */
  async create(tenantId: string, userId: string, dto: CreateQueryDto) {
    if (this.subscriptionsService) {
      await this.subscriptionsService.assertQuota(tenantId, 'queries');
    }

    // 1. Validate student exists and belongs to tenant
    const student = await this.prisma.student.findFirst({
      where: { userId, tenantId },
      include: { department: true, course: true },
    });

    if (!student) {
      throw new ForbiddenException('Only registered students can create query tickets.');
    }

    // 2. Validate category and department
    const category = await this.prisma.queryCategory.findFirst({
      where: { id: dto.categoryId, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Selected query category not found.');
    }

    const resolvedDeptId = dto.departmentId || category.departmentId || student.departmentId;

    // 3. Workload-aware staff selection: find candidate faculty/staff with lowest active workload
    const candidateStaff = await this.findLeastLoadedStaff(tenantId, resolvedDeptId);

    // 4. Calculate SLA deadline from category or SLA policy
    const slaHours = category.defaultSlaHours || 48;
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    // 5. Atomic multi-record transaction
    return this.prisma.$transaction(async (tx) => {
      const ticketNumber = await this.generateTicketNumber(tx, tenantId);

      const query = await tx.query.create({
        data: {
          tenantId,
          ticketNumber,
          studentId: student.id,
          departmentId: resolvedDeptId,
          categoryId: dto.categoryId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority || category.defaultPriority,
          status: candidateStaff ? QueryStatus.ASSIGNED : QueryStatus.OPEN,
          slaDeadline,
        },
      });

      // Status history entry
      await tx.queryStatusHistory.create({
        data: {
          tenantId,
          queryId: query.id,
          previousStatus: QueryStatus.OPEN,
          newStatus: candidateStaff ? QueryStatus.ASSIGNED : QueryStatus.OPEN,
          changedByUserId: userId,
          remarks: 'Ticket created by student',
        },
      });

      // Assignment entry if staff found
      if (candidateStaff) {
        await tx.queryAssignment.create({
          data: {
            tenantId,
            queryId: query.id,
            assignedToUserId: candidateStaff.userId,
            facultyProfileId: candidateStaff.facultyProfileId || null,
            assignmentType: 'AUTO',
            reason: 'Auto-assigned by workload-balancing algorithm',
          },
        });
      }

      // Link attachments if provided
      if (dto.attachmentIds && dto.attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: dto.attachmentIds }, tenantId },
          data: { queryId: query.id },
        });
      }

      // Outbox event for MongoDB chat sync
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventType: 'QUERY_CREATED',
          aggregateId: query.id,
          payload: {
            queryId: query.id,
            ticketNumber: query.ticketNumber,
            studentUserId: userId,
            assignedToUserId: candidateStaff?.userId || null,
            title: query.title,
            description: query.description,
          },
        },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'QUERY_CREATED',
          entityName: 'Query',
          entityId: query.id,
          newValues: {
            ticketNumber: query.ticketNumber,
            priority: query.priority,
            assignedToUserId: candidateStaff?.userId || null,
          },
        },
      });

      // Notification to student
      await tx.notification.create({
        data: {
          tenantId,
          userId,
          title: `Ticket Created: ${query.ticketNumber}`,
          body: `Your query "${query.title}" has been created and assigned to support staff.`,
          linkUrl: `/queries/${query.id}`,
        },
      });

      // Notification to staff if assigned
      if (candidateStaff) {
        await tx.notification.create({
          data: {
            tenantId,
            userId: candidateStaff.userId,
            title: `New Query Assigned: ${query.ticketNumber}`,
            body: `You have been assigned ticket "${query.title}".`,
            linkUrl: `/queries/${query.id}`,
          },
        });
      }

      this.eventEmitter.emit('query.created', {
        tenantId,
        queryId: query.id,
        ticketNumber: query.ticketNumber,
        assignedToUserId: candidateStaff?.userId,
      });

      return query;
    });
  }

  /**
   * Explicit Allowed Status Transitions Enforcement (State Machine)
   */
  async updateStatus(tenantId: string, userId: string, id: string, dto: UpdateQueryStatusDto) {
    const query = await this.findOne(tenantId, id);

    // State machine transition validation
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[query.status] || [];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: Cannot transition query from '${query.status}' to '${dto.status}'. Allowed transitions: [${allowedTransitions.join(', ')}]`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: dto.status,
      };

      // Set firstRespondedAt timestamp on first staff response / in-progress
      if (
        (dto.status === QueryStatus.IN_PROGRESS || dto.status === QueryStatus.WAITING_FOR_STUDENT) &&
        !query.firstRespondedAt
      ) {
        updateData.firstRespondedAt = new Date();
      }

      if (dto.status === QueryStatus.CLOSED && !query.closedAt) {
        updateData.closedAt = new Date();
      }

      const updated = await tx.query.update({
        where: { id },
        data: updateData,
      });

      await tx.queryStatusHistory.create({
        data: {
          tenantId,
          queryId: id,
          previousStatus: query.status,
          newStatus: dto.status,
          changedByUserId: userId,
          remarks: dto.remarks || null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'QUERY_STATUS_CHANGED',
          entityName: 'Query',
          entityId: id,
          oldValues: { status: query.status },
          newValues: { status: dto.status, remarks: dto.remarks },
        },
      });

      this.eventEmitter.emit('query.status_changed', {
        tenantId,
        queryId: id,
        ticketNumber: query.ticketNumber,
        oldStatus: query.status,
        newStatus: dto.status,
      });

      return updated;
    });
  }

  /**
   * Staff Resolves Ticket with Resolution Summary
   */
  async resolve(tenantId: string, userId: string, id: string, dto: ResolveQueryDto) {
    const query = await this.findOne(tenantId, id);

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[query.status] || [];
    if (!allowedTransitions.includes(QueryStatus.RESOLVED)) {
      throw new BadRequestException(
        `Invalid transition: Cannot resolve ticket currently in '${query.status}' state.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const resolved = await tx.query.update({
        where: { id },
        data: {
          status: QueryStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });

      await tx.queryStatusHistory.create({
        data: {
          tenantId,
          queryId: id,
          previousStatus: query.status,
          newStatus: QueryStatus.RESOLVED,
          changedByUserId: userId,
          remarks: dto.resolutionSummary,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'QUERY_RESOLVED',
          entityName: 'Query',
          entityId: id,
          newValues: { resolutionSummary: dto.resolutionSummary },
        },
      });

      // Notification to student
      await tx.notification.create({
        data: {
          tenantId,
          userId: query.student.userId,
          title: `Ticket Resolved: ${query.ticketNumber}`,
          body: `Your query has been resolved: "${dto.resolutionSummary}". Please rate your experience.`,
          linkUrl: `/queries/${query.id}`,
        },
      });

      this.eventEmitter.emit('query.resolved', {
        tenantId,
        queryId: id,
        studentUserId: query.student.userId,
      });

      return resolved;
    });
  }

  /**
   * Student Submits Feedback (Transitions to CLOSED)
   */
  async submitFeedback(
    tenantId: string,
    studentUserId: string,
    id: string,
    rating: number,
    feedbackText?: string,
  ) {
    const query = await this.findOne(tenantId, id);

    if (query.student.userId !== studentUserId) {
      throw new ForbiddenException('Only the student who raised this ticket can submit feedback.');
    }

    if (query.status !== QueryStatus.RESOLVED && query.status !== QueryStatus.CLOSED) {
      throw new BadRequestException('Feedback can only be provided for resolved or closed tickets.');
    }

    return this.prisma.$transaction(async (tx) => {
      const feedback = await tx.queryFeedback.upsert({
        where: { queryId: id },
        create: {
          tenantId,
          queryId: id,
          rating,
          feedbackText: feedbackText || null,
        },
        update: {
          rating,
          feedbackText: feedbackText || null,
        },
      });

      // Close query automatically after feedback if still in RESOLVED status
      if (query.status === QueryStatus.RESOLVED) {
        await tx.query.update({
          where: { id },
          data: { status: QueryStatus.CLOSED, closedAt: new Date() },
        });

        await tx.queryStatusHistory.create({
          data: {
            tenantId,
            queryId: id,
            previousStatus: QueryStatus.RESOLVED,
            newStatus: QueryStatus.CLOSED,
            changedByUserId: studentUserId,
            remarks: 'Ticket closed upon student feedback submission',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: studentUserId,
          action: 'QUERY_FEEDBACK_SUBMITTED',
          entityName: 'QueryFeedback',
          entityId: feedback.id,
          newValues: { rating, feedbackText },
        },
      });

      return feedback;
    });
  }

  async findAll(
    tenantId: string,
    userId: string,
    userType: string,
    options: {
      status?: QueryStatus;
      priority?: string;
      departmentId?: string;
      categoryId?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { status, priority, departmentId, categoryId, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (departmentId) where.departmentId = departmentId;
    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role-scoped visibility
    if (userType === 'STUDENT') {
      const student = await this.prisma.student.findUnique({ where: { userId } });
      where.studentId = student?.id;
    } else if (
      userType === 'FACULTY' ||
      userType === 'RECEPTION_STAFF' ||
      userType === 'ACCOUNTS_STAFF' ||
      userType === 'EXAMINATION_STAFF' ||
      userType === 'SUPPORT_STAFF'
    ) {
      where.assignments = {
        some: {
          assignedToUserId: userId,
          unassignedAt: null,
        },
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.query.count({ where }),
      this.prisma.query.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          department: { select: { id: true, name: true, code: true } },
          category: { select: { id: true, name: true, slug: true } },
          assignments: {
            where: { unassignedAt: null },
            include: { assignedToUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const query = await this.prisma.query.findFirst({
      where: { id, tenantId },
      include: {
        student: { include: { user: true, course: true, department: true } },
        department: true,
        category: true,
        assignments: {
          include: { assignedToUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { assignedAt: 'desc' },
        },
        statusHistory: {
          include: { changedByUser: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { changedAt: 'desc' },
        },
        escalations: {
          include: { escalatedToUser: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { escalatedAt: 'desc' },
        },
        attachments: true,
        feedback: true,
      },
    });

    if (!query) {
      throw new NotFoundException(`Query ticket '${id}' not found.`);
    }

    return query;
  }

  /**
   * Concurrency-safe ticket number generator
   */
  private async generateTicketNumber(tx: any, tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.query.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });
    const sequence = (count + 1).toString().padStart(5, '0');
    return `CQ-${year}-${sequence}`;
  }

  /**
   * Workload-Aware Auto-Assignment Selection
   */
  private async findLeastLoadedStaff(
    tenantId: string,
    departmentId: string,
  ): Promise<{ userId: string; facultyProfileId?: string } | null> {
    // 1. Look for least-loaded faculty in the department
    const candidateFaculty = await this.prisma.faculty.findMany({
      where: { tenantId, departmentId },
      include: {
        _count: {
          select: { queryAssignments: { where: { unassignedAt: null } } },
        },
      },
    });

    if (candidateFaculty.length > 0) {
      // Filter out faculty members who have exceeded their max workload
      const available = candidateFaculty.filter(
        (f) => f._count.queryAssignments < f.maxActiveQueries,
      );

      const pool = available.length > 0 ? available : candidateFaculty;
      // Sort ascending by current active workload
      pool.sort((a, b) => a._count.queryAssignments - b._count.queryAssignments);
      return { userId: pool[0].userId, facultyProfileId: pool[0].id };
    }

    // 2. Fallback to staff employee in department
    const candidateEmployee = await this.prisma.employee.findFirst({
      where: { tenantId, departmentId },
    });

    if (candidateEmployee) {
      return { userId: candidateEmployee.userId };
    }

    return null;
  }
}
