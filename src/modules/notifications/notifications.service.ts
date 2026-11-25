// ==============================================================================
// CollegeQuery SaaS — Notifications Service (Full Implementation)
// In-app notifications with preferences, BullMQ queue, event-driven delivery,
// bulk operations, and real-time push via Socket.IO events.
// ==============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service.js';

export interface NotificationPayload {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  linkUrl?: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationPreferenceDto {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  queryUpdates?: boolean;
  newMessages?: boolean;
  slaAlerts?: boolean;
  billingAlerts?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('notifications') private readonly notificationQueue: Queue<NotificationPayload>,
  ) {}

  // ---------------------------------------------------------------------------
  // Notification Preferences
  // ---------------------------------------------------------------------------

  async getPreferences(tenantId: string, userId: string) {
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: { tenantId, userId },
      });
    }

    return pref;
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        tenantId,
        userId,
        ...dto,
      },
      update: dto,
    });
  }

  async isCategoryEnabled(userId: string, type?: string): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!pref) return true; // Default enabled if no explicit preference set
    if (!pref.inAppEnabled) return false;

    if (type === 'QUERY_ASSIGNED' || type === 'STATUS_CHANGED' || type === 'QUERY_RESOLVED') {
      return pref.queryUpdates;
    }
    if (type === 'NEW_MESSAGE') return pref.newMessages;
    if (type === 'SLA_BREACH') return pref.slaAlerts;
    if (type === 'BILLING') return pref.billingAlerts;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Core Notification Creation
  // ---------------------------------------------------------------------------

  async create(
    tenantId: string,
    userId: string,
    title: string,
    body: string,
    linkUrl?: string,
    type?: string,
  ) {
    const enabled = await this.isCategoryEnabled(userId, type);
    if (!enabled) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: { tenantId, userId, title, body, linkUrl },
    });

    // Push real-time notification via Socket.IO
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

    return notification;
  }

  // ---------------------------------------------------------------------------
  // Queue-Based Async Delivery (BullMQ)
  // ---------------------------------------------------------------------------

  async dispatch(payload: NotificationPayload) {
    const enabled = await this.isCategoryEnabled(payload.userId, payload.type);
    if (!enabled) return;

    await this.notificationQueue.add('deliver', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 500,
    });
  }

  async dispatchBulk(payloads: NotificationPayload[]) {
    if (!payloads.length) return;

    const jobs = payloads.map((payload) => ({
      name: 'deliver' as const,
      data: payload,
      opts: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 500,
      },
    }));

    await this.notificationQueue.addBulk(jobs);
  }

  // ---------------------------------------------------------------------------
  // User Notifications Feed
  // ---------------------------------------------------------------------------

  async findForUser(
    tenantId: string,
    userId: string,
    options: { limit?: number; unreadOnly?: boolean; page?: number } = {},
  ) {
    const { limit = 20, unreadOnly = false, page = 1 } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, userId };
    if (unreadOnly) where.isRead = false;

    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount },
    };
  }

  // ---------------------------------------------------------------------------
  // Read / Unread Management
  // ---------------------------------------------------------------------------

  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found.');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
    return { markedCount: result.count };
  }

  async deleteNotification(tenantId: string, userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found.');

    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Event-Driven Listeners — Auto-generate in-app notifications
  // ---------------------------------------------------------------------------

  @OnEvent('query.created')
  async onQueryCreated(payload: {
    tenantId: string;
    queryId: string;
    ticketNumber: string;
    assignedToUserId?: string;
    studentUserId: string;
  }) {
    if (payload.assignedToUserId) {
      await this.dispatch({
        tenantId: payload.tenantId,
        userId: payload.assignedToUserId,
        title: `New Ticket: ${payload.ticketNumber}`,
        body: `A new support ticket has been assigned to you.`,
        linkUrl: `/queries/${payload.queryId}`,
        type: 'QUERY_ASSIGNED',
      });
    }
  }

  @OnEvent('query.status_changed')
  async onStatusChanged(payload: {
    tenantId: string;
    queryId: string;
    ticketNumber: string;
    newStatus: string;
    studentUserId?: string;
  }) {
    if (payload.studentUserId) {
      await this.dispatch({
        tenantId: payload.tenantId,
        userId: payload.studentUserId,
        title: `Ticket Update: ${payload.ticketNumber}`,
        body: `Your query status has been updated to "${payload.newStatus}".`,
        linkUrl: `/queries/${payload.queryId}`,
        type: 'STATUS_CHANGED',
      });
    }
  }

  @OnEvent('query.resolved')
  async onQueryResolved(payload: {
    tenantId: string;
    queryId: string;
    studentUserId: string;
    ticketNumber?: string;
  }) {
    await this.dispatch({
      tenantId: payload.tenantId,
      userId: payload.studentUserId,
      title: 'Your Query Has Been Resolved',
      body: 'Your support ticket has been resolved. Please rate your experience.',
      linkUrl: `/queries/${payload.queryId}`,
      type: 'QUERY_RESOLVED',
    });
  }

  @OnEvent('chat.message_sent')
  async onMessageSent(payload: {
    tenantId: string;
    queryId: string;
    message: { sender: { userId: string; fullName: string }; messageType: string; content: string };
  }) {
    if (payload.message.messageType === 'INTERNAL_NOTE') return;
  }
}
