import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateDepartmentDto, actorId?: string) {
    // Validate college belongs to tenant
    const college = await this.prisma.college.findFirst({
      where: { id: dto.collegeId, tenantId },
    });
    if (!college) {
      throw new NotFoundException(`College campus '${dto.collegeId}' not found in this tenant.`);
    }

    // Check duplicate department code within college
    const existing = await this.prisma.department.findFirst({
      where: { tenantId, collegeId: dto.collegeId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Department '${dto.code}' already exists in this college.`);
    }

    // If HOD is provided, validate user exists in tenant
    if (dto.hodUserId) {
      const hod = await this.prisma.user.findFirst({
        where: { id: dto.hodUserId, tenantId },
      });
      if (!hod) {
        throw new NotFoundException(`HOD user '${dto.hodUserId}' not found in this tenant.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({
        data: {
          tenantId,
          collegeId: dto.collegeId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          hodUserId: dto.hodUserId || null,
        },
      });

      // If HOD assigned, ensure user has HOD role
      if (dto.hodUserId) {
        const hodRole = await tx.role.findFirst({
          where: { code: 'HOD', OR: [{ tenantId }, { isSystemRole: true }] },
        });
        if (hodRole) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: dto.hodUserId, roleId: hodRole.id } },
            create: { userId: dto.hodUserId, roleId: hodRole.id },
            update: {},
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'DEPARTMENT_CREATED',
          entityName: 'Department',
          entityId: dept.id,
          newValues: { code: dept.code, name: dept.name, collegeId: dept.collegeId, hodUserId: dept.hodUserId },
        },
      });

      return dept;
    });
  }

  async findAll(
    tenantId: string,
    options: { collegeId?: string; search?: string; page?: number; limit?: number } = {},
  ) {
    const { collegeId, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (collegeId) where.collegeId = collegeId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        include: {
          college: { select: { id: true, code: true, name: true } },
          hodUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { courses: true, faculty: true, students: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId },
      include: {
        college: true,
        hodUser: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        courses: true,
        faculty: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        employees: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        _count: { select: { students: true, queries: true } },
      },
    });
    if (!dept) {
      throw new NotFoundException(`Department '${id}' not found.`);
    }
    return dept;
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto, actorId?: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId },
    });
    if (!dept) {
      throw new NotFoundException(`Department '${id}' not found.`);
    }

    if (dto.hodUserId && dto.hodUserId !== dept.hodUserId) {
      const hod = await this.prisma.user.findFirst({
        where: { id: dto.hodUserId, tenantId },
      });
      if (!hod) {
        throw new NotFoundException(`HOD user '${dto.hodUserId}' not found in this tenant.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({
        where: { id },
        data: dto,
      });

      // Update HOD role if new HOD assigned
      if (dto.hodUserId && dto.hodUserId !== dept.hodUserId) {
        const hodRole = await tx.role.findFirst({
          where: { code: 'HOD', OR: [{ tenantId }, { isSystemRole: true }] },
        });
        if (hodRole) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: dto.hodUserId, roleId: hodRole.id } },
            create: { userId: dto.hodUserId, roleId: hodRole.id },
            update: {},
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'DEPARTMENT_UPDATED',
          entityName: 'Department',
          entityId: id,
          oldValues: { name: dept.name, hodUserId: dept.hodUserId },
          newValues: dto as any,
        },
      });

      return updated;
    });
  }

  async delete(tenantId: string, id: string, actorId?: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { courses: true, students: true, faculty: true } },
      },
    });

    if (!dept) {
      throw new NotFoundException(`Department '${id}' not found.`);
    }

    if (dept._count.courses > 0 || dept._count.students > 0 || dept._count.faculty > 0) {
      throw new BadRequestException(
        `Cannot delete department '${dept.name}' because it contains ${dept._count.courses} courses, ${dept._count.students} students, and ${dept._count.faculty} faculty members.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.department.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'DEPARTMENT_DELETED',
          entityName: 'Department',
          entityId: id,
          oldValues: { code: dept.code, name: dept.name },
        },
      });
    });

    return { success: true, message: `Department '${dept.name}' deleted.` };
  }
}
