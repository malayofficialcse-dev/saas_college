import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from '../src/common/guards/tenant.guard.js';
import { TenantContext } from '../src/common/context/tenant.context.js';
import { createTenantPrismaClient } from '../src/core/database/prisma-tenant.extension.js';

describe('Multi-Tenant Data Isolation Suite', () => {
  let tenantGuard: TenantGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    tenantGuard = new TenantGuard(reflector);
  });

  const createMockContext = (user: any, resolvedTenantId?: string): ExecutionContext => {
    const request = {
      user,
      resolvedTenantId,
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

  describe('TenantGuard Isolation Checks', () => {
    it('should deny access if user has no tenant association and is not Super Admin', () => {
      const context = createMockContext({ id: 'user-1', tenantId: null, isSuperAdmin: false });
      expect(() => tenantGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject request when resolved tenant header mismatches user tenant', () => {
      const context = createMockContext(
        { id: 'user-1', tenantId: 'tenant-A', isSuperAdmin: false },
        'tenant-B', // Attempting to access Tenant B
      );

      expect(() => tenantGuard.canActivate(context)).toThrow('Cross-tenant data access is strictly forbidden.');
    });

    it('should allow access when user tenant matches resolved tenant', () => {
      const context = createMockContext(
        { id: 'user-1', tenantId: 'tenant-A', isSuperAdmin: false },
        'tenant-A',
      );

      expect(tenantGuard.canActivate(context)).toBe(true);
    });

    it('should allow SaaS Super Admin access across any tenant', () => {
      const context = createMockContext(
        { id: 'admin-1', tenantId: null, isSuperAdmin: true },
        'tenant-XYZ',
      );

      expect(tenantGuard.canActivate(context)).toBe(true);
    });
  });

  describe('Tenant-Aware Prisma Client Auto-Scoping', () => {
    it('should automatically inject tenantId into where clause of database queries', async () => {
      const mockQueryFn = vi.fn().mockImplementation((args) => Promise.resolve(args));

      const mockPrismaBase: any = {
        $extends: vi.fn().mockImplementation((extension) => {
          return {
            query: {
              findMany: async (args: any) => {
                return extension.query.$allModels.$allOperations({
                  model: 'Query',
                  operation: 'findMany',
                  args,
                  query: mockQueryFn,
                });
              },
            },
          };
        }),
      };

      const tenantClient = createTenantPrismaClient(mockPrismaBase);

      await TenantContext.run({ tenantId: 'college-campus-10', tenantSlug: 'acme' }, async () => {
        const queryArgs = { where: { status: 'OPEN' } } as any;
        const result: any = await (tenantClient.query as any).findMany(queryArgs);

        expect(result.where).toHaveProperty('tenantId', 'college-campus-10');
        expect(result.where).toHaveProperty('status', 'OPEN');
      });
    });

    it('should automatically stamp tenantId on create operations', async () => {
      const mockQueryFn = vi.fn().mockImplementation((args) => Promise.resolve(args));

      const mockPrismaBase: any = {
        $extends: vi.fn().mockImplementation((extension) => {
          return {
            query: {
              create: async (args: any) => {
                return extension.query.$allModels.$allOperations({
                  model: 'Query',
                  operation: 'create',
                  args,
                  query: mockQueryFn,
                });
              },
            },
          };
        }),
      };

      const tenantClient = createTenantPrismaClient(mockPrismaBase);

      await TenantContext.run({ tenantId: 'college-campus-99', tenantSlug: 'stjude' }, async () => {
        const createArgs = { data: { title: 'Fee Inquiry' } } as any;
        const result: any = await (tenantClient.query as any).create(createArgs);

        expect(result.data).toHaveProperty('tenantId', 'college-campus-99');
        expect(result.data).toHaveProperty('title', 'Fee Inquiry');
      });
    });
  });
});
