import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto.js';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCourseDto, actorId?: string) {
    // Validate department exists within tenant
    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, tenantId },
    });
    if (!department) {
      throw new NotFoundException(`Department '${dto.departmentId}' not found in this tenant.`);
    }

    // Prevent duplicate course code within department
    const existing = await this.prisma.course.findFirst({
      where: { tenantId, departmentId: dto.departmentId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Course '${dto.code}' already exists in department '${department.name}'.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          tenantId,
          departmentId: dto.departmentId,
          code: dto.code,
          name: dto.name,
          durationSemesters: dto.durationSemesters ?? 8,
          degreeLevel: dto.degreeLevel ?? 'Undergraduate',
          isActive: dto.isActive ?? true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'COURSE_CREATED',
          entityName: 'Course',
          entityId: course.id,
          newValues: {
            code: course.code,
            name: course.name,
            departmentId: course.departmentId,
            durationSemesters: course.durationSemesters,
          },
        },
      });

      return course;
    });
  }

  async findAll(
    tenantId: string,
    options: {
      departmentId?: string;
      degreeLevel?: string;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { departmentId, degreeLevel, isActive, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (departmentId) where.departmentId = departmentId;
    if (degreeLevel) where.degreeLevel = degreeLevel;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: { select: { id: true, code: true, name: true, college: { select: { id: true, name: true } } } },
          _count: { select: { students: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, tenantId },
      include: {
        department: {
          include: {
            college: true,
            hodUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { students: true } },
      },
    });
    if (!course) {
      throw new NotFoundException(`Course '${id}' not found.`);
    }
    return course;
  }

  async update(tenantId: string, id: string, dto: UpdateCourseDto, actorId?: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, tenantId },
    });
    if (!course) {
      throw new NotFoundException(`Course '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.course.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'COURSE_UPDATED',
          entityName: 'Course',
          entityId: id,
          oldValues: { name: course.name, durationSemesters: course.durationSemesters, isActive: course.isActive },
          newValues: dto as any,
        },
      });

      return updated;
    });
  }

  async delete(tenantId: string, id: string, actorId?: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { students: true } },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course '${id}' not found.`);
    }

    if (course._count.students > 0) {
      throw new BadRequestException(
        `Cannot delete course '${course.name}' because ${course._count.students} students are currently enrolled.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.course.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'COURSE_DELETED',
          entityName: 'Course',
          entityId: id,
          oldValues: { code: course.code, name: course.name },
        },
      });
    });

    return { success: true, message: `Course '${course.name}' deleted.` };
  }
}
