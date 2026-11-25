# 06. MongoDB Document Schema Design (Mongoose ODM)

## 1. Overview & Strategy

MongoDB serves as the specialized document store for high-throughput, unstructured, and append-heavy conversational data in CollegeQuery.

### Core Collections:
1. `conversations`: Conversation root document mapped 1:1 with PostgreSQL query tickets.
2. `messages`: Threaded chat messages, public replies, internal staff-only notes, and attachments.
3. `activity_events`: Real-time audit log of ticket actions (status shifts, reassignments, escalations).
4. `conversation_members`: Active participants in a thread, tracking unread counts and muted status.

---

## 2. Document Relationship Diagram

```mermaid
flowchart TD
    subgraph PostgreSQLSource["PostgreSQL (Source of Truth)"]
        PGQuery["queries (id: UUID, tenant_id: UUID)"]
        PGUser["users (id: UUID, full_name, avatar)"]
    end

    subgraph MongoCollections["MongoDB Document Collections"]
        ConvDoc["conversations
        -------------------------
        _id: ObjectId
        tenantId: UUID (Indexed)
        queryId: UUID (Indexed, Unique)
        ticketNumber: String
        status: String
        channelType: 'PUBLIC' | 'INTERNAL'
        lastMessage: SubDocument
        unreadCount: Map<UserId, Number>"]

        MsgDoc["messages
        -------------------------
        _id: ObjectId
        tenantId: UUID (Indexed)
        conversationId: ObjectId (FK)
        queryId: UUID (Indexed)
        sender: { userId: UUID, name, role }
        messageType: 'PUBLIC_REPLY' | 'INTERNAL_NOTE' | 'SYSTEM'
        content: String (Markdown)
        attachments: Array<AttachmentSubDoc>
        readBy: Array<{ userId: UUID, readAt: Date }>
        createdAt: Date"]

        EventDoc["activity_events
        -------------------------
        _id: ObjectId
        tenantId: UUID (Indexed)
        queryId: UUID (Indexed)
        eventType: 'STATUS_CHANGED' | 'ASSIGNED' | 'ESCALATED' | 'SLA_WARNING'
        actor: { userId: UUID, name: String }
        metadata: Object (flexible JSON)
        createdAt: Date"]
    end

    PGQuery -->|queryId Linkage| ConvDoc
    PGUser -->|sender.userId Linkage| MsgDoc
    ConvDoc ||--o{ MsgDoc : "contains messages"
    ConvDoc ||--o{ EventDoc : "contains timeline events"
```

---

## 3. Detailed Mongoose Schema Definitions

### 3.1 `conversations` Schema
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation extends Document {
  @Prop({ type: String, required: true, index: true })
  tenantId: string; // Scoped UUID

  @Prop({ type: String, required: true, unique: true, index: true })
  queryId: string; // Relational PostgreSQL Query ID

  @Prop({ type: String, required: true })
  ticketNumber: string; // e.g., "CQ-2026-00109"

  @Prop({
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN',
    index: true,
  })
  status: string;

  @Prop({
    type: {
      messageId: { type: Types.ObjectId },
      senderId: { type: String },
      senderName: { type: String },
      textPreview: { type: String },
      sentAt: { type: Date },
    },
    default: null,
  })
  lastMessage: {
    messageId: Types.ObjectId;
    senderId: string;
    senderName: string;
    textPreview: string;
    sentAt: Date;
  };

  @Prop({ type: Number, default: 0 })
  totalMessages: number;

  @Prop({ type: Number, default: 0 })
  totalInternalNotes: number;

  @Prop({ type: Map, of: Number, default: {} })
  unreadCounts: Map<string, number>; // Key: userId (UUID), Value: unread integer

  @Prop({ type: [String], default: [] })
  participantUserIds: string[]; // Fast lookup for ACL
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Compound Indexes for fast tenant retrieval
ConversationSchema.index({ tenantId: 1, updatedAt: -1 });
ConversationSchema.index({ tenantId: 1, participantUserIds: 1 });
```

---

### 3.2 `messages` Schema
```typescript
@Schema({ timestamps: true, collection: 'messages' })
export class Message extends Document {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  queryId: string;

  @Prop({
    type: {
      userId: { type: String, required: true },
      fullName: { type: String, required: true },
      roleCode: { type: String, required: true },
      avatarUrl: { type: String },
    },
    required: true,
  })
  sender: {
    userId: string;
    fullName: string;
    roleCode: string;
    avatarUrl?: string;
  };

  @Prop({
    type: String,
    enum: ['PUBLIC_REPLY', 'INTERNAL_NOTE', 'SYSTEM_ANNOUNCEMENT'],
    default: 'PUBLIC_REPLY',
    index: true,
  })
  messageType: string;

  @Prop({ type: String, required: true })
  content: string; // Markdown/Text content

  @Prop({
    type: [
      {
        attachmentId: { type: String }, // Links to PostgreSQL attachments.id
        fileName: { type: String },
        fileSize: { type: Number },
        mimeType: { type: String },
        s3Key: { type: String },
        s3Url: { type: String },
      },
    ],
    default: [],
  })
  attachments: Array<{
    attachmentId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    s3Key: string;
    s3Url: string;
  }>;

  @Prop({
    type: [
      {
        userId: { type: String, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// High-speed conversation timeline query index
MessageSchema.index({ conversationId: 1, messageType: 1, createdAt: 1 });
MessageSchema.index({ tenantId: 1, queryId: 1, createdAt: 1 });
```

---

### 3.3 `activity_events` Schema (Query Timeline Stream)
```typescript
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'activity_events' })
export class ActivityEvent extends Document {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, required: true, index: true })
  queryId: string;

  @Prop({
    type: String,
    enum: [
      'QUERY_CREATED',
      'STATUS_CHANGED',
      'ASSIGNED',
      'REASSIGNED',
      'ESCALATED',
      'SLA_BREACHED',
      'FEEDBACK_RECEIVED',
    ],
    required: true,
  })
  eventType: string;

  @Prop({
    type: {
      userId: { type: String },
      fullName: { type: String },
      roleCode: { type: String },
    },
    default: null,
  })
  actor: {
    userId: string;
    fullName: string;
    roleCode: string;
  };

  @Prop({ type: Object, default: {} })
  payload: Record<string, any>; // Previous vs new state, reasons, etc.
}

export const ActivityEventSchema = SchemaFactory.createForClass(ActivityEvent);
ActivityEventSchema.index({ tenantId: 1, queryId: 1, createdAt: 1 });
```
