import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  Conversation,
  ConversationDocument,
  ActivityEvent,
  ActivityEventDocument,
} from '../conversations/schemas/index.js';

@Injectable()
export class OutboxRelayerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(ActivityEvent.name)
    private readonly activityModel: Model<ActivityEventDocument>,
  ) {}

  onModuleInit() {
    // Run outbox relayer worker every 5 seconds
    this.timer = setInterval(() => this.processOutboxBatch(), 5000);
    this.logger.log('✅ Transactional Outbox Relayer service started.');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async processOutboxBatch(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: { isProcessed: false },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      if (pendingEvents.length === 0) {
        this.isProcessing = false;
        return 0;
      }

      for (const event of pendingEvents) {
        try {
          await this.relayEvent(event);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { isProcessed: true, processedAt: new Date() },
          });
        } catch (err: any) {
          this.logger.error(`Failed to relay outbox event '${event.id}': ${err.message}`, err.stack);
        }
      }

      return pendingEvents.length;
    } finally {
      this.isProcessing = false;
    }
  }

  private async relayEvent(event: any) {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    if (event.eventType === 'QUERY_CREATED') {
      const { queryId, ticketNumber, studentUserId, assignedToUserId, title } = payload;
      const tenantId = event.tenantId;

      // 1. Idempotently upsert conversation in MongoDB
      const participants = [studentUserId];
      if (assignedToUserId) participants.push(assignedToUserId);

      await this.conversationModel.updateOne(
        { tenantId, queryId },
        {
          $setOnInsert: {
            tenantId,
            queryId,
            ticketNumber,
            status: 'OPEN',
            participantUserIds: participants,
            unreadCounts: new Map(),
            totalMessages: 0,
            totalInternalNotes: 0,
          },
        },
        { upsert: true },
      );

      // 2. Insert initial activity timeline event in MongoDB
      await this.activityModel.create({
        tenantId,
        queryId,
        eventType: 'QUERY_CREATED',
        actor: {
          userId: studentUserId,
          fullName: 'Student',
          roleCode: 'STUDENT',
        },
        payload: {
          ticketNumber,
          title,
        },
      });

      this.logger.log(`[OUTBOX SYNC] Successfully synchronized Query '${ticketNumber}' (${queryId}) to MongoDB.`);
    }
  }
}
