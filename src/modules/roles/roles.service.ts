import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.js';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string | null, dto: CreateRoleDto, actorId?: string) {
    const existing = await this.prisma.role.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Role with code '${dto.code}' already exists.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          tenantId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          isSystemRole: false,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'ROLE_CREATED',
          entityName: 'Role',
          entityId: role.id,
          newValues: { code: role.code, name: role.name },
        },
      });

      return role;
    });
  }

  async findAll(tenantId: string | null) {
    return this.prisma.role.findMany({
      where: {
        OR: [
          { tenantId },
          { isSystemRole: true },
        ],
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string | null, roleId: string) {
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
    return role;
  }

  /**
   * Assign permissions to a role with Privilege Escalation Prevention
   * Acceptance Criteria: "Faculty cannot assign permissions they do not possess."
   */
  async assignPermissions(
    tenantId: string | null,
    roleId: string,
    dto: AssignPermissionsDto,
    actor: { id: string; isSuperAdmin: boolean; permissions: string[] },
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, OR: [{ tenantId }, { isSystemRole: true }] },
    });
    if (!role) {
      throw new NotFoundException(`Role '${roleId}' not found.`);
    }

    // Privilege escalation prevention
    if (!actor.isSuperAdmin) {
      const actorPermissions = new Set(actor.permissions || []);
      const missingPermissions = dto.permissionCodes.filter((code) => !actorPermissions.has(code));
      if (missingPermissions.length > 0) {
        throw new ForbiddenException(
          `Privilege Escalation Detected: You cannot assign permissions you do not possess: [${missingPermissions.join(', ')}]`,
        );
      }
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissionCodes } },
    });

    if (permissions.length !== dto.permissionCodes.length) {
      const foundCodes = new Set(permissions.map((p) => p.code));
      const invalid = dto.permissionCodes.filter((c) => !foundCodes.has(c));
      throw new NotFoundException(`The following permissions do not exist: [${invalid.join(', ')}]`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Get existing permissions for audit log
      const oldPermissions = await tx.rolePermission.findMany({
        where: { roleId },
        include: { permission: true },
      });

      // Remove existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Insert new permission mappings
      const records = permissions.map((p) => ({
        roleId,
        permissionId: p.id,
      }));

      await tx.rolePermission.createMany({
        data: records,
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actor.id,
          action: 'ROLE_PERMISSIONS_UPDATED',
          entityName: 'Role',
          entityId: roleId,
          oldValues: { permissions: oldPermissions.map((op) => op.permission.code) },
          newValues: { permissions: dto.permissionCodes },
        },
      });

      return {
        roleId,
        roleCode: role.code,
        assignedPermissions: dto.permissionCodes,
      };
    });
  }
}
