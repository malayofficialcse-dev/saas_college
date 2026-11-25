import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from '../src/modules/auth/auth.service.js';

describe('AuthSecurity & Refresh Token Rotation Suite', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mocked.jwt.token'),
      verify: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultVal: any) => defaultVal),
    };

    authService = new AuthService(mockPrisma as any, mockJwtService as any, mockConfigService as any);
  });

  describe('Password Hashing with Argon2id', () => {
    it('should hash passwords into standard Argon2id format and verify successfully', async () => {
      const password = 'StudentSecurePass2026!';
      const hash = await argon2.hash(password);

      expect(hash).toContain('$argon2');
      const isMatch = await argon2.verify(hash, password);
      expect(isMatch).toBe(true);

      const wrongMatch = await argon2.verify(hash, 'WrongPassword123!');
      expect(wrongMatch).toBe(false);
    });
  });

  describe('Login Flow', () => {
    it('should reject login when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nonexistent@college.edu', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login when account is deactivated', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'inactive@college.edu',
        isActive: false,
      });

      await expect(
        authService.login({ email: 'inactive@college.edu', password: 'password123' }),
      ).rejects.toThrow('Your account has been deactivated');
    });

    it('should issue access & refresh tokens on valid credentials', async () => {
      const password = 'ValidPassword123!';
      const passwordHash = await argon2.hash(password);

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'student@college.edu',
        passwordHash,
        firstName: 'Rahul',
        lastName: 'Sharma',
        userType: 'STUDENT',
        isActive: true,
        tenantId: 'tenant-100',
        tenant: { slug: 'acme' },
        userRoles: [],
      });

      const result = await authService.login({ email: 'student@college.edu', password });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('student@college.edu');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('Refresh Token Rotation & Reuse Detection', () => {
    it('should detect token reuse and revoke the entire token family', async () => {
      const stolenToken = 'stolen.old.token';
      const familyId = 'family-uuid-1';

      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        familyId,
      });

      // Token record is NOT found or already revoked
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        authService.refreshToken({ refreshToken: stolenToken }),
      ).rejects.toThrow('Session terminated due to token reuse detection.');

      // Invalidation of entire token family
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId },
        data: { isRevoked: true },
      });
    });

    it('should rotate token and invalidate current refresh token upon legitimate refresh', async () => {
      const validToken = 'valid.current.token';
      const familyId = 'family-uuid-2';
      const tokenHash = await argon2.hash(validToken);

      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        familyId,
      });

      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-db-id',
        tokenHash,
        user: {
          id: 'user-1',
          email: 'faculty@college.edu',
          isActive: true,
          userRoles: [],
        },
      });

      const result = await authService.refreshToken({ refreshToken: validToken });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Current token marked as revoked
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-db-id' },
        data: { isRevoked: true },
      });
      // New token issued within same familyId
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ familyId }),
        }),
      );
    });
  });
});
