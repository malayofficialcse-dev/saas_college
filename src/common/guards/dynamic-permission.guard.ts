// ==============================================================================
// CollegeQuery SaaS — Dynamic Permission Guard (RBAC)
// ==============================================================================

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';

@Injectable()
export class DynamicPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If endpoint has no specific permission requirements, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Authentication required to verify permissions.');
    }

    // SaaS Super Admin bypasses all role permission restrictions
    if (user.isSuperAdmin) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasAllRequired = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAllRequired) {
      const missing = requiredPermissions.filter((perm) => !userPermissions.includes(perm));
      throw new ForbiddenException(
        `Insufficient permissions. Missing required permissions: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
