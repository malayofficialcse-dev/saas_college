// ==============================================================================
// CollegeQuery SaaS — Identity & Security Acceptance Test Suite
// Verifies all core security guarantees:
// 1. Cross-tenant isolation (College A cannot access College B)
// 2. Student role isolation (Students cannot access administrative endpoints)
// 3. Privilege escalation prevention (Faculty cannot assign permissions they do not possess)
// 4. Rotating refresh token reuse detection
// 5. Account lifecycle status (Disabled accounts cannot authenticate)
// 6. Super Admin impersonation (Time-limited, reason-based, and revokable)
// 7. Comprehensive immutable security audit logging
// ==============================================================================

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { TenantGuard } from '../src/common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../src/common/guards/dynamic-permission.guard.js';
import { SuperAdminImpersonationGuard } from '../src/common/guards/super-admin-impersonation.guard.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { UsersService } from '../src/modules/users/users.service.js';
import { RolesService } from '../src/modules/roles/roles.service.js';
import { SystemAdminService } from '../src/modules/system-admin/system-admin.service.js';

describe('Identity & Security Verification Suite', () => {
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let authService: AuthService;
  let usersService: UsersService;
  let rolesService: RolesService;
  let systemAdminService: SystemAdminService;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      refreshToken: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      role: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      userRole: {
        upsert: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
      },
      permission: {
        findMany: vi.fn(),
      },
      rolePermission: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock.jwt.token'),
      verify: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultVal: any) => defaultVal),
    };

    authService = new AuthService(mockPrisma, mockJwtService, mockConfigService);
    usersService = new UsersService(mockPrisma);
    rolesService = new RolesService(mockPrisma);
    systemAdminService = new SystemAdminService(mockPrisma, mockJwtService, mockConfigService);
  });

  // ----------------------------------------------------------------------------
  // Acceptance Criterion 1: College A cannot access College B
  // ----------------------------------------------------------------------------
  describe('Criterion 1: Cross-Tenant Isolation Enforcement', () => {
    it('should reject request when resolved tenant does not match authenticated user tenant', () => {
      const reflector: any = {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      };
      const guard = new TenantGuard(reflector);

      const mockContext: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'u-1', tenantId: 'college-a-uuid', isSuperAdmin: false },
            resolvedTenantId: 'college-b-uuid', // Attempting cross-tenant access!
          }),
        }),
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow request when resolved tenant matches authenticated user tenant', () => {
      const reflector: any = {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      };
      const guard = new TenantGuard(reflector);

      const mockContext: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'u-1', tenantId: 'college-a-uuid', isSuperAdmin: false },
            resolvedTenantId: 'college-a-uuid',
          }),
        }),
      };

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should prevent UsersService from retrieving user belonging to another tenant', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.findOne('college-a-uuid', 'user-belonging-to-college-b'),
      ).rejects.toThrow('not found in this college');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-belonging-to-college-b', tenantId: 'college-a-uuid' },
        include: expect.any(Object),
      });
    });
  });

  // ----------------------------------------------------------------------------
  // Acceptance Criterion 2: Students cannot access administrative endpoints
  // ----------------------------------------------------------------------------
  describe('Criterion 2: RBAC Role & Permission Boundary Enforcement', () => {
    it('should forbid student user from accessing endpoints requiring admin permissions', () => {
      const reflector: any = {
        getAllAndOverride: vi.fn().mockReturnValue(['platform:tenants:manage', 'student:manage']),
      };
      const guard = new DynamicPermissionGuard(reflector);

      const studentContext: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'student-1',
              userType: 'STUDENT',
              isSuperAdmin: false,
              permissions: ['query:create', 'query:view:own'], // Student only has basic query permissions
            },
          }),
        }),
      };

      expect(() => guard.canActivate(studentContext)).toThrow(ForbiddenException);
    });

    it('should permit administrator user possessing required permissions', () => {
      const reflector: any = {
        getAllAndOverride: vi.fn().mockReturnValue(['student:manage']),
      };
      const guard = new DynamicPermissionGuard(reflector);

      const adminContext: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'admin-1',
              userType: 'COLLEGE_ADMIN',
              isSuperAdmin: false,
              permissions: ['student:manage', 'student:view'],
            },
          }),
        }),
      };

      expect(guard.canActivate(adminContext)).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // Acceptance Criterion 3: Faculty cannot assign permissions they do not possess
  // ----------------------------------------------------------------------------
  describe('Criterion 3: Privilege Escalation Prevention', () => {
    it('should prevent faculty user from assigning permissions they do not possess to a role', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role-sub-admin',
        code: 'SUB_ADMIN',
        tenantId: 'tenant-1',
      });

      const facultyActor = {
        id: 'faculty-10',
        isSuperAdmin: false,
        permissions: ['query:view', 'query:reply'], // Faculty only has view and reply permissions
      };

      // Faculty attempts to grant 'platform:tenants:manage' and 'roles:manage'
      const dto = {
        permissionCodes: ['query:view', 'platform:tenants:manage'],
      };

      await expect(
        rolesService.assignPermissions('tenant-1', 'role-sub-admin', dto, facultyActor),
      ).rejects.toThrowError(/Privilege Escalation Detected/);
    });

    it('should prevent faculty user from assigning a high-privilege role to another user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'target-student-1',
        tenantId: 'tenant-1',
      });

      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role-admin',
        code: 'COLLEGE_ADMIN',
        rolePermissions: [
          { permission: { code: 'roles:manage' } },
          { permission: { code: 'tenant:settings:edit' } },
        ],
      });

      const facultyActor = {
        id: 'faculty-10',
        isSuperAdmin: false,
        permissions: ['query:view'],
      };

      await expect(
        usersService.assignRole('tenant-1', 'target-student-1', 'role-admin', facultyActor),
      ).rejects.toThrowError(/Privilege Escalation Detected/);
    });
  });

  // ----------------------------------------------------------------------------
  // Acceptance Criterion 4: Refresh token reuse is detected
  // ----------------------------------------------------------------------------
  describe('Criterion 4: Token Family Reuse Detection & Invalidation', () => {
    it('should detect reuse of already-revoked refresh token and revoke entire family', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-compromised',
        familyId: 'family-compromised-uuid',
      });

      // Token not found or already revoked
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        authService.refreshToken({ refreshToken: 'compromised.token.reuse' }),
      ).rejects.toThrow('Session terminated due to token reuse detection.');

      // Asserts that the entire token family was invalidated
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-compromised-uuid' },
        data: { isRevoked: true },
      });
    });
  });

  // ----------------------------------------------------------------------------
  // Acceptance Criterion 5: Disabled accounts cannot authenticate
  // ----------------------------------------------------------------------------
  describe('Criterion 5: Account Lifecycle & Deactivation Enforcement', () => {
    it('should block disabled/deactivated account from logging in', async () => {
      const password = 'UserPassword123!';
      const passwordHash = await argon2.hash(password);

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-deactivated',
        email: 'deactivated@college.edu',
        passwordHash,
        isActive: false, // Disabled account
        userRoles: [],
      });

      await expect(
        authService.login({ email: 'deactivated@college.edu', password }),
      ).rejects.toThrow('Your account has been deactivated.');
    });

    it('should immediately revoke all active refresh tokens when account is deactivated', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-to-deactivate',
        tenantId: 'tenant-1',
        isActive: true,
      });

      await usersService.deactivate('tenant-1', 'user-to-deactivate', 'admin-actor');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-to-deactivate' },
        data: { isRevoked: true },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-to-deactivate' },
        data: { isActive: false },
      });
    });
  });

  // ----------------------------------------------------------------------------
  // Acceptance Criterion 6: Impersonation expires and can be revoked
  // ----------------------------------------------------------------------------
  describe('Criterion 6: Secure, Time-Limited Super Admin Impersonation', () => {
    it('should reject non-super-admin from impersonating a college tenant', async () => {
      const guard = new SuperAdminImpersonationGuard(mockPrisma);

      const fakeContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'fake-admin', isSuperAdmin: false },
            headers: { 'x-act-as-tenant-id': 'target-college-id' },
          }),
        }),
      };

      await expect(guard.canActivate(fakeContext)).rejects.toThrow(ForbiddenException);
    });

    it('should issue time-limited impersonation token preserving super admin identity', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'target-tenant-id',
        name: 'St. Jude College',
        slug: 'stjude-engineering',
        status: 'ACTIVE',
      });

      const superAdmin = {
        id: 'super-admin-root',
        email: 'root@collegequery.com',
        isSuperAdmin: true,
        permissions: ['*'],
      };

      const result = await systemAdminService.createImpersonationToken(
        superAdmin,
        'target-tenant-id',
        'Investigating database sync anomaly for tickets',
        30,
      );

      expect(result.success).toBe(true);
      expect(result.expiresInMinutes).toBe(30);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'super-admin-root',
          originalSuperAdminId: 'super-admin-root',
          tenantId: 'target-tenant-id',
          isImpersonating: true,
        }),
        expect.objectContaining({ expiresIn: '30m' }),
      );
    });

    it('should record audit log when impersonation session is revoked', async () => {
      const result = await systemAdminService.revokeImpersonation(
        'super-admin-root',
        'target-tenant-id',
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SUPER_ADMIN_IMPERSONATION_REVOKED',
          tenantId: 'target-tenant-id',
          userId: 'super-admin-root',
        }),
      });
    });
  });

  // ----------------------------------------------------------------------------
  // Acceptance Criterion 7: Every sensitive operation is audited
  // ----------------------------------------------------------------------------
  describe('Criterion 7: Comprehensive Security Audit Trail Logging', () => {
    it('should record immutable audit entry on user login', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await argon2.hash(password);

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-audit-test',
        email: 'audit@campus.edu',
        passwordHash,
        isActive: true,
        tenantId: 'tenant-10',
        userRoles: [],
      });

      await authService.login(
        { email: 'audit@campus.edu', password },
        '192.168.1.100',
        'Mozilla/5.0 Test Agent',
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_LOGIN',
          entityName: 'User',
          entityId: 'user-audit-test',
          ipAddress: '192.168.1.100',
        }),
      });
    });

    it('should record audit entry on user password change', async () => {
      const currentPassword = 'OldPassword123!';
      const passwordHash = await argon2.hash(currentPassword);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-audit-test',
        tenantId: 'tenant-10',
        passwordHash,
      });

      await authService.changePassword(
        'user-audit-test',
        { currentPassword, newPassword: 'BrandNewSecurePass2026!' },
        '10.0.0.1',
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PASSWORD_CHANGED',
          entityName: 'User',
          entityId: 'user-audit-test',
        }),
      });
    });
  });
});
