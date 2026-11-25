import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service.js';
import { QueryStatus, EscalationTrigger } from '@prisma/client';

@Injectable()
export class SlaMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlaMonitorService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Run SLA breach check every 60 seconds
    this.timer = setInterval(() => this.checkBreachesAndEscalate(), 60000);
    this.logger.log('✅ SLA Monitoring & Auto-Escalation service initialized.');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async checkBreachesAndEscalate(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;

    try {
      const now = new Date();

      // Find all queries that have breached their SLA deadline
      const breachedQueries = await this.prisma.query.findMany({
        where: {
          status: { in: [QueryStatus.OPEN, QueryStatus.ASSIGNED, QueryStatus.IN_PROGRESS] },
          slaDeadline: { lt: now },
          isEscalated: false,
        },
        include: {
          department: true,
          category: true,
        },
        take: 100,
      });

      if (breachedQueries.length === 0) {
        return 0;
      }

      this.logger.warn(`Found ${breachedQueries.length} SLA-breached queries requiring automated escalation.`);

      for (const query of breachedQueries) {
        await this.escalateBreachedQuery(query);
      }

      return breachedQueries.length;
    } catch (err: any) {
      this.logger.error(`Error during SLA breach check: ${err.message}`, err.stack);
      return 0;
    } finally {
      this.isRunning = false;
    }
  }

  private async escalateBreachedQuery(query: any) {
    const tenantId = query.tenantId;

    // 1. Identify escalation target (Default to Department HOD or College Admin)
    let targetUserId = query.department?.hodUserId;

    if (!targetUserId) {
      const collegeAdmin = await this.prisma.user.findFirst({
        where: { tenantId, userType: 'COLLEGE_ADMIN', isActive: true },
      });
      targetUserId = collegeAdmin?.id;
    }

    if (!targetUserId) {
      this.logger.error(`Cannot escalate Query '${query.ticketNumber}': No HOD or College Admin found for tenant '${tenantId}'.`);
      return;
    }

    const nextLevel = query.escalationLevel + 1;

    await this.prisma.$transaction(async (tx) => {
      // 1. Record escalation
      await tx.queryEscalation.create({
        data: {
          tenantId,
          queryId: query.id,
          fromLevel: query.escalationLevel,
          toLevel: nextLevel,
          triggerReason: EscalationTrigger.SLA_BREACH,
          escalatedToUserId: targetUserId,
          escalationNotes: `Automated SLA breach trigger: Resolution deadline (${query.slaDeadline?.toISOString()}) exceeded.`,
        },
      });

      // 2. Update query status
      await tx.query.update({
        where: { id: query.id },
        data: {
          isEscalated: true,
          escalationLevel: nextLevel,
          status: QueryStatus.ESCALATED,
        },
      });

      // 3. Add to status history
      await tx.queryStatusHistory.create({
        data: {
          tenantId,
          queryId: query.id,
          previousStatus: query.status,
          newStatus: QueryStatus.ESCALATED,
          changedByUserId: null, // System-triggered
          remarks: `Automated escalation to level ${nextLevel} due to SLA breach.`,
        },
      });

      // 4. Record notification
      await tx.notification.create({
        data: {
          tenantId,
          userId: targetUserId,
          title: `⚠️ SLA Breach Alert: ${query.ticketNumber}`,
          body: `Ticket "${query.title}" has breached its SLA deadline and has been automatically escalated to you.`,
          linkUrl: `/queries/${query.id}`,
        },
      });

      this.logger.log(`[SLA ESCALATION] Ticket '${query.ticketNumber}' escalated to Level ${nextLevel} (Assigned to user: ${targetUserId})`);
    });

    // 5. Emit real-time event
    this.eventEmitter.emit('query.escalated', {
      tenantId,
      queryId: query.id,
      ticketNumber: query.ticketNumber,
      level: nextLevel,
      escalatedToUserId: targetUserId,
      reason: 'SLA_BREACH',
    });
  }
}
