// ==============================================================================
// CollegeQuery SaaS — Notifications BullMQ Processor
// ==============================================================================

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../core/database/prisma.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationPayload } from './notifications.service.js';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<NotificationPayload>): Promise<{ delivered: boolean }> {
    const { tenantId, userId, title, body, linkUrl } = job.data;

    this.logger.log(
      `[Notification Processor] Job ${job.id} | User: ${userId} | "${title}"`,
    );

    // 1. Persist to PostgreSQL
    const notification = await this.prisma.notification.create({
      data: { tenantId, userId, title, body, linkUrl },
    });

    // 2. Emit real-time push event (picked up by MessagingGateway)
    this.eventEmitter.emit('notification.created', {
      tenantId,
      userId,
      notification: {
        id: notification.id,
        title,
        body,
        linkUrl,
        isRead: false,
        createdAt: notification.createdAt,
      },
    });

    return { delivered: true };
  }
}
