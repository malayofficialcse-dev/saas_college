import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Types } from 'mongoose';
import { ConversationsService } from '../src/modules/conversations/conversations.service.js';
import { MessagingGateway } from '../src/modules/messaging/messaging.gateway.js';
import { AttachmentsService } from '../src/modules/attachments/attachments.service.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';
import { NotificationsProcessor } from '../src/modules/notifications/notifications.processor.js';
import { EmailService } from '../src/modules/email/email.service.js';
import { EmailProcessor } from '../src/modules/email/email.processor.js';

describe('Complete Real-Time Communication System', () => {
  // ---------------------------------------------------------------------------
  // 1. Conversations & Messaging (MongoDB + Participant Isolation)
  // ---------------------------------------------------------------------------
  describe('Conversations & Messaging', () => {
    let service: ConversationsService;
    let mockConvModel: any;
    let mockMsgModel: any;
    let mockActivityModel: any;
    let mockPrisma: any;
    let mockEventEmitter: any;

    beforeEach(() => {
      mockEventEmitter = { emit: vi.fn() };
      mockPrisma = {
        query: { findFirst: vi.fn() },
        attachment: { findMany: vi.fn().mockResolvedValue([]) },
      };
      mockConvModel = {
        findOne: vi.fn(),
        create: vi.fn(),
        updateOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
      };
      mockMsgModel = {
        create: vi.fn(),
        find: vi.fn(),
        findOne: vi.fn().mockResolvedValue(null),
        countDocuments: vi.fn(),
        updateMany: vi.fn(),
        updateOne: vi.fn(),
      };
      mockActivityModel = { create: vi.fn() };

      service = new ConversationsService(
        mockConvModel,
        mockMsgModel,
        mockActivityModel,
        mockPrisma,
        mockEventEmitter,
      );
    });

    it('should block a student from posting in another student ticket', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-1',
        ticketNumber: 'CQ-2026-00001',
        student: { userId: 'student-owner' },
        assignments: [],
      });

      await expect(
        service.postMessage(
          'tenant-a',
          'query-1',
          { userId: 'other-student', fullName: 'Intruder', roleCode: 'STUDENT' },
          { messageType: 'PUBLIC_REPLY', content: 'Hello' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block a student from posting INTERNAL_NOTE', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-1',
        ticketNumber: 'CQ-2026-00001',
        student: { userId: 'student-owner' },
        assignments: [],
      });

      await expect(
        service.postMessage(
          'tenant-a',
          'query-1',
          { userId: 'student-owner', fullName: 'Student', roleCode: 'STUDENT' },
          { messageType: 'INTERNAL_NOTE', content: 'Secret' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent duplicate message creation within 2-second idempotency window', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-1',
        ticketNumber: 'CQ-2026-00001',
        student: { userId: 'student-1' },
        assignments: [],
      });
      mockConvModel.findOne.mockResolvedValue({
        _id: 'conv-1',
        tenantId: 'tenant-a',
        queryId: 'query-1',
        participantUserIds: [],
      });
      const existingMsg = { _id: 'msg-existing', content: 'Same content' };
      mockMsgModel.findOne.mockResolvedValue(existingMsg);

      const res = await service.postMessage(
        'tenant-a',
        'query-1',
        { userId: 'student-1', fullName: 'Alice', roleCode: 'STUDENT' },
        { messageType: 'PUBLIC_REPLY', content: 'Same content' },
      );

      expect(res).toBe(existingMsg);
      expect(mockMsgModel.create).not.toHaveBeenCalled();
    });

    it('should enforce 15-minute edit window and sender-only edit policy', async () => {
      const msgId = new Types.ObjectId().toHexString();

      // Case 1: Different user tries to edit
      mockMsgModel.findOne.mockResolvedValue({
        _id: msgId,
        sender: { userId: 'author-1' },
        createdAt: new Date(),
        save: vi.fn(),
      });

      await expect(
        service.editMessage('tenant-a', 'query-1', msgId, 'other-user', { content: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);

      // Case 2: Author tries to edit after 16 minutes
      mockMsgModel.findOne.mockResolvedValue({
        _id: msgId,
        sender: { userId: 'author-1' },
        createdAt: new Date(Date.now() - 16 * 60 * 1000),
        save: vi.fn(),
      });

      await expect(
        service.editMessage('tenant-a', 'query-1', msgId, 'author-1', { content: 'Too late' }),
      ).rejects.toThrow(BadRequestException);

      // Case 3: Author edits within 15 minutes
      const saveFn = vi.fn();
      mockMsgModel.findOne.mockResolvedValue({
        _id: msgId,
        sender: { userId: 'author-1' },
        content: 'Original',
        createdAt: new Date(),
        save: saveFn,
      });

      const edited = await service.editMessage('tenant-a', 'query-1', msgId, 'author-1', {
        content: 'Edited content',
      });
      expect(edited.content).toBe('Edited content');
      expect(saveFn).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'chat.message_edited',
        expect.objectContaining({ messageId: msgId, newContent: 'Edited content' }),
      );
    });

    it('should soft-delete message and emit chat.message_deleted', async () => {
      const msgId = new Types.ObjectId().toHexString();
      const saveFn = vi.fn();
      mockMsgModel.findOne.mockResolvedValue({
        _id: msgId,
        sender: { userId: 'author-1' },
        isDeleted: false,
        save: saveFn,
      });

      const res = await service.deleteMessage('tenant-a', 'query-1', msgId, 'author-1', false);
      expect(res.success).toBe(true);
      expect(saveFn).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'chat.message_deleted',
        expect.objectContaining({ messageId: msgId }),
      );
    });

    it('should block cross-tenant or non-participant from reading conversation history', async () => {
      mockConvModel.findOne.mockReturnValue({
        lean: () => Promise.resolve({ _id: 'conv-1', tenantId: 'tenant-a', queryId: 'query-1' }),
      });
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-1',
        student: { userId: 'student-owner' },
      });

      await expect(
        service.getMessages('tenant-a', 'query-1', 'other-student', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Socket.IO Gateway (Auth, Tenant Isolation, Room Security, Typing, Delivery)
  // ---------------------------------------------------------------------------
  describe('Socket.IO MessagingGateway', () => {
    let gateway: MessagingGateway;
    let mockJwtService: any;
    let mockConfigService: any;
    let mockPrisma: any;
    let mockServer: any;

    beforeEach(() => {
      mockJwtService = { verify: vi.fn() };
      mockConfigService = { get: vi.fn().mockReturnValue('secret') };
      mockPrisma = { query: { findFirst: vi.fn() } };
      mockServer = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      };

      gateway = new MessagingGateway(mockJwtService, mockConfigService, mockPrisma);
      gateway.server = mockServer;
    });

    it('should reject unauthenticated WebSocket connections', async () => {
      const client: any = {
        id: 'sock-1',
        handshake: { auth: {}, headers: {} },
        emit: vi.fn(),
        disconnect: vi.fn(),
        data: {},
      };

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ code: 'AUTH_REQUIRED' }),
      );
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should authenticate valid JWT and join tenant + user rooms', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        tenantId: 'tenant-a',
        userType: 'STUDENT',
      });
      const client: any = {
        id: 'sock-2',
        handshake: { auth: { token: 'Bearer valid-jwt' }, headers: {} },
        join: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
        data: {},
      };

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith('tenant:tenant-a');
      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-a' }),
      );
      expect(gateway.getTenantConnectionCount('tenant-a')).toBe(1);
    });

    it('should block cross-tenant or non-participant student from joining ticket room', async () => {
      const client: any = {
        id: 'sock-3',
        data: { user: { sub: 'intruder', tenantId: 'tenant-b', userType: 'STUDENT' } },
        join: vi.fn(),
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      };

      // Query does not exist in tenant-b
      mockPrisma.query.findFirst.mockResolvedValue(null);

      await expect(
        gateway.handleJoinTicket(client, { queryId: 'query-in-tenant-a' }),
      ).rejects.toThrow(WsException);
      expect(client.join).not.toHaveBeenCalled();

      // Query exists in tenant, but student is not owner
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'query-in-tenant-b',
        student: { userId: 'different-student' },
      });

      await expect(
        gateway.handleJoinTicket(client, { queryId: 'query-in-tenant-b' }),
      ).rejects.toThrow(WsException);
    });

    it('should route INTERNAL_NOTE only to staff room and PUBLIC_REPLY to ticket room', () => {
      gateway.handleBroadcastMessage({
        tenantId: 'tenant-a',
        queryId: 'q-1',
        conversationId: 'c-1',
        message: { messageType: 'INTERNAL_NOTE', content: 'Staff only' },
      });
      expect(mockServer.to).toHaveBeenCalledWith('query:q-1:staff');

      gateway.handleBroadcastMessage({
        tenantId: 'tenant-a',
        queryId: 'q-1',
        conversationId: 'c-1',
        message: { messageType: 'PUBLIC_REPLY', content: 'Visible to student' },
      });
      expect(mockServer.to).toHaveBeenCalledWith('query:q-1');
    });

    it('should broadcast typing indicator and delivery confirmation', () => {
      const client: any = {
        data: {
          user: { sub: 'u-1', firstName: 'Jane', lastName: 'Doe', userType: 'FACULTY' },
        },
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      };

      gateway.handleTyping(client, { queryId: 'q-1', isTyping: true });
      expect(client.to).toHaveBeenCalledWith('query:q-1');
      expect(client.emit).toHaveBeenCalledWith(
        'user_typing',
        expect.objectContaining({ queryId: 'q-1', userId: 'u-1', isTyping: true }),
      );

      gateway.handleDeliveryAck(client, { messageId: 'm-1', queryId: 'q-1' });
      expect(client.emit).toHaveBeenCalledWith(
        'delivery_confirmed',
        expect.objectContaining({ messageId: 'm-1', deliveredBy: 'u-1' }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Attachments (Validation, Size Limit, Signed URLs, Access Control)
  // ---------------------------------------------------------------------------
  describe('AttachmentsService', () => {
    let service: AttachmentsService;
    let mockPrisma: any;
    let mockConfigService: any;

    beforeEach(() => {
      mockPrisma = {
        attachment: {
          create: vi.fn(),
          findFirst: vi.fn(),
          findMany: vi.fn(),
          delete: vi.fn(),
        },
        query: { findFirst: vi.fn() },
      };
      mockConfigService = {
        get: vi.fn((_k: string, def: any) => def),
      };

      service = new AttachmentsService(mockPrisma, mockConfigService);
    });

    it('should reject unsupported file types and files exceeding 20MB', async () => {
      await expect(
        service.generatePresignedPutUrl('tenant-a', 'user-1', {
          fileName: 'malware.exe',
          fileType: 'application/x-msdownload',
          fileSizeBytes: 1024,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.generatePresignedPutUrl('tenant-a', 'user-1', {
          fileName: 'huge.pdf',
          fileType: 'application/pdf',
          fileSizeBytes: 25 * 1024 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate presigned PUT URL and store tenant-scoped attachment record', async () => {
      mockPrisma.attachment.create.mockImplementation(({ data }: any) => Promise.resolve(data));

      const res = await service.generatePresignedPutUrl('tenant-a', 'user-1', {
        fileName: 'receipt 2026.pdf',
        fileType: 'application/pdf',
        fileSizeBytes: 50000,
      });

      expect(res.uploadUrl).toContain('https://');
      expect(res.fileKey).toMatch(/^tenants\/tenant-a\/attachments\//);
      expect(res.expiresIn).toBe(900);
    });

    it('should deny download URL to unauthorized user from same or different tenant', async () => {
      // Cross-tenant: findFirst returns null
      mockPrisma.attachment.findFirst.mockResolvedValue(null);
      await expect(
        service.getDownloadUrl('tenant-b', 'att-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      // Non-participant user in same tenant
      mockPrisma.attachment.findFirst.mockResolvedValue({
        id: 'att-1',
        tenantId: 'tenant-a',
        queryId: 'q-1',
        uploadedByUserId: 'uploader-1',
        fileKey: 'tenants/tenant-a/attachments/att-1/doc.pdf',
        fileName: 'doc.pdf',
      });
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'q-1',
        student: { userId: 'student-1' },
        assignments: [{ assignedToUserId: 'staff-1' }],
      });

      await expect(
        service.getDownloadUrl('tenant-a', 'att-1', 'stranger-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Notifications (Preferences, Bulk Dispatch, Read/Unread, BullMQ Processor)
  // ---------------------------------------------------------------------------
  describe('NotificationsService & Processor', () => {
    let service: NotificationsService;
    let processor: NotificationsProcessor;
    let mockPrisma: any;
    let mockEventEmitter: any;
    let mockQueue: any;

    beforeEach(() => {
      mockPrisma = {
        notification: {
          create: vi.fn(),
          count: vi.fn(),
          findMany: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
          delete: vi.fn(),
        },
        notificationPreference: {
          findUnique: vi.fn(),
          create: vi.fn(),
          upsert: vi.fn(),
        },
      };
      mockEventEmitter = { emit: vi.fn() };
      mockQueue = {
        add: vi.fn(),
        addBulk: vi.fn(),
      };

      service = new NotificationsService(mockPrisma, mockEventEmitter, mockQueue);
      processor = new NotificationsProcessor(mockPrisma, mockEventEmitter);
    });

    it('should respect user notification preferences and suppress disabled categories', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        inAppEnabled: true,
        queryUpdates: false,
      });

      const res = await service.create(
        'tenant-a',
        'user-1',
        'Ticket Update',
        'Status changed',
        '/queries/1',
        'STATUS_CHANGED',
      );

      expect(res).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should enqueue bulk notifications with exponential retry backoff', async () => {
      await service.dispatchBulk([
        { tenantId: 'tenant-a', userId: 'u-1', title: 'Alert 1', body: 'Body 1' },
        { tenantId: 'tenant-a', userId: 'u-2', title: 'Alert 2', body: 'Body 2' },
      ]);

      expect(mockQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'deliver',
            opts: expect.objectContaining({
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
            }),
          }),
        ]),
      );
    });

    it('should process BullMQ notification job, persist to DB, and emit real-time push', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        createdAt: new Date(),
      });

      const result = await processor.process({
        id: 'job-1',
        data: {
          tenantId: 'tenant-a',
          userId: 'u-1',
          title: 'New Ticket',
          body: 'Assigned to you',
          linkUrl: '/queries/1',
        },
      } as any);

      expect(result.delivered).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.created',
        expect.objectContaining({ tenantId: 'tenant-a', userId: 'u-1' }),
      );
    });

    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
      const res = await service.markAllAsRead('tenant-a', 'u-1');
      expect(res.markedCount).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Email Service & Templates (BullMQ + Retry Policies)
  // ---------------------------------------------------------------------------
  describe('EmailService & EmailProcessor', () => {
    let emailService: EmailService;
    let emailProcessor: EmailProcessor;
    let mockQueue: any;

    beforeEach(() => {
      mockQueue = { add: vi.fn() };
      emailService = new EmailService(mockQueue);
      emailProcessor = new EmailProcessor({
        get: vi.fn((_k: string, def: any) => def),
      } as any);
    });

    it('should enqueue auth, query, and billing emails with retry policy', async () => {
      await emailService.sendEmailVerification('user@college.edu', 'Alice', 'https://app/verify');
      await emailService.sendPasswordReset('user@college.edu', 'Alice', 'https://app/reset');
      await emailService.sendQueryAssignedEmail('staff@college.edu', 'Dr. Rao', 'CQ-2026-00010', '/q/1');
      await emailService.sendInvoiceEmail('admin@college.edu', 'Admin', 'INV-001', '9999', '2026-12-01');

      expect(mockQueue.add).toHaveBeenCalledTimes(4);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({ type: 'EMAIL_VERIFICATION', to: 'user@college.edu' }),
        expect.objectContaining({ priority: 1, attempts: 3 }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({ type: 'BILLING_INVOICE', invoiceNumber: 'INV-001' }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('should render templates and process all email job types without errors', async () => {
      const types: any[] = [
        { type: 'EMAIL_VERIFICATION', to: 'a@b.com', verificationUrl: 'https://x' },
        { type: 'PASSWORD_RESET', to: 'a@b.com', resetUrl: 'https://x' },
        { type: 'QUERY_ASSIGNED', to: 'a@b.com', ticketNumber: 'CQ-1', queryUrl: '/q/1' },
        { type: 'QUERY_STATUS_CHANGED', to: 'a@b.com', ticketNumber: 'CQ-1', metadata: { newStatus: 'IN_PROGRESS' } },
        { type: 'BILLING_INVOICE', to: 'a@b.com', invoiceNumber: 'INV-1', amount: '5000', dueDate: '2026-12-31' },
      ];

      for (const data of types) {
        const res = await emailProcessor.process({ id: 'j-1', data } as any);
        expect(res.sent).toBe(true);
      }
    });
  });
});
