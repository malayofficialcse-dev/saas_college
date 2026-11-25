// ==============================================================================
// CollegeQuery SaaS – Subscription Lifecycle Scheduler Service
// Handles automated renewals, grace-period transitions, and subscription suspensions.
// ==============================================================================

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  onModuleInit() {
    // Run automated subscription check every 5 minutes (300,000 ms)
    this.timer = setInterval(() => this.runScheduledChecks(), 300000);
    this.logger.log('✅ Subscription Lifecycle Scheduler initialized.');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Run all subscription lifecycle checks
   */
  async runScheduledChecks(): Promise<{
    renewedOrGrace: number;
    suspended: number;
    canceled: number;
  }> {
    if (this.isRunning) {
      return { renewedOrGrace: 0, suspended: 0, canceled: 0 };
    }
    this.isRunning = true;

    try {
      const renewedOrGrace = await this.processExpiredPeriods();
      const suspended = await this.processExpiredGracePeriods();
      const canceled = await this.processPendingCancellations();

      return { renewedOrGrace, suspended, canceled };
    } catch (err: any) {
      this.logger.error(`Error during subscription scheduler run: ${err.message}`, err.stack);
      return { renewedOrGrace: 0, suspended: 0, canceled: 0 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 1. Check subscriptions where current period has ended
   */
  async processExpiredPeriods(): Promise<number> {
    const now = new Date();

    const expiredSubs = await this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        currentPeriodEnd: { lt: now },
      },
      include: { plan: true },
      take: 100,
    });

    let count = 0;
    for (const sub of expiredSubs) {
      try {
        if (sub.cancelAtPeriodEnd) {
          // Subscription was marked to cancel at period end
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: SubscriptionStatus.CANCELED,
              canceledAt: now,
            },
          });
          await this.prisma.auditLog.create({
            data: {
              tenantId: sub.tenantId,
              action: 'SUBSCRIPTION_CANCELED_AT_PERIOD_END',
              entityName: 'Subscription',
              entityId: sub.id,
            },
          });
          count++;
          continue;
        }

        const isFree = Number(sub.plan.priceMonthly) === 0;
        if (isFree) {
          // Free plans renew directly
          await this.subscriptionsService.renewSubscription(sub.tenantId, sub.id);
        } else {
          // Paid plans enter grace period and generate renewal invoice
          await this.subscriptionsService.enterGracePeriod(sub.tenantId, sub.id);
          await this.subscriptionsService.renewSubscription(sub.tenantId, sub.id);
        }
        count++;
      } catch (err: any) {
        this.logger.error(
          `Failed to process period expiration for subscription ${sub.id}: ${err.message}`,
        );
      }
    }

    return count;
  }

  /**
   * 2. Check subscriptions where grace period has expired without payment -> Suspend
   */
  async processExpiredGracePeriods(): Promise<number> {
    const now = new Date();

    const overdueSubs = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndsAt: { lt: now },
      },
      take: 100,
    });

    let count = 0;
    for (const sub of overdueSubs) {
      try {
        await this.subscriptionsService.suspendSubscription(
          sub.tenantId,
          sub.id,
          'Grace period expired without settlement of renewal invoice',
        );
        count++;
      } catch (err: any) {
        this.logger.error(
          `Failed to suspend overdue subscription ${sub.id}: ${err.message}`,
        );
      }
    }

    return count;
  }

  /**
   * 3. Process immediate cancellations flagged for immediate action
   */
  async processPendingCancellations(): Promise<number> {
    const now = new Date();

    const pendingCancel = await this.prisma.subscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
        status: { not: SubscriptionStatus.CANCELED },
      },
      take: 50,
    });

    let count = 0;
    for (const sub of pendingCancel) {
      try {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: now,
          },
        });
        count++;
      } catch (err: any) {
        this.logger.error(`Failed to cancel subscription ${sub.id}: ${err.message}`);
      }
    }

    return count;
  }
}
