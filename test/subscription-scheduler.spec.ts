import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionSchedulerService } from '../src/modules/subscriptions/subscription-scheduler.service.js';
import { SubscriptionStatus } from '@prisma/client';

describe('SubscriptionSchedulerService', () => {
  let scheduler: SubscriptionSchedulerService;
  let mockPrisma: any;
  let mockSubscriptionsService: any;

  beforeEach(() => {
    mockPrisma = {
      subscription: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockSubscriptionsService = {
      renewSubscription: vi.fn(),
      enterGracePeriod: vi.fn(),
      suspendSubscription: vi.fn(),
    };

    scheduler = new SubscriptionSchedulerService(mockPrisma, mockSubscriptionsService);
  });

  it('1. processExpiredPeriods renews free plans directly', async () => {
    const expiredFree = {
      id: 'sub-free-1',
      tenantId: 'tenant-1',
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      plan: { priceMonthly: 0 },
    };

    mockPrisma.subscription.findMany.mockResolvedValueOnce([expiredFree]);

    const count = await scheduler.processExpiredPeriods();

    expect(count).toBe(1);
    expect(mockSubscriptionsService.renewSubscription).toHaveBeenCalledWith(
      'tenant-1',
      'sub-free-1',
    );
    expect(mockSubscriptionsService.enterGracePeriod).not.toHaveBeenCalled();
  });

  it('2. processExpiredPeriods transitions paid plans into grace period and issues renewal invoice', async () => {
    const expiredPaid = {
      id: 'sub-paid-1',
      tenantId: 'tenant-2',
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      plan: { priceMonthly: 1999 },
    };

    mockPrisma.subscription.findMany.mockResolvedValueOnce([expiredPaid]);

    const count = await scheduler.processExpiredPeriods();

    expect(count).toBe(1);
    expect(mockSubscriptionsService.enterGracePeriod).toHaveBeenCalledWith(
      'tenant-2',
      'sub-paid-1',
    );
    expect(mockSubscriptionsService.renewSubscription).toHaveBeenCalledWith(
      'tenant-2',
      'sub-paid-1',
    );
  });

  it('3. processExpiredPeriods cancels subscriptions flagged with cancelAtPeriodEnd', async () => {
    const cancelSub = {
      id: 'sub-cancel-1',
      tenantId: 'tenant-3',
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: true,
      plan: { priceMonthly: 1999 },
    };

    mockPrisma.subscription.findMany.mockResolvedValueOnce([cancelSub]);

    const count = await scheduler.processExpiredPeriods();

    expect(count).toBe(1);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-cancel-1' },
      data: expect.objectContaining({
        status: SubscriptionStatus.CANCELED,
      }),
    });
    expect(mockSubscriptionsService.renewSubscription).not.toHaveBeenCalled();
  });

  it('4. processExpiredGracePeriods suspends subscriptions past grace period', async () => {
    const overdueSub = {
      id: 'sub-overdue-1',
      tenantId: 'tenant-4',
      status: SubscriptionStatus.PAST_DUE,
    };

    mockPrisma.subscription.findMany.mockResolvedValueOnce([overdueSub]);

    const count = await scheduler.processExpiredGracePeriods();

    expect(count).toBe(1);
    expect(mockSubscriptionsService.suspendSubscription).toHaveBeenCalledWith(
      'tenant-4',
      'sub-overdue-1',
      expect.stringContaining('Grace period expired'),
    );
  });

  it('5. runScheduledChecks coordinates period expiration, grace periods, and cancellations', async () => {
    mockPrisma.subscription.findMany
      .mockResolvedValueOnce([]) // expired periods
      .mockResolvedValueOnce([]) // expired grace periods
      .mockResolvedValueOnce([]); // pending cancellations

    const result = await scheduler.runScheduledChecks();

    expect(result).toEqual({
      renewedOrGrace: 0,
      suspended: 0,
      canceled: 0,
    });
  });
});
