// ==============================================================================
// CollegeQuery SaaS — Database Module
// ==============================================================================

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { createTenantPrismaClient } from './prisma-tenant.extension.js';

export const TENANT_PRISMA_CLIENT = 'TENANT_PRISMA_CLIENT';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: TENANT_PRISMA_CLIENT,
      useFactory: (prisma: PrismaService) => createTenantPrismaClient(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [PrismaService, TENANT_PRISMA_CLIENT],
})
export class DatabaseModule {}
