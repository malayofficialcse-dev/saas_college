// ==============================================================================
// CollegeQuery SaaS — Message Schema (Mongoose ODM) — Enhanced
// ==============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ _id: false })
export class SenderMetadata {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  fullName: string;

  @Prop({ type: String, required: true })
  roleCode: string;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;
}
export const SenderMetadataSchema = SchemaFactory.createForClass(SenderMetadata);

@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ type: String, required: true })
  attachmentId: string; // Links to PostgreSQL attachments.id

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: true })
  fileKey: string;

  @Prop({ type: String, required: true })
  downloadUrl: string;
}
export const MessageAttachmentSchema = SchemaFactory.createForClass(MessageAttachment);

@Schema({ _id: false })
export class ReadReceipt {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Date, default: Date.now })
  readAt: Date;
}
export const ReadReceiptSchema = SchemaFactory.createForClass(ReadReceipt);

@Schema({
  timestamps: true,
  collection: 'messages',
})
export class Message {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  queryId: string;

  @Prop({ type: SenderMetadataSchema, required: true })
  sender: SenderMetadata;

  @Prop({
    type: String,
    enum: ['PUBLIC_REPLY', 'INTERNAL_NOTE', 'SYSTEM_ANNOUNCEMENT'],
    default: 'PUBLIC_REPLY',
    index: true,
  })
  messageType: string;

  @Prop({ type: String, required: true })
  content: string; // Markdown/rich text content

  @Prop({ type: [MessageAttachmentSchema], default: [] })
  attachments: MessageAttachment[];

  @Prop({ type: [ReadReceiptSchema], default: [] })
  readBy: ReadReceipt[];

  @Prop({
    type: String,
    enum: ['SENT', 'DELIVERED', 'READ'],
    default: 'SENT',
  })
  deliveryStatus: string;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: Date, default: null })
  editedAt: Date | null;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// High-speed conversation timeline query indexes
MessageSchema.index({ conversationId: 1, messageType: 1, createdAt: 1 });
MessageSchema.index({ tenantId: 1, queryId: 1, createdAt: 1 });
MessageSchema.index({ tenantId: 1, 'sender.userId': 1, createdAt: -1 });
