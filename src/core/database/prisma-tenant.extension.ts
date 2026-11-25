// ==============================================================================
// CollegeQuery SaaS — Tenant-Aware Prisma Client Extension
// ==============================================================================

import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../../common/context/tenant.context.js';

// Models that are globally managed (no tenantId column required)
const GLOBAL_MODELS = ['Tenant', 'TenantConfig', 'Plan', 'Permission', 'RolePermission', 'OutboxEvent'];

export function createTenantPrismaClient(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const tenant = TenantContext.get();

          // If no active tenant or model is global, execute unchanged
          if (!tenant || GLOBAL_MODELS.includes(model)) {
            return query(args);
          }

          // Super Admin cross-tenant bypass if not acting as a specific tenant
          if (tenant.isSuperAdmin && !tenant.tenantId) {
            return query(args);
          }

          const tenantId = tenant.tenantId;

          // Auto-inject tenantId where filter on read/update/delete operations
          if (['findFirst', 'findMany', 'findUnique', 'count', 'update', 'delete', 'updateMany', 'deleteMany'].includes(operation)) {
            args.where = {
              ...args.where,
              tenantId,
            };
          }

          // Auto-stamp tenantId on create operations
          if (operation === 'create') {
            args.data = {
              ...args.data,
              tenantId,
            };
          }

          if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item: any) => ({ ...item, tenantId }));
            }
          }

          return query(args);
        },
      },
    },
  });
}
