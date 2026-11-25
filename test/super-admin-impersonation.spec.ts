import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SuperAdminImpersonationGuard } from '../src/common/guards/super-admin-impersonation.guard.js';

describe('Super Admin Impersonation & Audit Trail Suite', () => {
  let impersonationGuard: SuperAdminImpersonationGuard;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    impersonationGuard = new SuperAdminImpersonationGuard(mockPrisma as any);
  });

  const createMockContext = (user: any, headers: Record<string, string>): ExecutionContext => {
    const request = {
      user,
      headers,
      ip: '127.0.0.1',
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should pass through when x-act-as-tenant-id header is omitted', async () => {
    const context = createMockContext({ id: 'user-1' }, {});
    const result = await impersonationGuard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should reject impersonation when initiated by a non-super-admin user', async () => {
    const context = createMockContext(
      { id: 'college-admin-1', isSuperAdmin: false },
      { 'x-act-as-tenant-id': 'tenant-b' },
    );

    await expect(impersonationGuard.canActivate(context)).rejects.toThrow(
      'Only SaaS Super Admins can impersonate college tenants.',
    );
  });

  it('should reject impersonation when Super Admin lacks platform:tenant:impersonate permission', async () => {
    const context = createMockContext(
      { id: 'super-admin-1', isSuperAdmin: true, permissions: [] },
      { 'x-act-as-tenant-id': 'tenant-b' },
    );

    await expect(impersonationGuard.canActivate(context)).rejects.toThrow(
      'Missing required system permission: platform:tenant:impersonate',
    );
  });

  it('should reject impersonation when target tenant does not exist in database', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);

    const context = createMockContext(
      {
        id: 'super-admin-1',
        isSuperAdmin: true,
        permissions: ['platform:tenant:impersonate'],
      },
      { 'x-act-as-tenant-id': 'non-existent-uuid' },
    );

    await expect(impersonationGuard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should allow valid impersonation and record an immutable audit log entry', async () => {
    const targetTenant = { id: 'tenant-xyz', slug: 'stjude-engineering' };
    mockPrisma.tenant.findUnique.mockResolvedValue(targetTenant);

    const context = createMockContext(
      {
        id: 'super-admin-1',
        email: 'superadmin@collegequery.com',
        isSuperAdmin: true,
        permissions: ['platform:tenant:impersonate'],
      },
      {
        'x-act-as-tenant-id': 'tenant-xyz',
        'user-agent': 'Chrome/120.0',
      },
    );

    const result = await impersonationGuard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-xyz',
        userId: 'super-admin-1',
        action: 'SUPER_ADMIN_IMPERSONATION',
        entityName: 'Tenant',
        entityId: 'tenant-xyz',
        newValues: expect.objectContaining({ impersonatedTenantId: 'tenant-xyz', slug: 'stjude-engineering' }),
      }),
    });
  });
});
