import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { TenantContext } from '../context/tenant.context.js';

@Injectable()
export class SuperAdminImpersonationGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminImpersonationGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetTenantId = request.headers['x-act-as-tenant-id'] as string;
    const impersonationReason = (request.headers['x-impersonation-reason'] as string) || 'Operational support';

    // If no impersonation header is requested, proceed normally
    if (!targetTenantId) {
      return true;
    }

    // Only SaaS Super Admins can impersonate
    if (!user || !user.isSuperAdmin) {
      this.logger.warn(`Unauthorized impersonation attempt by non-super-admin user: ${user?.id}`);
      throw new ForbiddenException('Only SaaS Super Admins can impersonate college tenants.');
    }

    // Verify user has explicit impersonation permission
    const permissions: string[] = user.permissions || [];
    if (!permissions.includes('platform:tenant:impersonate')) {
      throw new ForbiddenException('Missing required system permission: platform:tenant:impersonate');
    }

    // Verify target tenant exists and is not deactivated
    const targetTenant = await this.prisma.tenant.findUnique({
      where: { id: targetTenantId },
    });

    if (!targetTenant) {
      throw new NotFoundException(`Target tenant '${targetTenantId}' does not exist.`);
    }

    if (targetTenant.status === 'DEACTIVATED') {
      throw new ForbiddenException(`Cannot impersonate an archived/deactivated tenant.`);
    }

    // Record immutable audit entry
    await this.prisma.auditLog.create({
      data: {
        tenantId: targetTenantId,
        userId: user.id,
        action: 'SUPER_ADMIN_IMPERSONATION',
        entityName: 'Tenant',
        entityId: targetTenantId,
        oldValues: { originalTenantId: user.tenantId || null },
        newValues: {
          impersonatedTenantId: targetTenantId,
          slug: targetTenant.slug,
          reason: impersonationReason,
        },
        ipAddress: request.ip || null,
        userAgent: request.headers['user-agent'] || null,
      },
    });

    this.logger.log(
      `[AUDIT] Super Admin '${user.email}' is impersonating Tenant '${targetTenant.slug}' (${targetTenantId}) | Reason: "${impersonationReason}"`,
    );

    // Preserve original Super Admin identity while executing in target tenant context
    request.user = {
      ...user,
      originalSuperAdminId: user.id,
      isImpersonating: true,
      tenantId: targetTenantId,
      impersonationReason,
    };

    // Auto-scope downstream queries to target tenant
    TenantContext.setTenantId(targetTenantId);

    return true;
  }
}
