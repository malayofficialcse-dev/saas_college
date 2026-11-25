// ==============================================================================
// CollegeQuery SaaS — Email Service (Full Implementation)
// Reusable templates, BullMQ queue, retry, all email types.
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export type EmailJobType =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'QUERY_CREATED'
  | 'QUERY_ASSIGNED'
  | 'QUERY_STATUS_CHANGED'
  | 'RESOLUTION'
  | 'ESCALATION'
  | 'SLA_BREACH'
  | 'FEEDBACK_REQUEST'
  | 'BILLING_INVOICE'
  | 'SUBSCRIPTION_EXPIRY'
  | 'WELCOME';

export interface EmailJobPayload {
  to: string;
  recipientName?: string;
  type: EmailJobType;
  // Query-related fields
  ticketNumber?: string;
  title?: string;
  summary?: string;
  queryUrl?: string;
  // Auth-related fields
  verificationUrl?: string;
  resetUrl?: string;
  otp?: string;
  // Billing fields
  invoiceNumber?: string;
  amount?: string;
  dueDate?: string;
  // Generic
  metadata?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue<EmailJobPayload>,
  ) {}

  // ---------------------------------------------------------------------------
  // Generic Dispatch
  // ---------------------------------------------------------------------------

  private async enqueue(payload: EmailJobPayload, priority = 5): Promise<void> {
    await this.emailQueue.add('send-email', payload, {
      priority,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 500,
    });
    this.logger.log(`[Email Queue] Enqueued ${payload.type} → ${payload.to}`);
  }

  // ---------------------------------------------------------------------------
  // Authentication Emails (high priority = low number)
  // ---------------------------------------------------------------------------

  async sendEmailVerification(to: string, name: string, verificationUrl: string) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'EMAIL_VERIFICATION',
      verificationUrl,
    }, 1); // highest priority
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'PASSWORD_RESET',
      resetUrl,
    }, 1);
  }

  async sendWelcomeEmail(to: string, name: string) {
    return this.enqueue({ to, recipientName: name, type: 'WELCOME' }, 3);
  }

  // ---------------------------------------------------------------------------
  // Query Lifecycle Emails
  // ---------------------------------------------------------------------------

  async sendQueryCreatedEmail(to: string, name: string, ticketNumber: string, title: string, queryUrl: string) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'QUERY_CREATED',
      ticketNumber,
      title,
      queryUrl,
    }, 5);
  }

  async sendQueryAssignedEmail(
    to: string,
    name: string,
    ticketNumber: string,
    queryUrl: string,
  ) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'QUERY_ASSIGNED',
      ticketNumber,
      queryUrl,
    }, 5);
  }

  async sendStatusChangedEmail(
    to: string,
    name: string,
    ticketNumber: string,
    newStatus: string,
    queryUrl: string,
  ) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'QUERY_STATUS_CHANGED',
      ticketNumber,
      queryUrl,
      metadata: { newStatus },
    }, 5);
  }

  async sendResolutionEmail(
    to: string,
    name: string,
    ticketNumber: string,
    summary: string,
    queryUrl: string,
  ) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'RESOLUTION',
      ticketNumber,
      summary,
      queryUrl,
    }, 4);
  }

  async sendEscalationEmail(to: string, name: string, ticketNumber: string, queryUrl: string) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'ESCALATION',
      ticketNumber,
      queryUrl,
    }, 3);
  }

  async sendSlaBreachEmail(to: string, name: string, ticketNumber: string, queryUrl: string) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'SLA_BREACH',
      ticketNumber,
      queryUrl,
    }, 2);
  }

  async sendFeedbackRequestEmail(to: string, name: string, ticketNumber: string, queryUrl: string) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'FEEDBACK_REQUEST',
      ticketNumber,
      queryUrl,
    }, 6);
  }

  // ---------------------------------------------------------------------------
  // Billing Emails
  // ---------------------------------------------------------------------------

  async sendInvoiceEmail(
    to: string,
    name: string,
    invoiceNumber: string,
    amount: string,
    dueDate: string,
  ) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'BILLING_INVOICE',
      invoiceNumber,
      amount,
      dueDate,
    }, 4);
  }

  async sendSubscriptionExpiryWarning(to: string, name: string, dueDate: string) {
    return this.enqueue({
      to,
      recipientName: name,
      type: 'SUBSCRIPTION_EXPIRY',
      dueDate,
    }, 3);
  }
}
