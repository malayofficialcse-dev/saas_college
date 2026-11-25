import {
  Injectable,
  ConflictException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserType, StaffCategory } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto.js';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  async create(tenantId: string, dto: CreateEmployeeDto, actorId?: string) {
    if (this.subscriptionsService) {
      await this.subscriptionsService.assertQuota(tenantId, 'staff');
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      });
      if (!department) {
        throw new NotFoundException(`Department '${dto.departmentId}' not found in this college.`);
      }
    }

    const [existingCode, existingUser] = await Promise.all([
      this.prisma.employee.findFirst({
        where: { tenantId, employeeCode: dto.employeeCode },
      }),
      this.prisma.user.findFirst({
        where: { tenantId, email: dto.email },
      }),
    ]);

    if (existingCode) {
      throw new ConflictException(`Employee with code '${dto.employeeCode}' already exists.`);
    }
    if (existingUser) {
      throw new ConflictException(`User with email '${dto.email}' already exists in this college.`);
    }

    // Map StaffCategory to corresponding UserType
    let userType: UserType = UserType.SUPPORT_STAFF;
    let roleCode = 'SUPPORT_STAFF';

    switch (dto.staffCategory) {
      case StaffCategory.RECEPTION:
        userType = UserType.RECEPTION_STAFF;
        roleCode = 'RECEPTION_STAFF';
        break;
      case StaffCategory.ACCOUNTS:
        userType = UserType.ACCOUNTS_STAFF;
        roleCode = 'ACCOUNTS_STAFF';
        break;
      case StaffCategory.EXAMINATION:
        userType = UserType.EXAMINATION_STAFF;
        roleCode = 'EXAMINATION_STAFF';
        break;
      case StaffCategory.ADMINISTRATIVE:
        userType = UserType.COLLEGE_ADMIN;
        roleCode = 'COLLEGE_ADMIN';
        break;
      default:
        userType = UserType.SUPPORT_STAFF;
        roleCode = 'SUPPORT_STAFF';
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
          userType,
          isActive: true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          tenantId,
          userId: user.id,
          departmentId: dto.departmentId || null,
          employeeCode: dto.employeeCode,
          staffCategory: dto.staffCategory,
          designation: dto.designation,
        },
        include: {
          department: { select: { id: true, code: true, name: true } },
        },
      });

      // Assign matching staff role
      const role = await tx.role.findFirst({
        where: { code: roleCode, OR: [{ tenantId }, { isSystemRole: true }] },
      });
      if (role) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'EMPLOYEE_CREATED',
          entityName: 'Employee',
          entityId: employee.id,
          newValues: {
            employeeCode: employee.employeeCode,
            staffCategory: employee.staffCategory,
            designation: employee.designation,
            email: user.email,
          },
        },
      });

      return {
        ...employee,
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
    options: { staffCategory?: StaffCategory; departmentId?: string; search?: string; page?: number; limit?: number } = {},
  ) {
    const { staffCategory, departmentId, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (staffCategory) where.staffCategory = staffCategory;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, isActive: true } },
          department: { select: { id: true, code: true, name: true } },
        },
        orderBy: { employeeCode: 'asc' },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, isActive: true } },
        department: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee '${id}' not found.`);
    }

    return employee;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto, actorId?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: { user: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.firstName || dto.lastName || dto.phoneNumber) {
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phoneNumber: dto.phoneNumber,
          },
        });
      }

      const employeeUpdate: any = {};
      if (dto.designation) employeeUpdate.designation = dto.designation;
      if (dto.staffCategory) employeeUpdate.staffCategory = dto.staffCategory;
      if (dto.departmentId !== undefined) employeeUpdate.departmentId = dto.departmentId;

      const updated = await tx.employee.update({
        where: { id },
        data: employeeUpdate,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          department: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'EMPLOYEE_UPDATED',
          entityName: 'Employee',
          entityId: id,
          oldValues: { designation: employee.designation, staffCategory: employee.staffCategory },
          newValues: dto as any,
        },
      });

      return updated;
    });
  }
}
