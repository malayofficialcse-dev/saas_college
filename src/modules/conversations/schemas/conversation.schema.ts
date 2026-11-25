// ==============================================================================
// CollegeQuery SaaS — Conversation Root Schema (Mongoose ODM)
// ==============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ _id: false })
export class LastMessagePreview {
  @Prop({ type: Types.ObjectId, required: true })
  messageId: Types.ObjectId;

  @Prop({ type: String, required: true })
  senderId: string;

  @Prop({ type: String, required: true })
  senderName: string;

  @Prop({ type: String, required: true })
  textPreview: string;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;
}
export const LastMessagePreviewSchema = SchemaFactory.createForClass(LastMessagePreview);

@Schema({
  timestamps: true,
  collection: 'conversations',
})
export class Conversation {
  @Prop({ type: String, required: true, index: true })
  tenantId: string; // Scoped UUID

  @Prop({ type: String, required: true, unique: true, index: true })
  queryId: string; // PostgreSQL Query UUID

  @Prop({ type: String, required: true })
  ticketNumber: string; // e.g. "CQ-2026-00412"

  @Prop({
    type: String,
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED'],
    default: 'OPEN',
    index: true,
  })
  status: string;

  @Prop({ type: LastMessagePreviewSchema, default: null })
  lastMessage: LastMessagePreview | null;

  @Prop({ type: Number, default: 0 })
  totalMessages: number;

  @Prop({ type: Number, default: 0 })
  totalInternalNotes: number;

  @Prop({ type: Map, of: Number, default: {} })
  unreadCounts: Map<string, number>; // Key: userId (UUID), Value: unread count

  @Prop({ type: [String], default: [] })
  participantUserIds: string[]; // Fast lookup for chat access control

  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Compound Indexes for fast tenant retrieval
ConversationSchema.index({ tenantId: 1, updatedAt: -1 });
ConversationSchema.index({ tenantId: 1, participantUserIds: 1 });
