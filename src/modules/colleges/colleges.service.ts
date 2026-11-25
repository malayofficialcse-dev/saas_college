import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserType, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateCollegeDto } from './dto/create-college.dto.js';
import { OnboardCollegeDto } from './dto/onboard-college.dto.js';

@Injectable()
export class CollegesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Complete College Onboarding & Tenant Provisioning
   */
  async onboard(dto: OnboardCollegeDto, actorId?: string) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existingTenant) {
      throw new ConflictException(`Tenant slug '${dto.slug}' is already taken.`);
    }

    const passwordHash = await argon2.hash(dto.adminPassword);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant in PROVISIONING state
      const tenant = await tx.tenant.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          status: TenantStatus.PROVISIONING,
        },
      });

      // 2. Initialize default TenantConfig
      await tx.tenantConfig.create({
        data: {
          tenantId: tenant.id,
          supportEmail: dto.adminEmail,
          supportPhone: dto.phoneNumber,
        },
      });

      // 3. Create College Campus entity
      const college = await tx.college.create({
        data: {
          tenantId: tenant.id,
          code: dto.collegeCode,
          name: dto.name,
          city: dto.city,
          state: dto.state,
          email: dto.adminEmail,
          phoneNumber: dto.phoneNumber,
        },
      });

      // 4. Create Initial College Administrator User
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail,
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          phoneNumber: dto.phoneNumber,
          userType: UserType.COLLEGE_ADMIN,
          isActive: true,
        },
      });

      // 5. Assign COLLEGE_ADMIN role
      const adminRole = await tx.role.findFirst({
        where: {
          code: 'COLLEGE_ADMIN',
          OR: [{ tenantId: tenant.id }, { isSystemRole: true }],
        },
      });

      if (adminRole) {
        await tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: adminRole.id,
          },
        });
      }

      // 6. Record audit log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: actorId || adminUser.id,
          action: 'COLLEGE_ONBOARDED',
          entityName: 'Tenant',
          entityId: tenant.id,
          newValues: {
            tenantId: tenant.id,
            slug: tenant.slug,
            collegeName: dto.name,
            adminEmail: dto.adminEmail,
          },
        },
      });

      return {
        tenant,
        college,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          userType: adminUser.userType,
        },
      };
    });
  }

  /**
   * Approve Provisioned College Tenant
   */
  async approve(tenantId: string, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant '${tenantId}' not found.`);
    }

    if (tenant.status !== TenantStatus.PROVISIONING) {
      throw new BadRequestException(`Tenant is currently in ${tenant.status} state, cannot approve.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.ACTIVE },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId,
          action: 'COLLEGE_APPROVED',
          entityName: 'Tenant',
          entityId: tenantId,
          oldValues: { status: TenantStatus.PROVISIONING },
          newValues: { status: TenantStatus.ACTIVE },
        },
      });

      return t;
    });

    return { success: true, message: `College '${tenant.name}' approved and activated.`, tenant: updated };
  }

  /**
   * Suspend College Tenant
   */
  async suspend(tenantId: string, reason: string, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant '${tenantId}' not found.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.SUSPENDED },
      });

      // Instantly revoke all active refresh tokens for all tenant users
      const users = await tx.user.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        await tx.refreshToken.updateMany({
          where: { userId: { in: userIds } },
          data: { isRevoked: true },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId,
          action: 'COLLEGE_SUSPENDED',
          entityName: 'Tenant',
          entityId: tenantId,
          oldValues: { status: tenant.status },
          newValues: { status: TenantStatus.SUSPENDED, reason },
        },
      });

      return t;
    });

    return { success: true, message: `College '${tenant.name}' suspended.`, tenant: updated };
  }

  /**
   * Activate / Reactivate College Tenant
   */
  async activate(tenantId: string, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant '${tenantId}' not found.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.ACTIVE },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId,
          action: 'COLLEGE_ACTIVATED',
          entityName: 'Tenant',
          entityId: tenantId,
          oldValues: { status: tenant.status },
          newValues: { status: TenantStatus.ACTIVE },
        },
      });

      return t;
    });

    return { success: true, message: `College '${tenant.name}' activated.`, tenant: updated };
  }

  /**
   * Archive / Deactivate College Tenant
   */
  async archive(tenantId: string, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant '${tenantId}' not found.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.DEACTIVATED },
      });

      // Revoke all tokens
      const users = await tx.user.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        await tx.refreshToken.updateMany({
          where: { userId: { in: userIds } },
          data: { isRevoked: true },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId,
          action: 'COLLEGE_ARCHIVED',
          entityName: 'Tenant',
          entityId: tenantId,
          oldValues: { status: tenant.status },
          newValues: { status: TenantStatus.DEACTIVATED },
        },
      });

      return t;
    });

    return { success: true, message: `College '${tenant.name}' archived and deactivated.`, tenant: updated };
  }

  /**
   * Register a College Campus within a Tenant
   */
  async create(tenantId: string, dto: CreateCollegeDto, actorId?: string) {
    const existing = await this.prisma.college.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`College campus with code '${dto.code}' already exists.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const col = await tx.college.create({
        data: {
          tenantId,
          ...dto,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'COLLEGE_CAMPUS_CREATED',
          entityName: 'College',
          entityId: col.id,
          newValues: { code: col.code, name: col.name },
        },
      });

      return col;
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.college.findMany({
      where: { tenantId },
      include: { departments: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const college = await this.prisma.college.findFirst({
      where: { id, tenantId },
      include: { departments: true },
    });
    if (!college) {
      throw new NotFoundException(`College '${id}' not found.`);
    }
    return college;
  }
}
