// ==============================================================================
// CollegeQuery SaaS — Billing Service
// Subscription lifecycle overview, invoices, billing history, usage tracking,
// renewal dates, payment status, and billing email notifications.
// ==============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getInvoices(
    tenantId: string,
    options: { status?: InvoiceStatus; page?: number; limit?: number } = {},
  ) {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: { payments: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getInvoiceById(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        payments: true,
        subscription: { include: { plan: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice '${invoiceId}' not found.`);
    }
    return invoice;
  }

  async getUsageSummary(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) {
      throw new NotFoundException('No subscription found for this tenant.');
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [studentsCount, facultyCount, staffCount, queriesThisMonth, storageAgg] =
      await Promise.all([
        this.prisma.student.count({ where: { tenantId } }),
        this.prisma.faculty.count({ where: { tenantId } }),
        this.prisma.employee.count({ where: { tenantId } }),
        this.prisma.query.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
        this.prisma.attachment.aggregate({
          where: { tenantId },
          _sum: { fileSizeBytes: true },
        }),
      ]);

    const storageUsedMb = Number(
      ((storageAgg._sum.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2),
    );

    return {
      subscription: {
        id: sub.id,
        status: sub.status,
        billingCycle: sub.billingCycle,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        renewalDate: sub.cancelAtPeriodEnd ? null : sub.currentPeriodEnd,
        trialEndsAt: sub.trialEndsAt,
        gracePeriodEndsAt: sub.gracePeriodEndsAt,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      },
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        tier: sub.plan.tier,
        features: sub.plan.featuresJson,
      },
      usage: {
        students: { used: studentsCount, limit: sub.plan.studentLimit },
        faculty: { used: facultyCount, limit: sub.plan.facultyLimit },
        staff: { used: staffCount, limit: sub.plan.staffLimit },
        queriesMonthly: { used: queriesThisMonth, limit: sub.plan.queryLimitMonthly },
        storageMb: { used: storageUsedMb, limit: sub.plan.storageLimitMb },
      },
    };
  }

  async getBillingHistory(tenantId: string) {
    const [subscription, invoices, payments] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { tenantId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.payment.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return { subscription, invoices, payments };
  }

  async notifyInvoiceIssued(tenantId: string, invoiceId: string, adminEmail: string, adminName: string) {
    const invoice = await this.getInvoiceById(tenantId, invoiceId);
    await this.emailService.sendInvoiceEmail(
      adminEmail,
      adminName,
      invoice.invoiceNumber,
      String(invoice.amount),
      invoice.dueDate.toISOString().split('T')[0],
    );
    return { queued: true, invoiceNumber: invoice.invoiceNumber };
  }
}
