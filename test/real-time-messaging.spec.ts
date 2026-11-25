import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationsService } from '../src/modules/conversations/conversations.service.js';

describe('Real-Time Chat & Staff Internal Notes Suite', () => {
  let conversationsService: ConversationsService;
  let mockConversationModel: any;
  let mockMessageModel: any;
  let mockActivityModel: any;
  let mockPrisma: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockEventEmitter = { emit: vi.fn() };
    mockPrisma = {
      query: { findFirst: vi.fn() },
      attachment: { findMany: vi.fn().mockResolvedValue([]) },
    };

    mockConversationModel = {
      findOne: vi.fn(),
      create: vi.fn(),
      updateOne: vi.fn(),
    };

    mockMessageModel = {
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn().mockResolvedValue(null),
      countDocuments: vi.fn(),
      updateMany: vi.fn(),
    };

    mockActivityModel = {
      create: vi.fn(),
    };

    conversationsService = new ConversationsService(
      mockConversationModel as any,
      mockMessageModel as any,
      mockActivityModel as any,
      mockPrisma as any,
      mockEventEmitter as any,
    );
  });

  it('should post a public message and emit chat.message_sent event', async () => {
    mockPrisma.query.findFirst.mockResolvedValue({
      id: 'query-1',
      ticketNumber: 'CQ-2026-00100',
      student: { userId: 'student-user-1' },
      assignments: [],
    });

    mockConversationModel.findOne.mockResolvedValue({
      _id: 'conv-mongo-id',
      tenantId: 'tenant-acme',
      queryId: 'query-1',
      participantUserIds: ['student-user-1'],
    });

    mockMessageModel.create.mockResolvedValue({
      _id: 'msg-mongo-id',
      sender: { userId: 'faculty-user-1', fullName: 'Dr. Rao', roleCode: 'FACULTY' },
      content: 'Hello, your marks will be updated by tomorrow.',
      messageType: 'PUBLIC_REPLY',
      attachments: [],
      createdAt: new Date(),
    });

    const message = await conversationsService.postMessage(
      'tenant-acme',
      'query-1',
      { userId: 'faculty-user-1', fullName: 'Dr. Rao', roleCode: 'FACULTY' },
      { messageType: 'PUBLIC_REPLY', content: 'Hello, your marks will be updated by tomorrow.' },
    );

    expect(message).toHaveProperty('_id');
    expect(mockConversationModel.updateOne).toHaveBeenCalled();
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'chat.message_sent',
      expect.objectContaining({
        tenantId: 'tenant-acme',
        queryId: 'query-1',
      }),
    );
  });

  it('should hide INTERNAL_NOTE messages when queried by students', async () => {
    mockConversationModel.findOne.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'conv-1', tenantId: 'tenant-acme', queryId: 'query-1' }),
    });
    mockPrisma.query.findFirst.mockResolvedValue({
      id: 'query-1',
      student: { userId: 'student-user-1' },
    });

    mockMessageModel.countDocuments.mockResolvedValue(1);
    mockMessageModel.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve([{ content: 'Public reply' }]),
          }),
        }),
      }),
    });

    const studentResult = await conversationsService.getMessages(
      'tenant-acme',
      'query-1',
      'student-user-1',
      false, // isStaff = false (Student)
    );

    expect(studentResult.items.length).toBe(1);
    expect(mockMessageModel.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        messageType: { $ne: 'INTERNAL_NOTE' },
      }),
    );
  });

  it('should update read receipts when participant marks ticket messages as read', async () => {
    mockMessageModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const result = await conversationsService.markAsRead(
      'tenant-acme',
      'query-1',
      'student-user-1',
    );

    expect(result.success).toBe(true);
    expect(mockMessageModel.updateMany).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-acme',
        queryId: 'query-1',
        isDeleted: false,
        'readBy.userId': { $ne: 'student-user-1' },
      },
      expect.objectContaining({
        $push: expect.objectContaining({
          readBy: expect.objectContaining({ userId: 'student-user-1' }),
        }),
      }),
    );
  });
});
