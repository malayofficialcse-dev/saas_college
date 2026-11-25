// ==============================================================================
// CollegeQuery SaaS — Subscriptions Service
// Manages Plans (Free, Starter, Professional, Enterprise), trials, upgrades,
// downgrades, renewals, cancellations, grace periods, suspension, and quotas.
// ==============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BillingCycle, InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  UpsertPlanDto,
  ChangePlanDto,
  CancelSubscriptionDto,
} from './dto/subscription.dto.js';

export const DEFAULT_PLANS = [
  {
    name: 'Free',
    tier: 'FREE',
    priceMonthly: 0,
    priceYearly: 0,
    studentLimit: 100,
    facultyLimit: 10,
    staffLimit: 5,
    queryLimitMonthly: 200,
    storageLimitMb: 512,
    trialDays: 0,
    gracePeriodDays: 3,
    featuresJson: {
      slaAutomation: false,
      knowledgeBase: true,
      customBranding: false,
      apiAccess: false,
      analyticsExport: false,
    },
  },
  {
    name: 'Starter',
    tier: 'STARTER',
    priceMonthly: 1999,
    priceYearly: 19990,
    studentLimit: 1000,
    facultyLimit: 50,
    staffLimit: 25,
    queryLimitMonthly: 2000,
    storageLimitMb: 5120,
    trialDays: 14,
    gracePeriodDays: 7,
    featuresJson: {
      slaAutomation: true,
      knowledgeBase: true,
      customBranding: false,
      apiAccess: false,
      analyticsExport: false,
    },
  },
  {
    name: 'Professional',
    tier: 'PROFESSIONAL',
    priceMonthly: 4999,
    priceYearly: 49990,
    studentLimit: 5000,
    facultyLimit: 250,
    staffLimit: 100,
    queryLimitMonthly: 15000,
    storageLimitMb: 51200,
    trialDays: 14,
    gracePeriodDays: 7,
    featuresJson: {
      slaAutomation: true,
      knowledgeBase: true,
      customBranding: true,
      apiAccess: true,
      analyticsExport: true,
    },
  },
  {
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    priceMonthly: 14999,
    priceYearly: 149990,
    studentLimit: -1,
    facultyLimit: -1,
    staffLimit: -1,
    queryLimitMonthly: -1,
    storageLimitMb: 512000,
    trialDays: 30,
    gracePeriodDays: 14,
    featuresJson: {
      slaAutomation: true,
      knowledgeBase: true,
      customBranding: true,
      apiAccess: true,
      analyticsExport: true,
      dedicatedSupport: true,
    },
  },
];

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultPlans() {
    const results = [];
    for (const plan of DEFAULT_PLANS) {
      const upserted = await this.prisma.plan.upsert({
        where: { tier: plan.tier },
        create: plan,
        update: plan,
      });
      results.push(upserted);
    }
    return results;
  }

  async upsertPlan(dto: UpsertPlanDto) {
    return this.prisma.plan.upsert({
      where: { tier: dto.tier },
      create: {
        name: dto.name,
        tier: dto.tier,
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        studentLimit: dto.studentLimit,
        facultyLimit: dto.facultyLimit,
        staffLimit: dto.staffLimit ?? 10,
        queryLimitMonthly: dto.queryLimitMonthly ?? 500,
        storageLimitMb: dto.storageLimitMb ?? 1024,
        trialDays: dto.trialDays ?? 14,
        gracePeriodDays: dto.gracePeriodDays ?? 7,
        featuresJson: dto.featuresJson,
      },
      update: {
        name: dto.name,
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        studentLimit: dto.studentLimit,
        facultyLimit: dto.facultyLimit,
        staffLimit: dto.staffLimit,
        queryLimitMonthly: dto.queryLimitMonthly,
        storageLimitMb: dto.storageLimitMb,
        trialDays: dto.trialDays,
        gracePeriodDays: dto.gracePeriodDays,
        featuresJson: dto.featuresJson,
      },
    });
  }

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  async getCurrentSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) {
      throw new NotFoundException('No active subscription found for this tenant.');
    }
    return sub;
  }

  async startTrial(
    tenantId: string,
    planTier: string,
    billingCycle: BillingCycle = BillingCycle.MONTHLY,
    actorUserId?: string,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { tier: planTier } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException(`Plan tier '${planTier}' not found.`);
    }

    const now = new Date();
    const trialDays = plan.trialDays > 0 ? plan.trialDays : 14;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          tenantId,
          planId: plan.id,
          status: plan.tier === 'FREE' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIALING,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          trialEndsAt: plan.tier === 'FREE' ? null : trialEndsAt,
        },
        include: { plan: true },
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: { subscriptionId: sub.id },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId ?? null,
          action: 'SUBSCRIPTION_STARTED',
          entityName: 'Subscription',
          entityId: sub.id,
          newValues: { planTier: plan.tier, status: sub.status, trialEndsAt },
        },
      });

      return sub;
    });
  }

  /**
   * Request plan upgrade or downgrade.
   * NEVER activates a paid plan immediately without backend-verified payment.
   * For paid upgrades, creates an OPEN Invoice with targetPlanId and returns it.
   */
  async requestPlanChange(tenantId: string, dto: ChangePlanDto, actorUserId: string) {
    const sub = await this.getCurrentSubscription(tenantId);
    const targetPlan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!targetPlan || !targetPlan.isActive) {
      throw new NotFoundException(`Target plan '${dto.planId}' not found.`);
    }

    const cycle = dto.billingCycle ?? sub.billingCycle;
    const targetPrice = Number(
      cycle === BillingCycle.ANNUAL ? targetPlan.priceYearly : targetPlan.priceMonthly,
    );

    // Free plan or zero-amount downgrade can take effect immediately or at period end
    if (targetPrice === 0) {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.subscription.update({
          where: { id: sub.id },
          data: {
            planId: targetPlan.id,
            pendingPlanId: null,
            billingCycle: cycle,
            status: SubscriptionStatus.ACTIVE,
            gracePeriodEndsAt: null,
          },
          include: { plan: true },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: actorUserId,
            action: 'SUBSCRIPTION_CHANGED_TO_FREE',
            entityName: 'Subscription',
            entityId: sub.id,
            oldValues: { planId: sub.planId },
            newValues: { planId: targetPlan.id },
          },
        });

        return { subscription: updated, requiresPayment: false, invoice: null };
      });
    }

    // Paid plan: create an OPEN invoice; plan is activated ONLY upon verified payment
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data: { pendingPlanId: targetPlan.id },
      });

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          subscriptionId: sub.id,
          targetPlanId: targetPlan.id,
          billingCycle: cycle,
          invoiceNumber,
          description: `Subscription ${targetPlan.name} (${cycle})`,
          amount: targetPrice,
          currency: 'INR',
          status: InvoiceStatus.OPEN,
          dueDate,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'SUBSCRIPTION_UPGRADE_INVOICE_CREATED',
          entityName: 'Invoice',
          entityId: invoice.id,
          newValues: { targetPlanId: targetPlan.id, amount: targetPrice, billingCycle: cycle },
        },
      });

      return { subscription: updated, requiresPayment: true, invoice };
    });
  }

  /**
   * Called ONLY by PaymentsService after backend signature/webhook verification.
   */
  async activateSubscriptionFromPayment(
    tx: any,
    subscriptionId: string,
    targetPlanId: string | null,
    billingCycle: BillingCycle,
  ) {
    const sub = await tx.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) return null;

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === BillingCycle.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: targetPlanId ?? sub.planId,
        pendingPlanId: null,
        status: SubscriptionStatus.ACTIVE,
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        gracePeriodEndsAt: null,
        suspendedAt: null,
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });
  }

  async renewSubscription(tenantId: string, subscriptionId: string, actorUserId?: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException(`Subscription '${subscriptionId}' not found.`);
    }
    if (sub.cancelAtPeriodEnd) {
      throw new BadRequestException('Cannot renew a subscription marked for cancellation.');
    }

    const price = Number(
      sub.billingCycle === BillingCycle.ANNUAL ? sub.plan.priceYearly : sub.plan.priceMonthly,
    );

    // Free plan renews directly
    if (price === 0) {
      const now = new Date();
      const nextEnd = new Date(now);
      nextEnd.setMonth(nextEnd.getMonth() + 1);

      return this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: nextEnd,
        },
        include: { plan: true },
      });
    }

    // Paid plan generates renewal invoice (becomes ACTIVE once paid)
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const dueDate = new Date(Date.now() + (sub.plan.gracePeriodDays || 7) * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          subscriptionId: sub.id,
          targetPlanId: sub.planId,
          billingCycle: sub.billingCycle,
          invoiceNumber,
          description: `Renewal: ${sub.plan.name} (${sub.billingCycle})`,
          amount: price,
          currency: 'INR',
          status: InvoiceStatus.OPEN,
          dueDate,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId ?? null,
          action: 'SUBSCRIPTION_RENEWAL_INVOICED',
          entityName: 'Invoice',
          entityId: invoice.id,
          newValues: { subscriptionId: sub.id, amount: price },
        },
      });

      return { subscription: sub, invoice };
    });
  }

  async cancelSubscription(tenantId: string, dto: CancelSubscriptionDto, actorUserId: string) {
    const sub = await this.getCurrentSubscription(tenantId);
    const immediate = dto.cancelAtPeriodEnd === false;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          cancelAtPeriodEnd: !immediate,
          canceledAt: new Date(),
          status: immediate ? SubscriptionStatus.CANCELED : sub.status,
        },
        include: { plan: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'SUBSCRIPTION_CANCELED',
          entityName: 'Subscription',
          entityId: sub.id,
          newValues: { immediate, reason: dto.reason },
        },
      });

      return updated;
    });
  }

  async enterGracePeriod(tenantId: string, subscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('Subscription not found.');

    const graceDays = sub.plan.gracePeriodDays || 7;
    const gracePeriodEndsAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndsAt,
      },
    });
  }

  async suspendSubscription(
    tenantId: string,
    subscriptionId: string,
    reason: string,
    actorUserId?: string,
  ) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
    });
    if (!sub) throw new NotFoundException('Subscription not found.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: SubscriptionStatus.SUSPENDED,
          suspendedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId ?? null,
          action: 'SUBSCRIPTION_SUSPENDED',
          entityName: 'Subscription',
          entityId: sub.id,
          newValues: { reason },
        },
      });

      return updated;
    });
  }

  async checkFeatureAccess(tenantId: string, featureKey: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) return false;

    const isWithinGrace =
      sub.status === SubscriptionStatus.PAST_DUE &&
      sub.gracePeriodEndsAt !== null &&
      sub.gracePeriodEndsAt.getTime() > Date.now();

    const isAllowedStatus =
      sub.status === SubscriptionStatus.ACTIVE ||
      sub.status === SubscriptionStatus.TRIALING ||
      isWithinGrace;

    if (!isAllowedStatus) return false;

    const features = (sub.plan.featuresJson as Record<string, any>) || {};
    return Boolean(features[featureKey]);
  }

  async assertQuota(
    tenantId: string,
    resource: 'students' | 'faculty' | 'staff' | 'queries' | 'storage',
  ) {
    const sub = await this.getCurrentSubscription(tenantId);
    if (
      sub.status === SubscriptionStatus.SUSPENDED ||
      sub.status === SubscriptionStatus.CANCELED ||
      sub.status === SubscriptionStatus.EXPIRED
    ) {
      throw new ForbiddenException(`Subscription is ${sub.status}. Please renew to continue.`);
    }

    const plan = sub.plan;
    let limit = -1;
    let current = 0;

    if (resource === 'students') {
      limit = plan.studentLimit;
      current = await this.prisma.student.count({ where: { tenantId } });
    } else if (resource === 'faculty') {
      limit = plan.facultyLimit;
      current = await this.prisma.faculty.count({ where: { tenantId } });
    } else if (resource === 'staff') {
      limit = plan.staffLimit;
      current = await this.prisma.employee.count({ where: { tenantId } });
    } else if (resource === 'queries') {
      limit = plan.queryLimitMonthly;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      current = await this.prisma.query.count({
        where: { tenantId, createdAt: { gte: monthStart } },
      });
    } else if (resource === 'storage') {
      limit = plan.storageLimitMb;
      const agg = await this.prisma.attachment.aggregate({
        where: { tenantId },
        _sum: { fileSizeBytes: true },
      });
      current = Math.ceil((agg._sum.fileSizeBytes || 0) / (1024 * 1024));
    }

    if (limit !== -1 && current >= limit) {
      throw new ForbiddenException(
        `Plan quota exceeded for '${resource}' (${current}/${limit}). Please upgrade your subscription.`,
      );
    }

    return { allowed: true, current, limit };
  }
}
