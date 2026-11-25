import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryPriority, QueryStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto.js';

export const DEFAULT_SLA_POLICIES = [
  { priority: QueryPriority.URGENT, name: 'Urgent Priority Policy', firstResponseHours: 2, resolutionHours: 8, escalateOnBreach: true },
  { priority: QueryPriority.HIGH, name: 'High Priority Policy', firstResponseHours: 4, resolutionHours: 24, escalateOnBreach: true },
  { priority: QueryPriority.MEDIUM, name: 'Medium Priority Policy', firstResponseHours: 12, resolutionHours: 48, escalateOnBreach: true },
  { priority: QueryPriority.LOW, name: 'Low Priority Policy', firstResponseHours: 24, resolutionHours: 72, escalateOnBreach: false },
];

@Injectable()
export class SlaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSlaPolicyDto, actorId?: string) {
    const existing = await this.prisma.sLAPolicy.findFirst({
      where: { tenantId, priority: dto.priority },
    });
    if (existing) {
      throw new ConflictException(`SLA policy for priority '${dto.priority}' already exists.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const policy = await tx.sLAPolicy.create({
        data: {
          tenantId,
          name: dto.name,
          priority: dto.priority,
          firstResponseHours: dto.firstResponseHours,
          resolutionHours: dto.resolutionHours,
          escalateOnBreach: dto.escalateOnBreach ?? true,
          isActive: dto.isActive ?? true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'SLA_POLICY_CREATED',
          entityName: 'SLAPolicy',
          entityId: policy.id,
          newValues: { priority: policy.priority, resolutionHours: policy.resolutionHours },
        },
      });

      return policy;
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.sLAPolicy.findMany({
      where: { tenantId },
      orderBy: { priority: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const policy = await this.prisma.sLAPolicy.findFirst({
      where: { id, tenantId },
    });
    if (!policy) {
      throw new NotFoundException(`SLA policy '${id}' not found.`);
    }
    return policy;
  }

  /**
   * Seed standard SLA policies for all 4 priorities
   */
  async seedDefaultPolicies(tenantId: string, actorId?: string) {
    const created: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const p of DEFAULT_SLA_POLICIES) {
        const existing = await tx.sLAPolicy.findFirst({
          where: { tenantId, priority: p.priority },
        });

        if (!existing) {
          const policy = await tx.sLAPolicy.create({
            data: {
              tenantId,
              ...p,
            },
          });
          created.push(policy);
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'DEFAULT_SLA_POLICIES_SEEDED',
          entityName: 'SLAPolicy',
          entityId: tenantId,
          newValues: { count: created.length },
        },
      });
    });

    return { success: true, count: created.length, policies: created };
  }

  /**
   * Track SLA Performance Metrics across all tickets in a tenant
   */
  async getMetrics(tenantId: string) {
    const [totalQueries, resolvedQueries, breachedQueries] = await Promise.all([
      this.prisma.query.count({ where: { tenantId } }),
      this.prisma.query.findMany({
        where: { tenantId, status: { in: [QueryStatus.RESOLVED, QueryStatus.CLOSED] } },
        select: { createdAt: true, firstRespondedAt: true, resolvedAt: true, slaDeadline: true },
      }),
      this.prisma.query.count({
        where: {
          tenantId,
          OR: [
            { isEscalated: true },
            {
              status: { in: [QueryStatus.OPEN, QueryStatus.ASSIGNED, QueryStatus.IN_PROGRESS] },
              slaDeadline: { lt: new Date() },
            },
          ],
        },
      }),
    ]);

    // Calculate Average First Response Time (in hours)
    let totalFirstResponseMs = 0;
    let firstResponseCount = 0;

    // Calculate Average Resolution Time (in hours)
    let totalResolutionMs = 0;
    let resolutionCount = 0;

    for (const q of resolvedQueries) {
      if (q.firstRespondedAt) {
        totalFirstResponseMs += q.firstRespondedAt.getTime() - q.createdAt.getTime();
        firstResponseCount++;
      }
      if (q.resolvedAt) {
        totalResolutionMs += q.resolvedAt.getTime() - q.createdAt.getTime();
        resolutionCount++;
      }
    }

    const avgFirstResponseHours =
      firstResponseCount > 0
        ? parseFloat((totalFirstResponseMs / (firstResponseCount * 3600000)).toFixed(1))
        : 0;

    const avgResolutionHours =
      resolutionCount > 0
        ? parseFloat((totalResolutionMs / (resolutionCount * 3600000)).toFixed(1))
        : 0;

    const complianceRate =
      totalQueries > 0
        ? parseFloat((((totalQueries - breachedQueries) / totalQueries) * 100).toFixed(1))
        : 100;

    return {
      totalQueries,
      resolvedQueries: resolvedQueries.length,
      breachedQueries,
      complianceRate: `${complianceRate}%`,
      avgFirstResponseHours,
      avgResolutionHours,
    };
  }
}
