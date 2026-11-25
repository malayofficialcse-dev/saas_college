// ==============================================================================
// CollegeQuery SaaS — Tenant Guard
// ==============================================================================

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';
export const IS_GLOBAL_TENANT_KEY = 'isGlobalTenant';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isGlobalTenant = this.reflector.getAllAndOverride<boolean>(IS_GLOBAL_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isGlobalTenant) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SaaS Super Admin has cross-tenant privileges when explicitly impersonating
    if (user?.isSuperAdmin) {
      return true;
    }

    // Authenticated non-super-admin user must have a valid tenantId
    if (!user || !user.tenantId) {
      throw new ForbiddenException('User is not associated with an authorized tenant.');
    }

    // Verify tenant resolution consistency
    const resolvedTenantId = request.resolvedTenantId;
    if (resolvedTenantId && resolvedTenantId !== user.tenantId) {
      throw new ForbiddenException('Cross-tenant data access is strictly forbidden.');
    }

    return true;
  }
}
