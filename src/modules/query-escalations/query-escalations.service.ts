import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service.js';
import { EscalateQueryDto } from './dto/escalate-query.dto.js';
import { QueryStatus } from '@prisma/client';

@Injectable()
export class QueryEscalationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async escalate(tenantId: string, queryId: string, dto: EscalateQueryDto) {
    const query = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
    });
    if (!query) {
      throw new NotFoundException(`Query '${queryId}' not found.`);
    }

    const currentLevel = query.escalationLevel;
    const nextLevel = currentLevel + 1;

    return this.prisma.$transaction(async (tx) => {
      const escalation = await tx.queryEscalation.create({
        data: {
          tenantId,
          queryId,
          fromLevel: currentLevel,
          toLevel: nextLevel,
          triggerReason: dto.triggerReason,
          escalatedToUserId: dto.escalatedToUserId,
          escalationNotes: dto.notes,
        },
      });

      await tx.query.update({
        where: { id: queryId },
        data: {
          isEscalated: true,
          escalationLevel: nextLevel,
          status: QueryStatus.ESCALATED,
        },
      });

      await tx.queryStatusHistory.create({
        data: {
          tenantId,
          queryId,
          previousStatus: query.status,
          newStatus: QueryStatus.ESCALATED,
          changedByUserId: dto.escalatedToUserId,
          remarks: `Escalated to level ${nextLevel}: ${dto.notes || 'No notes provided'}`,
        },
      });

      this.eventEmitter.emit('query.escalated', {
        tenantId,
        queryId,
        level: nextLevel,
        escalatedToUserId: dto.escalatedToUserId,
      });

      return escalation;
    });
  }
}
