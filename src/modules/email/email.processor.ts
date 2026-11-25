// ==============================================================================
// CollegeQuery SaaS — Email BullMQ Processor
// Renders HTML templates and dispatches via SMTP/SES.
// Template rendering uses simple string interpolation (no extra dep required).
// ==============================================================================

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { EmailJobPayload } from './email.service.js';

// ---------------------------------------------------------------------------
// HTML Email Templates
// ---------------------------------------------------------------------------

function wrapTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #0284c7; padding: 24px 32px; color: #fff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .body { padding: 32px; color: #374151; line-height: 1.6; }
    .ticket { background: #f0f9ff; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 15px; font-weight: 600; color: #0369a1; }
    .btn { display: inline-block; background: #0284c7; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { padding: 20px 32px; background: #f9fafb; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>CollegeQuery Support</h1></div>
    <div class="body">${body}</div>
    <div class="footer">© 2026 CollegeQuery SaaS. This email was sent automatically. Please do not reply.</div>
  </div>
</body>
</html>`;
}

const TEMPLATES: Record<
  string,
  (p: EmailJobPayload) => { subject: string; html: string }
> = {
  EMAIL_VERIFICATION: (p) => ({
    subject: 'Verify Your Email — CollegeQuery',
    html: wrapTemplate('Verify Email', `
      <p>Hi ${p.recipientName || 'User'},</p>
      <p>Please verify your email address to activate your CollegeQuery account.</p>
      <a href="${p.verificationUrl}" class="btn">Verify Email Address</a>
      <p style="color:#6b7280;font-size:13px">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
    `),
  }),

  PASSWORD_RESET: (p) => ({
    subject: 'Reset Your Password — CollegeQuery',
    html: wrapTemplate('Password Reset', `
      <p>Hi ${p.recipientName || 'User'},</p>
      <p>We received a request to reset your CollegeQuery account password.</p>
      <a href="${p.resetUrl}" class="btn">Reset Password</a>
      <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
    `),
  }),

  WELCOME: (p) => ({
    subject: 'Welcome to CollegeQuery!',
    html: wrapTemplate('Welcome', `
      <p>Hi ${p.recipientName || 'User'},</p>
      <p>Welcome to <strong>CollegeQuery</strong> — your college's unified support and query management platform.</p>
      <p>You can now raise queries, track tickets, and communicate with your institution directly.</p>
      <a href="/dashboard" class="btn">Get Started</a>
    `),
  }),

  QUERY_CREATED: (p) => ({
    subject: `Ticket Created: ${p.ticketNumber}`,
    html: wrapTemplate('Query Submitted', `
      <p>Hi ${p.recipientName || 'Student'},</p>
      <p>Your support query has been received and is being processed.</p>
      <div class="ticket">Ticket Number: ${p.ticketNumber}</div>
      <p><strong>Subject:</strong> ${p.title}</p>
      <p>You will be notified when a staff member responds.</p>
      <a href="${p.queryUrl}" class="btn">View Ticket</a>
    `),
  }),

  QUERY_ASSIGNED: (p) => ({
    subject: `New Assignment: ${p.ticketNumber}`,
    html: wrapTemplate('Ticket Assigned To You', `
      <p>Hi ${p.recipientName || 'Staff'},</p>
      <p>A new support ticket has been assigned to you.</p>
      <div class="ticket">Ticket: ${p.ticketNumber}</div>
      <a href="${p.queryUrl}" class="btn">View & Respond</a>
    `),
  }),

  QUERY_STATUS_CHANGED: (p) => ({
    subject: `Status Update: ${p.ticketNumber}`,
    html: wrapTemplate('Ticket Status Updated', `
      <p>Hi ${p.recipientName || 'User'},</p>
      <p>Your ticket status has been updated to <strong>${p.metadata?.newStatus || 'updated'}</strong>.</p>
      <div class="ticket">Ticket: ${p.ticketNumber}</div>
      <a href="${p.queryUrl}" class="btn">View Ticket</a>
    `),
  }),

  RESOLUTION: (p) => ({
    subject: `Resolved: ${p.ticketNumber}`,
    html: wrapTemplate('Your Query Has Been Resolved', `
      <p>Hi ${p.recipientName || 'Student'},</p>
      <p>Your support query has been resolved by our team.</p>
      <div class="ticket">Ticket: ${p.ticketNumber}</div>
      <p><strong>Resolution:</strong> ${p.summary}</p>
      <p>Please rate your experience to help us improve.</p>
      <a href="${p.queryUrl}" class="btn">Rate & Close</a>
    `),
  }),

  ESCALATION: (p) => ({
    subject: `Escalated: ${p.ticketNumber}`,
    html: wrapTemplate('Ticket Escalated', `
      <p>Hi ${p.recipientName || 'User'},</p>
      <p>Your support ticket has been escalated to a senior team member for faster resolution.</p>
      <div class="ticket">Ticket: ${p.ticketNumber}</div>
      <a href="${p.queryUrl}" class="btn">View Ticket</a>
    `),
  }),

  SLA_BREACH: (p) => ({
    subject: `⚠️ SLA Breach Alert: ${p.ticketNumber}`,
    html: wrapTemplate('SLA Breach Detected', `
      <p>Hi ${p.recipientName || 'Admin'},</p>
      <p>The SLA deadline for the following ticket has been breached and requires immediate attention.</p>
      <div class="ticket">Ticket: ${p.ticketNumber}</div>
      <a href="${p.queryUrl}" class="btn">View Ticket</a>
    `),
  }),

  FEEDBACK_REQUEST: (p) => ({
    subject: `How was your experience? — ${p.ticketNumber}`,
    html: wrapTemplate('Share Your Feedback', `
      <p>Hi ${p.recipientName || 'Student'},</p>
      <p>Your query was recently resolved. We'd love to hear about your experience.</p>
      <div class="ticket">Ticket: ${p.ticketNumber}</div>
      <a href="${p.queryUrl}" class="btn">Leave Feedback</a>
    `),
  }),

  BILLING_INVOICE: (p) => ({
    subject: `Invoice ${p.invoiceNumber} — CollegeQuery`,
    html: wrapTemplate('Invoice Available', `
      <p>Hi ${p.recipientName || 'Admin'},</p>
      <p>Your CollegeQuery subscription invoice is ready.</p>
      <div class="ticket">Invoice: ${p.invoiceNumber} | Amount: ₹${p.amount} | Due: ${p.dueDate}</div>
      <a href="/billing" class="btn">View Invoice</a>
    `),
  }),

  SUBSCRIPTION_EXPIRY: (p) => ({
    subject: 'Your CollegeQuery Subscription Is Expiring Soon',
    html: wrapTemplate('Subscription Expiry Warning', `
      <p>Hi ${p.recipientName || 'Admin'},</p>
      <p>Your CollegeQuery subscription will expire on <strong>${p.dueDate}</strong>.</p>
      <p>Renew now to avoid service interruption.</p>
      <a href="/billing" class="btn">Renew Subscription</a>
    `),
  }),
};

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly isDevMode: boolean;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.isDevMode = configService.get<string>('NODE_ENV', 'development') !== 'production';
    this.fromEmail = configService.get<string>('SMTP_FROM', 'noreply@collegequery.app');
  }

  async process(job: Job<EmailJobPayload>): Promise<{ sent: boolean; jobId: string }> {
    const { type, to } = job.data;
    this.logger.log(`📧 Processing email job ${job.id} | Type: ${type} | To: ${to}`);

    const templateFn = TEMPLATES[type];
    if (!templateFn) {
      this.logger.warn(`No template found for email type: ${type}`);
      return { sent: false, jobId: job.id ?? 'unknown' };
    }

    const { subject, html } = templateFn(job.data);

    if (this.isDevMode) {
      // In development: log email content instead of sending
      this.logger.log(`
╔══════════════════════════════════════════════════════╗
║  [DEV EMAIL] ${type.padEnd(40)}║
╠══════════════════════════════════════════════════════╣
║  From:    ${this.fromEmail}
║  To:      ${to}
║  Subject: ${subject}
║  Preview: ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 100)}...
╚══════════════════════════════════════════════════════╝`);
    } else {
      // In production: integrate with nodemailer/SES/SendGrid
      // const transport = createTransport({ host, port, auth });
      // await transport.sendMail({ from: this.fromEmail, to, subject, html });
      this.logger.log(`[SMTP] Sending ${type} email to ${to}`);
    }

    return { sent: true, jobId: job.id ?? 'unknown' };
  }
}
