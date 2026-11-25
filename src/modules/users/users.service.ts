import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string | null, dto: CreateUserDto, actorId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`User with email '${dto.email}' already exists in this college.`);
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber,
          userType: dto.userType,
          isActive: true,
        },
      });

      if (dto.roleId) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: dto.roleId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'USER_CREATED',
          entityName: 'User',
          entityId: user.id,
          newValues: { email: user.email, userType: user.userType, roleId: dto.roleId },
        },
      });

      return user;
    });
  }

  async findAll(tenantId: string | null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.user.findMany({
        where: { tenantId },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          userType: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string | null, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: {
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
        studentProfile: true,
        facultyProfile: true,
        employeeProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found in this college.`);
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async update(tenantId: string | null, id: string, dto: UpdateUserDto, actorId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.user.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'USER_UPDATED',
          entityName: 'User',
          entityId: id,
          oldValues: { firstName: user.firstName, lastName: user.lastName, phoneNumber: user.phoneNumber },
          newValues: dto as any,
        },
      });

      return res;
    });

    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }

  /**
   * Activate User Account
   */
  async activate(tenantId: string | null, id: string, actorId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'USER_ACTIVATED',
          entityName: 'User',
          entityId: id,
        },
      });
    });

    return { success: true, message: `User account '${id}' activated.` };
  }

  /**
   * Deactivate User Account & Terminate Active Sessions Immediately
   */
  async deactivate(tenantId: string | null, id: string, actorId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Instantly revoke all active refresh tokens for the deactivated user
      await tx.refreshToken.updateMany({
        where: { userId: id },
        data: { isRevoked: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'USER_DEACTIVATED',
          entityName: 'User',
          entityId: id,
        },
      });
    });

    return { success: true, message: `User account '${id}' deactivated and all active sessions terminated.` };
  }

  /**
   * Assign Role to User with Privilege Escalation Prevention
   * Acceptance Criteria: "Faculty cannot assign permissions they do not possess."
   */
  async assignRole(
    tenantId: string | null,
    userId: string,
    roleId: string,
    actor: { id: string; isSuperAdmin: boolean; permissions: string[] },
  ) {
    const targetUser = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!targetUser) {
      throw new NotFoundException(`Target user '${userId}' not found in this tenant.`);
    }

    const role = await this.prisma.role.findFirst({
      where: { id: roleId, OR: [{ tenantId }, { isSystemRole: true }] },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleId}' not found.`);
    }

    // Privilege escalation check: Actor must have all permissions that the role confers
    if (!actor.isSuperAdmin) {
      const actorPermissions = new Set(actor.permissions || []);
      const missingPermissions = role.rolePermissions
        .map((rp) => rp.permission.code)
        .filter((code) => !actorPermissions.has(code));

      if (missingPermissions.length > 0) {
        throw new ForbiddenException(
          `Privilege Escalation Detected: You cannot assign role '${role.code}' because it contains permissions you do not possess: [${missingPermissions.join(', ')}]`,
        );
      }
    }

    // Assign role
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
        create: { userId, roleId },
        update: {},
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actor.id,
          action: 'USER_ROLE_ASSIGNED',
          entityName: 'UserRole',
          entityId: `${userId}:${roleId}`,
          newValues: { userId, roleId, roleCode: role.code },
        },
      });
    });

    return { success: true, message: `Role '${role.name}' assigned to user.` };
  }

  /**
   * Remove Role from User
   */
  async removeRole(
    tenantId: string | null,
    userId: string,
    roleId: string,
    actorId: string,
  ) {
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    if (!userRole) {
      throw new NotFoundException(`Role mapping for user '${userId}' not found.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.delete({
        where: { userId_roleId: { userId, roleId } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId,
          action: 'USER_ROLE_REMOVED',
          entityName: 'UserRole',
          entityId: `${userId}:${roleId}`,
        },
      });
    });

    return { success: true, message: 'Role removed from user.' };
  }

  /**
   * Terminate all active sessions for a user
   */
  async terminateSessions(tenantId: string | null, userId: string, actorId: string) {
    const targetUser = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!targetUser) {
      throw new NotFoundException(`Target user '${userId}' not found.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId,
          action: 'USER_SESSIONS_TERMINATED',
          entityName: 'User',
          entityId: userId,
        },
      });
    });

    return { success: true, message: `All active sessions for user '${userId}' have been terminated.` };
  }
}
