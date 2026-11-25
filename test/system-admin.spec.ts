import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemAdminService } from '../src/modules/system-admin/system-admin.service.js';
import { TenantStatus, SubscriptionStatus } from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('SystemAdminService', () => {
  let service: SystemAdminService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      query: {
        count: vi.fn(),
      },
      student: {
        count: vi.fn(),
      },
      faculty: {
        count: vi.fn(),
      },
      subscription: {
        findMany: vi.fn(),
      },
      plan: {
        findMany: vi.fn(),
      },
      auditLog: {
        count: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      refreshToken: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('test-secret'),
    };

    service = new SystemAdminService(mockPrisma, mockJwtService, mockConfigService);
  });

  it('1. getPlatformMetrics returns aggregated counts across all colleges', async () => {
    mockPrisma.tenant.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(8);  // active
    mockPrisma.user.count.mockResolvedValueOnce(500);
    mockPrisma.query.count.mockResolvedValueOnce(1200);
    mockPrisma.student.count.mockResolvedValueOnce(450);
    mockPrisma.faculty.count.mockResolvedValueOnce(40);

    const metrics = await service.getPlatformMetrics();

    expect(metrics.totalTenants).toBe(10);
    expect(metrics.activeTenants).toBe(8);
    expect(metrics.totalUsers).toBe(500);
    expect(metrics.totalQueries).toBe(1200);
    expect(metrics.totalStudents).toBe(450);
    expect(metrics.totalFaculty).toBe(40);
  });

  it('2. getTenants returns paginated list with subscription and count data', async () => {
    mockPrisma.tenant.count.mockResolvedValueOnce(1);
    mockPrisma.tenant.findMany.mockResolvedValueOnce([
      {
        id: 'tenant-1',
        name: 'Apex Institute',
        slug: 'apex-inst',
        status: TenantStatus.ACTIVE,
        createdAt: new Date(),
        subscriptions: [
          { status: SubscriptionStatus.ACTIVE, plan: { name: 'Professional' } },
        ],
        _count: {
          students: 150,
          faculty: 15,
          employees: 8,
          queries: 340,
        },
      },
    ]);

    const result = await service.getTenants({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Apex Institute');
    expect(result.items[0].activePlan).toBe('Professional');
    expect(result.items[0].studentsCount).toBe(150);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('3. getTenantDetail throws NotFoundException if tenant not found', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

    await expect(service.getTenantDetail('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('4. getSubscriptionOverview calculates MRR/ARR and tier breakdown', async () => {
    mockPrisma.subscription.findMany.mockResolvedValueOnce([
      {
        status: SubscriptionStatus.ACTIVE,
        billingCycle: 'MONTHLY',
        planId: 'plan-1',
        plan: { priceMonthly: 1999, priceYearly: 19990 },
      },
      {
        status: SubscriptionStatus.ACTIVE,
        billingCycle: 'ANNUAL',
        planId: 'plan-2',
        plan: { priceMonthly: 4999, priceYearly: 49990 },
      },
      {
        status: SubscriptionStatus.PAST_DUE,
        billingCycle: 'MONTHLY',
        planId: 'plan-1',
        plan: { priceMonthly: 1999, priceYearly: 19990 },
      },
    ]);

    mockPrisma.plan.findMany.mockResolvedValueOnce([
      { id: 'plan-1', name: 'Starter' },
      { id: 'plan-2', name: 'Professional' },
    ]);

    const overview = await service.getSubscriptionOverview();

    expect(overview.totalSubscriptions).toBe(3);
    expect(overview.activeSubscriptions).toBe(2);
    expect(overview.pastDueSubscriptions).toBe(1);
    expect(overview.estimatedMrr).toBeGreaterThan(0);
    expect(overview.estimatedArr).toBe(overview.estimatedMrr * 12);
  });

  it('5. updateTenantStatus revokes refresh tokens on suspension', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-1',
      status: TenantStatus.ACTIVE,
    });
    mockPrisma.tenant.update.mockResolvedValueOnce({
      id: 'tenant-1',
      status: TenantStatus.SUSPENDED,
    });
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'u-1' }, { id: 'u-2' }]);

    await service.updateTenantStatus('tenant-1', TenantStatus.SUSPENDED, 'admin-1');

    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: { in: ['u-1', 'u-2'] } },
      data: { isRevoked: true },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'TENANT_STATUS_CHANGED',
        }),
      }),
    );
  });

  it('6. createImpersonationToken denies non-super-admins', async () => {
    await expect(
      service.createImpersonationToken(
        { id: 'user-1', isSuperAdmin: false },
        'tenant-1',
        'Valid reason for support',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('7. createImpersonationToken rejects short or missing reasons', async () => {
    await expect(
      service.createImpersonationToken(
        { id: 'sa-1', isSuperAdmin: true },
        'tenant-1',
        'no',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
