// ==============================================================================
// CollegeQuery SaaS — Conversations Service (MongoDB via Mongoose)
// Handles conversation lifecycle, message creation, read receipts, pagination
// and participant-based access control.
// ==============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Conversation,
  ConversationDocument,
  Message,
  MessageDocument,
  ActivityEvent,
  ActivityEventDocument,
} from './schemas/index.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { EditMessageDto } from './dto/edit-message.dto.js';
import { PrismaService } from '../../core/database/prisma.service.js';

export interface SenderContext {
  userId: string;
  fullName: string;
  roleCode: string;
  avatarUrl?: string;
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(ActivityEvent.name)
    private readonly activityModel: Model<ActivityEventDocument>,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Conversation Lifecycle
  // ---------------------------------------------------------------------------

  async getOrCreateConversation(tenantId: string, queryId: string, ticketNumber: string) {
    let conv = await this.conversationModel.findOne({ tenantId, queryId });
    if (!conv) {
      conv = await this.conversationModel.create({
        tenantId,
        queryId,
        ticketNumber,
        status: 'OPEN',
        participantUserIds: [],
        unreadCounts: {},
        totalMessages: 0,
        totalInternalNotes: 0,
      });
    }
    return conv;
  }

  async getConversationByQuery(tenantId: string, queryId: string, userId: string) {
    const conv = await this.conversationModel.findOne({ tenantId, queryId }).lean();
    if (!conv) throw new NotFoundException(`Conversation for query '${queryId}' not found.`);

    // Participant check: students see their own conversation; staff see conversations in their tenant
    const pgQuery = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
      include: { student: true },
    });
    if (!pgQuery) throw new NotFoundException(`Query '${queryId}' not found.`);

    return conv;
  }

  async addParticipant(tenantId: string, queryId: string, userId: string) {
    return this.conversationModel.findOneAndUpdate(
      { tenantId, queryId },
      { $addToSet: { participantUserIds: userId } },
      { new: true },
    );
  }

  async syncConversationStatus(tenantId: string, queryId: string, status: string) {
    await this.conversationModel.updateOne(
      { tenantId, queryId },
      { $set: { status } },
    );
  }

  // ---------------------------------------------------------------------------
  // Message Creation
  // ---------------------------------------------------------------------------

  async postMessage(
    tenantId: string,
    queryId: string,
    sender: SenderContext,
    dto: SendMessageDto,
  ) {
    // Validate query existence and tenant isolation
    const query = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
      include: { student: true, assignments: { where: { unassignedAt: null } } },
    });
    if (!query) throw new NotFoundException(`Query '${queryId}' not found.`);

    // Authorization: student can only message their own query; staff need assignment
    const isStudent = sender.roleCode === 'STUDENT';
    if (isStudent && query.student.userId !== sender.userId) {
      throw new ForbiddenException('You are not the owner of this ticket.');
    }

    // Internal notes: only staff allowed
    if (dto.messageType === 'INTERNAL_NOTE' && isStudent) {
      throw new ForbiddenException('Students cannot post internal notes.');
    }

    const conv = await this.getOrCreateConversation(tenantId, queryId, query.ticketNumber);

    // Fetch attachment metadata if attached
    let attachmentDetails: any[] = [];
    if (dto.attachmentIds && dto.attachmentIds.length > 0) {
      const records = await this.prisma.attachment.findMany({
        where: { id: { in: dto.attachmentIds }, tenantId },
      });
      attachmentDetails = records.map((r) => ({
        attachmentId: r.id,
        fileName: r.fileName,
        fileSizeBytes: r.fileSizeBytes,
        mimeType: r.fileType,
        fileKey: r.fileKey,
        downloadUrl: `/api/v1/attachments/${r.id}/download-url`,
      }));
    }

    // Idempotency: check for duplicate within 2 seconds (content + sender + window)
    const twoSecondsAgo = new Date(Date.now() - 2000);
    const duplicate = await this.messageModel.findOne({
      tenantId,
      queryId,
      'sender.userId': sender.userId,
      content: dto.content,
      createdAt: { $gte: twoSecondsAgo },
    });
    if (duplicate) return duplicate;

    // Create message document
    const message = await this.messageModel.create({
      tenantId,
      conversationId: conv._id,
      queryId,
      sender: {
        userId: sender.userId,
        fullName: sender.fullName,
        roleCode: sender.roleCode,
        avatarUrl: sender.avatarUrl || null,
      },
      messageType: dto.messageType,
      content: dto.content,
      attachments: attachmentDetails,
      deliveryStatus: 'SENT',
      readBy: [{ userId: sender.userId, readAt: new Date() }],
    });

    // Update conversation: last message preview, counters, participants, unread counts
    const updateOps: any = {
      $set: {
        lastMessage: {
          messageId: message._id,
          senderId: sender.userId,
          senderName: sender.fullName,
          textPreview: dto.content.substring(0, 100),
          sentAt: new Date(),
        },
      },
      $inc: { totalMessages: 1 },
      $addToSet: { participantUserIds: sender.userId },
    };

    if (dto.messageType === 'INTERNAL_NOTE') {
      updateOps.$inc.totalInternalNotes = 1;
    }

    await this.conversationModel.updateOne({ _id: conv._id }, updateOps);

    // Increment unread count for all participants except sender
    // (best effort — no blocking on participant lookup)
    const otherParticipants = (conv.participantUserIds || []).filter((uid) => uid !== sender.userId);
    if (otherParticipants.length > 0 && dto.messageType !== 'INTERNAL_NOTE') {
      const incOps: Record<string, number> = {};
      otherParticipants.forEach((uid) => {
        incOps[`unreadCounts.${uid}`] = 1;
      });
      await this.conversationModel.updateOne({ _id: conv._id }, { $inc: incOps });
    }

    // Log activity event
    await this.activityModel.create({
      tenantId,
      queryId,
      eventType: 'ATTACHMENT_ADDED',
      actor: { userId: sender.userId, fullName: sender.fullName, roleCode: sender.roleCode },
      payload: { messageId: String(message._id), attachmentCount: attachmentDetails.length },
    });

    // Emit real-time event for WebSocket broadcast
    this.eventEmitter.emit('chat.message_sent', {
      tenantId,
      queryId,
      conversationId: String(conv._id),
      message: {
        _id: String(message._id),
        sender: message.sender,
        messageType: message.messageType,
        content: message.content,
        attachments: message.attachments,
        deliveryStatus: 'SENT',
        createdAt: message.createdAt,
      },
    });

    return message;
  }

  // ---------------------------------------------------------------------------
  // Message History with Pagination
  // ---------------------------------------------------------------------------

  async getMessages(
    tenantId: string,
    queryId: string,
    userId: string,
    isStaff: boolean,
    page = 1,
    limit = 50,
    before?: string,
  ) {
    // Participant check
    const conv = await this.conversationModel.findOne({ tenantId, queryId }).lean();
    if (!conv) throw new NotFoundException(`Conversation for query '${queryId}' not found.`);

    // Verify user is participant or query owner
    const pgQuery = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
      include: { student: true },
    });
    if (!pgQuery) throw new NotFoundException(`Query '${queryId}' not found.`);

    const isQueryOwner = pgQuery.student.userId === userId;
    if (!isStaff && !isQueryOwner) {
      throw new ForbiddenException('You are not authorized to view this conversation.');
    }

    const skip = (page - 1) * limit;
    const filter: any = { tenantId, queryId, isDeleted: false };

    // Cursor-based pagination support
    if (before) {
      filter._id = { $lt: new Types.ObjectId(before) };
    }

    // Students cannot view INTERNAL_NOTE messages
    if (!isStaff) {
      filter.messageType = { $ne: 'INTERNAL_NOTE' };
    }

    const [total, items] = await Promise.all([
      this.messageModel.countDocuments(filter),
      this.messageModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(before ? 0 : skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---------------------------------------------------------------------------
  // Message Edit (within 15 minutes, sender only)
  // ---------------------------------------------------------------------------

  async editMessage(
    tenantId: string,
    queryId: string,
    messageId: string,
    userId: string,
    dto: EditMessageDto,
  ) {
    const message = await this.messageModel.findOne({
      _id: new Types.ObjectId(messageId),
      tenantId,
      queryId,
      isDeleted: false,
    });
    if (!message) throw new NotFoundException('Message not found.');

    if (message.sender.userId !== userId) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    const editWindowMs = 15 * 60 * 1000; // 15 minutes
    const age = Date.now() - (message.createdAt?.getTime() ?? 0);
    if (age > editWindowMs) {
      throw new BadRequestException('Messages can only be edited within 15 minutes of sending.');
    }

    message.content = dto.content;
    (message as any).isEdited = true;
    (message as any).editedAt = new Date();
    await message.save();

    this.eventEmitter.emit('chat.message_edited', {
      tenantId,
      queryId,
      messageId,
      newContent: dto.content,
    });

    return message;
  }

  // ---------------------------------------------------------------------------
  // Soft Delete (sender or staff)
  // ---------------------------------------------------------------------------

  async deleteMessage(
    tenantId: string,
    queryId: string,
    messageId: string,
    userId: string,
    isStaff: boolean,
  ) {
    const message = await this.messageModel.findOne({
      _id: new Types.ObjectId(messageId),
      tenantId,
      queryId,
      isDeleted: false,
    });
    if (!message) throw new NotFoundException('Message not found.');

    if (!isStaff && message.sender.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages.');
    }

    message.isDeleted = true;
    await message.save();

    this.eventEmitter.emit('chat.message_deleted', { tenantId, queryId, messageId });

    return { success: true, messageId };
  }

  // ---------------------------------------------------------------------------
  // Read Receipts
  // ---------------------------------------------------------------------------

  async markAsRead(tenantId: string, queryId: string, userId: string) {
    // Mark all unread messages in this conversation as read for the user
    await this.messageModel.updateMany(
      {
        tenantId,
        queryId,
        isDeleted: false,
        'readBy.userId': { $ne: userId },
      },
      {
        $push: { readBy: { userId, readAt: new Date() } },
      },
    );

    // Reset unread counter for this user in conversation
    await this.conversationModel.updateOne(
      { tenantId, queryId },
      { $set: { [`unreadCounts.${userId}`]: 0 } },
    );

    // Emit read receipt event for real-time update
    this.eventEmitter.emit('chat.read_receipt', { tenantId, queryId, userId, readAt: new Date() });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Delivery Acknowledgement
  // ---------------------------------------------------------------------------

  async acknowledgeDelivery(tenantId: string, messageId: string, userId: string) {
    await this.messageModel.updateOne(
      { _id: new Types.ObjectId(messageId), tenantId },
      { $set: { deliveryStatus: 'DELIVERED' } },
    );

    this.eventEmitter.emit('chat.message_delivered', { tenantId, messageId, userId });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Activity Timeline
  // ---------------------------------------------------------------------------

  async getActivityTimeline(tenantId: string, queryId: string) {
    return this.activityModel
      .find({ tenantId, queryId })
      .sort({ createdAt: 1 })
      .lean();
  }

  async recordActivity(
    tenantId: string,
    queryId: string,
    eventType: string,
    actor: { userId?: string; fullName: string; roleCode: string },
    payload: Record<string, any> = {},
  ) {
    return this.activityModel.create({
      tenantId,
      queryId,
      eventType,
      actor: { userId: actor.userId || null, fullName: actor.fullName, roleCode: actor.roleCode },
      payload,
    });
  }
}
