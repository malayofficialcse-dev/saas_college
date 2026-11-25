import {
  Injectable,
  ConflictException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserType } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { CreateFacultyDto, UpdateFacultyDto } from './dto/create-faculty.dto.js';

@Injectable()
export class FacultyService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  async create(tenantId: string, dto: CreateFacultyDto, actorId?: string) {
    if (this.subscriptionsService) {
      await this.subscriptionsService.assertQuota(tenantId, 'faculty');
    }

    // Validate Department belongs to tenant
    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, tenantId },
    });
    if (!department) {
      throw new NotFoundException(`Department '${dto.departmentId}' not found in this college.`);
    }

    // Check unique employee code and email
    const [existingCode, existingUser] = await Promise.all([
      this.prisma.faculty.findFirst({
        where: { tenantId, employeeCode: dto.employeeCode },
      }),
      this.prisma.user.findFirst({
        where: { tenantId, email: dto.email },
      }),
    ]);

    if (existingCode) {
      throw new ConflictException(`Faculty with employee code '${dto.employeeCode}' already exists.`);
    }
    if (existingUser) {
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
          phoneNumber: dto.phoneNumber || null,
          userType: UserType.FACULTY,
          isActive: true,
        },
      });

      const faculty = await tx.faculty.create({
        data: {
          tenantId,
          userId: user.id,
          departmentId: dto.departmentId,
          employeeCode: dto.employeeCode,
          designation: dto.designation,
          specialization: dto.specialization || null,
          maxActiveQueries: dto.maxActiveQueries ?? 15,
        },
        include: {
          department: { select: { id: true, code: true, name: true } },
        },
      });

      // Assign FACULTY role
      const facultyRole = await tx.role.findFirst({
        where: { code: 'FACULTY', OR: [{ tenantId }, { isSystemRole: true }] },
      });
      if (facultyRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: facultyRole.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'FACULTY_CREATED',
          entityName: 'Faculty',
          entityId: faculty.id,
          newValues: {
            employeeCode: faculty.employeeCode,
            designation: faculty.designation,
            department: department.name,
            email: user.email,
          },
        },
      });

      return {
        ...faculty,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
        },
      };
    });
  }

  async findAll(
    tenantId: string,
    options: { departmentId?: string; search?: string; page?: number; limit?: number } = {},
  ) {
    const { departmentId, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.faculty.count({ where }),
      this.prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, isActive: true } },
          department: { select: { id: true, code: true, name: true } },
          _count: { select: { queryAssignments: true } },
        },
        orderBy: { employeeCode: 'asc' },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const faculty = await this.prisma.faculty.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, isActive: true } },
        department: true,
        queryAssignments: {
          include: {
            query: { select: { id: true, ticketNumber: true, title: true, status: true, priority: true } },
          },
          take: 10,
        },
      },
    });

    if (!faculty) {
      throw new NotFoundException(`Faculty '${id}' not found.`);
    }

    return faculty;
  }

  async update(tenantId: string, id: string, dto: UpdateFacultyDto, actorId?: string) {
    const faculty = await this.prisma.faculty.findFirst({
      where: { id, tenantId },
      include: { user: true },
    });
    if (!faculty) {
      throw new NotFoundException(`Faculty '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.firstName || dto.lastName || dto.phoneNumber) {
        await tx.user.update({
          where: { id: faculty.userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phoneNumber: dto.phoneNumber,
          },
        });
      }

      const facultyUpdate: any = {};
      if (dto.designation) facultyUpdate.designation = dto.designation;
      if (dto.specialization) facultyUpdate.specialization = dto.specialization;
      if (dto.maxActiveQueries) facultyUpdate.maxActiveQueries = dto.maxActiveQueries;
      if (dto.departmentId) facultyUpdate.departmentId = dto.departmentId;

      const updated = await tx.faculty.update({
        where: { id },
        data: facultyUpdate,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          department: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'FACULTY_UPDATED',
          entityName: 'Faculty',
          entityId: id,
          oldValues: { designation: faculty.designation, maxActiveQueries: faculty.maxActiveQueries },
          newValues: dto as any,
        },
      });

      return updated;
    });
  }
}
