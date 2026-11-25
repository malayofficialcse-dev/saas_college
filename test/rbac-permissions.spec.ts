import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DynamicPermissionGuard } from '../src/common/guards/dynamic-permission.guard.js';

describe('Dynamic RBAC Permission Matrix Suite', () => {
  let permissionGuard: DynamicPermissionGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    permissionGuard = new DynamicPermissionGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    const request = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  describe('Granular Permission Evaluation', () => {
    it('should allow access when endpoint requires no specific permissions', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockContext({ id: 'user-1', permissions: [] });

      expect(permissionGuard.canActivate(context)).toBe(true);
    });

    it('should grant access to SaaS Super Admin regardless of specific role permissions', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['platform:tenants:manage']);
      const context = createMockContext({
        id: 'superadmin-1',
        isSuperAdmin: true,
        permissions: [],
      });

      expect(permissionGuard.canActivate(context)).toBe(true);
    });

    it('should allow Student to create queries when student possesses query:create', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['query:create']);
      const context = createMockContext({
        id: 'student-1',
        userType: 'STUDENT',
        permissions: ['query:create', 'query:view:own', 'query:reply:public'],
      });

      expect(permissionGuard.canActivate(context)).toBe(true);
    });

    it('should block Student from attempting staff actions like query:assign', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['query:assign']);
      const context = createMockContext({
        id: 'student-1',
        userType: 'STUDENT',
        permissions: ['query:create', 'query:view:own'],
      });

      expect(() => permissionGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow Faculty to reply and escalate but block college settings changes', () => {
      const facultyUser = {
        id: 'faculty-1',
        userType: 'FACULTY',
        permissions: ['query:view:assigned', 'query:reply:public', 'query:reply:internal', 'query:escalate'],
      };

      // Faculty can escalate
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['query:escalate']);
      expect(permissionGuard.canActivate(createMockContext(facultyUser))).toBe(true);

      // Faculty cannot modify tenant settings
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['tenant:settings:edit']);
      expect(() => permissionGuard.canActivate(createMockContext(facultyUser))).toThrow(ForbiddenException);
    });

    it('should allow College Admin full administrative and departmental management rights', () => {
      const adminUser = {
        id: 'admin-1',
        userType: 'COLLEGE_ADMIN',
        permissions: [
          'department:manage',
          'course:manage',
          'roles:manage',
          'tenant:settings:edit',
          'query:assign',
          'query:reassign',
          'analytics:view',
        ],
      };

      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['department:manage', 'roles:manage']);
      expect(permissionGuard.canActivate(createMockContext(adminUser))).toBe(true);
    });
  });
});
