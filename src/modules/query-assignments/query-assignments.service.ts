import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssignmentType, QueryStatus, EscalationTrigger } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { AssignQueryDto } from './dto/assign-query.dto.js';

@Injectable()
export class QueryAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Manual Staff Assignment or Reassignment
   */
  async assign(tenantId: string, assignedByUserId: string, queryId: string, dto: AssignQueryDto) {
    const query = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
    });
    if (!query) {
      throw new NotFoundException(`Query ticket '${queryId}' not found.`);
    }

    if (query.status === QueryStatus.RESOLVED || query.status === QueryStatus.CLOSED || query.status === QueryStatus.CANCELLED) {
      throw new BadRequestException(`Cannot assign query in terminal '${query.status}' status.`);
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: dto.assignedToUserId, tenantId },
      include: { facultyProfile: true, employeeProfile: true },
    });
    if (!targetUser) {
      throw new NotFoundException(`Target staff user '${dto.assignedToUserId}' not found in this college.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Unassign any existing active assignments
      await tx.queryAssignment.updateMany({
        where: { queryId, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });

      // 2. Create new assignment
      const assignment = await tx.queryAssignment.create({
        data: {
          tenantId,
          queryId,
          assignedToUserId: dto.assignedToUserId,
          assignedByUserId,
          facultyProfileId: targetUser.facultyProfile?.id || null,
          assignmentType: AssignmentType.MANUAL,
          reason: dto.reason || 'Manually assigned by department administrator',
        },
        include: {
          assignedToUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      // 3. Update query status to ASSIGNED if currently OPEN
      if (query.status === QueryStatus.OPEN) {
        await tx.query.update({
          where: { id: queryId },
          data: { status: QueryStatus.ASSIGNED },
        });

        await tx.queryStatusHistory.create({
          data: {
            tenantId,
            queryId,
            previousStatus: QueryStatus.OPEN,
            newStatus: QueryStatus.ASSIGNED,
            changedByUserId: assignedByUserId,
            remarks: `Ticket assigned to ${targetUser.firstName} ${targetUser.lastName}`,
          },
        });
      }

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: assignedByUserId,
          action: 'QUERY_ASSIGNED',
          entityName: 'QueryAssignment',
          entityId: assignment.id,
          newValues: {
            queryId,
            assignedToUserId: dto.assignedToUserId,
            reason: dto.reason,
          },
        },
      });

      // 5. Notification to assigned staff
      await tx.notification.create({
        data: {
          tenantId,
          userId: dto.assignedToUserId,
          title: `Query Assigned: ${query.ticketNumber}`,
          body: `Ticket "${query.title}" has been assigned to you.`,
          linkUrl: `/queries/${query.id}`,
        },
      });

      this.eventEmitter.emit('query.assigned', {
        tenantId,
        queryId,
        ticketNumber: query.ticketNumber,
        assignedToUserId: dto.assignedToUserId,
        assignedByUserId,
      });

      return assignment;
    });
  }

  /**
   * Automatic Workload-Aware Reassignment
   */
  async autoAssign(tenantId: string, queryId: string, actorId?: string) {
    const query = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
      include: { department: true },
    });
    if (!query) {
      throw new NotFoundException(`Query '${queryId}' not found.`);
    }

    // Find candidate faculty in department sorted by active assignments
    const candidates = await this.prisma.faculty.findMany({
      where: { tenantId, departmentId: query.departmentId },
      include: {
        _count: { select: { queryAssignments: { where: { unassignedAt: null } } } },
      },
      orderBy: { queryAssignments: { _count: 'asc' } },
    });

    if (candidates.length === 0) {
      throw new BadRequestException('No eligible faculty available in this department for auto-assignment.');
    }

    const selected = candidates[0];

    return this.assign(tenantId, actorId || selected.userId, queryId, {
      assignedToUserId: selected.userId,
      reason: `Workload-balanced auto-assignment (active load: ${selected._count.queryAssignments}/${selected.maxActiveQueries})`,
    });
  }

  /**
   * Manual Query Escalation (HOD / College Admin)
   */
  async escalate(
    tenantId: string,
    userId: string,
    queryId: string,
    reason: string,
    targetUserId?: string,
  ) {
    const query = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
      include: { department: true },
    });
    if (!query) {
      throw new NotFoundException(`Query '${queryId}' not found.`);
    }

    // Default target: department HOD or college admin
    let resolvedTargetId: string | undefined = targetUserId || query.department?.hodUserId || undefined;
    if (!resolvedTargetId) {
      const admin = await this.prisma.user.findFirst({
        where: { tenantId, userType: 'COLLEGE_ADMIN', isActive: true },
      });
      resolvedTargetId = admin?.id;
    }

    if (!resolvedTargetId) {
      throw new BadRequestException('No escalation authority (HOD or Administrator) found.');
    }

    const nextLevel = query.escalationLevel + 1;
    const finalTargetUserId: string = resolvedTargetId;

    return this.prisma.$transaction(async (tx) => {
      // 1. Record escalation
      const escalation = await tx.queryEscalation.create({
        data: {
          tenantId,
          queryId,
          fromLevel: query.escalationLevel,
          toLevel: nextLevel,
          triggerReason: EscalationTrigger.MANUAL_STAFF,
          escalatedToUserId: finalTargetUserId,
          escalationNotes: reason,
        },
      });

      // 2. Update query
      await tx.query.update({
        where: { id: queryId },
        data: {
          isEscalated: true,
          escalationLevel: nextLevel,
          status: QueryStatus.ESCALATED,
        },
      });

      // 3. Status history
      await tx.queryStatusHistory.create({
        data: {
          tenantId,
          queryId,
          previousStatus: query.status,
          newStatus: QueryStatus.ESCALATED,
          changedByUserId: userId,
          remarks: `Manual escalation to level ${nextLevel}: ${reason}`,
        },
      });

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'QUERY_ESCALATED',
          entityName: 'QueryEscalation',
          entityId: escalation.id,
          newValues: { level: nextLevel, reason, escalatedToUserId: resolvedTargetId },
        },
      });

      return escalation;
    });
  }

  /**
   * Get Query Assignment History
   */
  async getHistory(tenantId: string, queryId: string) {
    return this.prisma.queryAssignment.findMany({
      where: { queryId, tenantId },
      include: {
        assignedToUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }
}
