import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
} from './dto/password-reset.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * User Registration within a Tenant (or Super Admin if designated)
   */
  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let resolvedTenantId: string | null = dto.tenantId || null;

    if (!resolvedTenantId && dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug },
      });
      if (!tenant) {
        throw new NotFoundException(`Tenant slug '${dto.tenantSlug}' does not exist.`);
      }
      resolvedTenantId = tenant.id;
    }

    if (resolvedTenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: resolvedTenantId },
      });
      if (!tenant) {
        throw new NotFoundException(`Tenant '${resolvedTenantId}' does not exist.`);
      }
      if (tenant.status !== 'ACTIVE') {
        throw new BadRequestException(`Tenant college is currently ${tenant.status}. Registration suspended.`);
      }
    }

    // Check email uniqueness within tenant
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId: resolvedTenantId,
        email: dto.email,
      },
    });

    if (existing) {
      throw new ConflictException(`User with email '${dto.email}' is already registered in this college.`);
    }

    const passwordHash = await argon2.hash(dto.password);
    const userType = dto.userType || UserType.STUDENT;

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          tenantId: resolvedTenantId,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber || null,
          userType,
          isActive: true,
        },
      });

      // Assign matching role (e.g. STUDENT role for student)
      const role = await tx.role.findFirst({
        where: {
          code: userType.toString(),
          OR: [{ tenantId: resolvedTenantId }, { isSystemRole: true }],
        },
      });

      if (role) {
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: role.id,
          },
        });
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          tenantId: resolvedTenantId,
          userId: createdUser.id,
          action: 'USER_REGISTER',
          entityName: 'User',
          entityId: createdUser.id,
          newValues: {
            email: createdUser.email,
            userType: createdUser.userType,
            tenantId: resolvedTenantId,
          },
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      return createdUser;
    });

    // Generate email verification token (valid for 24h)
    const verificationSecret = this.configService.get<string>(
      'jwt.accessSecret',
      'dev_jwt_access_secret',
    );
    const verificationToken = this.jwtService.sign(
      { sub: user.id, purpose: 'email_verification' },
      { secret: verificationSecret, expiresIn: '24h' as any },
    );

    return {
      success: true,
      message: 'Registration successful.',
      userId: user.id,
      email: user.email,
      verificationToken,
    };
  }

  /**
   * User Authentication & Session Initialization
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    if (user.tenant && user.tenant.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your college account is currently suspended. Please contact administrator.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    // Collect permissions
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }
    const permissions = Array.from(permissionSet);

    // Issue tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      userType: user.userType,
      isSuperAdmin: user.isSuperAdmin,
      permissions,
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityName: 'User',
        entityId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug || null,
        isSuperAdmin: user.isSuperAdmin,
        permissions,
      },
    };
  }

  /**
   * Rotating Refresh Token with Token Family Reuse Detection
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    let payload: any;

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret', 'dev_jwt_refresh_secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        familyId: payload.familyId,
        isRevoked: false,
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Reuse detection check: If token family has already been revoked or record not found
    if (!tokenRecord) {
      // Invalidate all tokens for this family as a security precaution
      await this.prisma.refreshToken.updateMany({
        where: { familyId: payload.familyId },
        data: { isRevoked: true },
      });
      this.logger.warn(`Potential token reuse detected for user ID: ${payload.sub}`);
      throw new UnauthorizedException('Session terminated due to token reuse detection.');
    }

    // Verify token hash
    const isTokenMatch = await argon2.verify(tokenRecord.tokenHash, refreshToken);
    if (!isTokenMatch) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: payload.familyId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Invalid token presentation.');
    }

    // Mark current token as revoked
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    const user = tokenRecord.user;
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive.');
    }

    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    // Rotate with same familyId
    return this.generateTokens(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        userType: user.userType,
        isSuperAdmin: user.isSuperAdmin,
        permissions: Array.from(permissionSet),
      },
      payload.familyId,
    );
  }

  /**
   * Logout and Revoke Active Refresh Tokens
   */
  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user?.tenantId || null,
        userId,
        action: 'USER_LOGOUT',
        entityName: 'User',
        entityId: userId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return { success: true, message: 'Successfully logged out and revoked active sessions.' };
  }

  /**
   * Request Password Reset Token
   */
  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    // Return success response even if not found to prevent user enumeration
    if (!user || !user.isActive) {
      return {
        success: true,
        message: 'If the email exists, a password reset instruction has been dispatched.',
      };
    }

    const resetSecret = this.configService.get<string>(
      'jwt.accessSecret',
      'dev_jwt_access_secret',
    );
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'password_reset' },
      { secret: resetSecret, expiresIn: '1h' as any },
    );

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityName: 'User',
        entityId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      success: true,
      message: 'If the email exists, a password reset instruction has been dispatched.',
      resetToken, // Included for API development & testing
    };
  }

  /**
   * Reset Password with Token
   */
  async resetPassword(dto: ResetPasswordDto, ipAddress?: string, userAgent?: string) {
    let payload: any;
    try {
      const resetSecret = this.configService.get<string>(
        'jwt.accessSecret',
        'dev_jwt_access_secret',
      );
      payload = this.jwtService.verify(dto.token, { secret: resetSecret });
      if (payload.purpose !== 'password_reset') {
        throw new Error();
      }
    } catch {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('User account not found or deactivated.');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all existing sessions for security
      await tx.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
          entityName: 'User',
          entityId: user.id,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    });

    return { success: true, message: 'Password has been reset successfully. Please log in again.' };
  }

  /**
   * Change Password (Authenticated User)
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isCurrentValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password entered is incorrect.');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all active refresh tokens/sessions except current
      await tx.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId,
          action: 'PASSWORD_CHANGED',
          entityName: 'User',
          entityId: userId,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    });

    return { success: true, message: 'Password changed successfully.' };
  }

  /**
   * Verify User Email Address
   */
  async verifyEmail(dto: VerifyEmailDto, ipAddress?: string, userAgent?: string) {
    let payload: any;
    try {
      const secret = this.configService.get<string>(
        'jwt.accessSecret',
        'dev_jwt_access_secret',
      );
      payload = this.jwtService.verify(dto.token, { secret });
      if (payload.purpose !== 'email_verification') {
        throw new Error();
      }
    } catch {
      throw new BadRequestException('Invalid or expired email verification token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        entityName: 'User',
        entityId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return { success: true, message: 'Email address verified successfully.' };
  }

  /**
   * Get Active Sessions for a User
   */
  async getSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        familyId: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      activeSessions: sessions.length,
      sessions,
    };
  }

  /**
   * Revoke a Specific Active Session
   */
  async revokeSession(userId: string, sessionId: string, ipAddress?: string, userAgent?: string) {
    const session = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
      include: { user: true },
    });

    if (!session) {
      throw new NotFoundException(`Session '${sessionId}' not found.`);
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        userId,
        action: 'SESSION_REVOKED',
        entityName: 'RefreshToken',
        entityId: sessionId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return { success: true, message: `Session '${sessionId}' revoked successfully.` };
  }

  /**
   * Get User Login History
   */
  async getLoginHistory(userId: string, limit = 20) {
    const history = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: { in: ['USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_RESET_COMPLETED', 'SUPER_ADMIN_IMPERSONATION'] },
      },
      select: {
        id: true,
        action: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history;
  }

  private async generateTokens(
    payload: {
      sub: string;
      email: string;
      tenantId: string | null;
      userType: string;
      isSuperAdmin: boolean;
      permissions: string[];
    },
    existingFamilyId?: string,
  ) {
    const familyId = existingFamilyId || uuidv4();

    const accessSecret = this.configService.get<string>('jwt.accessSecret', 'dev_jwt_access_secret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret', 'dev_jwt_refresh_secret');

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m') as any,
    });

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, familyId },
      {
        secret: refreshSecret,
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '7d') as any,
      },
    );

    // Hash and store refresh token in database
    const tokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins in seconds
    };
  }
}
