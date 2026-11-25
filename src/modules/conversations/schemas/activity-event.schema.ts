// ==============================================================================
// CollegeQuery SaaS — Activity Event Schema (Mongoose ODM)
// ==============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityEventDocument = ActivityEvent & Document;

@Schema({ _id: false })
export class EventActor {
  @Prop({ type: String, default: null })
  userId: string | null;

  @Prop({ type: String, default: 'System' })
  fullName: string;

  @Prop({ type: String, default: 'SYSTEM' })
  roleCode: string;
}
export const EventActorSchema = SchemaFactory.createForClass(EventActor);

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'activity_events',
})
export class ActivityEvent {
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
      'ATTACHMENT_ADDED',
    ],
    required: true,
  })
  eventType: string;

  @Prop({ type: EventActorSchema, default: () => ({ userId: null, fullName: 'System', roleCode: 'SYSTEM' }) })
  actor: EventActor;

  @Prop({ type: Object, default: {} })
  payload: Record<string, any>;

  createdAt?: Date;
}

export const ActivityEventSchema = SchemaFactory.createForClass(ActivityEvent);

ActivityEventSchema.index({ tenantId: 1, queryId: 1, createdAt: 1 });
