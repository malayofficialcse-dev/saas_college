import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserType } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  /**
   * Complete Student Admission & User Account Provisioning
   */
  async admit(tenantId: string, dto: CreateStudentDto, actorId?: string) {
    // 0. Quota enforcement
    if (this.subscriptionsService) {
      await this.subscriptionsService.assertQuota(tenantId, 'students');
    }

    // 1. Validate Academic Relationships
    const [department, course, session] = await Promise.all([
      this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      }),
      this.prisma.course.findFirst({
        where: { id: dto.courseId, tenantId },
      }),
      this.prisma.academicSession.findFirst({
        where: { id: dto.academicSessionId, tenantId },
      }),
    ]);

    if (!department) {
      throw new NotFoundException(`Department '${dto.departmentId}' not found in this college.`);
    }
    if (!course) {
      throw new NotFoundException(`Course '${dto.courseId}' not found in this college.`);
    }
    if (course.departmentId !== department.id) {
      throw new BadRequestException(`Course '${course.name}' does not belong to department '${department.name}'.`);
    }
    if (!session) {
      throw new NotFoundException(`Academic session '${dto.academicSessionId}' not found.`);
    }

    // 2. Prevent Duplicate Enrollment and Roll Number within Tenant
    const [existingEnrollment, existingRoll, existingUser] = await Promise.all([
      this.prisma.student.findFirst({
        where: { tenantId, enrollmentNumber: dto.enrollmentNumber },
      }),
      this.prisma.student.findFirst({
        where: { tenantId, rollNumber: dto.rollNumber },
      }),
      this.prisma.user.findFirst({
        where: { tenantId, email: dto.email },
      }),
    ]);

    if (existingEnrollment) {
      throw new ConflictException(`Student with enrollment number '${dto.enrollmentNumber}' already exists.`);
    }
    if (existingRoll) {
      throw new ConflictException(`Student with roll number '${dto.rollNumber}' already exists in this college.`);
    }
    if (existingUser) {
      throw new ConflictException(`User with email '${dto.email}' already exists in this college.`);
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      // 3. Create User account
      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber || null,
          userType: UserType.STUDENT,
          isActive: true,
        },
      });

      // 4. Create Student profile
      const student = await tx.student.create({
        data: {
          tenantId,
          userId: user.id,
          departmentId: dto.departmentId,
          courseId: dto.courseId,
          academicSessionId: dto.academicSessionId,
          enrollmentNumber: dto.enrollmentNumber,
          rollNumber: dto.rollNumber,
          currentSemester: dto.currentSemester ?? 1,
          admissionYear: dto.admissionYear,
        },
        include: {
          department: { select: { id: true, code: true, name: true } },
          course: { select: { id: true, code: true, name: true } },
          academicSession: { select: { id: true, name: true } },
        },
      });

      // 5. Assign STUDENT Role
      const studentRole = await tx.role.findFirst({
        where: { code: 'STUDENT', OR: [{ tenantId }, { isSystemRole: true }] },
      });
      if (studentRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: studentRole.id,
          },
        });
      }

      // 6. Record Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'STUDENT_ADMITTED',
          entityName: 'Student',
          entityId: student.id,
          newValues: {
            enrollmentNumber: student.enrollmentNumber,
            rollNumber: student.rollNumber,
            course: course.name,
            department: department.name,
            email: user.email,
          },
        },
      });

      return {
        ...student,
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
    options: {
      departmentId?: string;
      courseId?: string;
      academicSessionId?: string;
      currentSemester?: number;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const {
      departmentId,
      courseId,
      academicSessionId,
      currentSemester,
      search,
      page = 1,
      limit = 20,
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (academicSessionId) where.academicSessionId = academicSessionId;
    if (currentSemester) where.currentSemester = currentSemester;

    if (search) {
      where.OR = [
        { enrollmentNumber: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, isActive: true } },
          department: { select: { id: true, code: true, name: true } },
          course: { select: { id: true, code: true, name: true } },
          academicSession: { select: { id: true, name: true } },
        },
        orderBy: { rollNumber: 'asc' },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, isActive: true } },
        department: true,
        course: true,
        academicSession: true,
        queries: {
          select: { id: true, ticketNumber: true, title: true, status: true, priority: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student '${id}' not found in this college.`);
    }

    return student;
  }

  async update(tenantId: string, id: string, dto: UpdateStudentDto, actorId?: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, tenantId },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException(`Student '${id}' not found.`);
    }

    // Validate course & department if updated
    if (dto.courseId && dto.departmentId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, tenantId },
      });
      if (!course || course.departmentId !== dto.departmentId) {
        throw new BadRequestException('Selected course does not belong to specified department.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Update user details if provided
      if (dto.firstName || dto.lastName || dto.phoneNumber) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phoneNumber: dto.phoneNumber,
          },
        });
      }

      const studentUpdate: any = {};
      if (dto.rollNumber) studentUpdate.rollNumber = dto.rollNumber;
      if (dto.currentSemester) studentUpdate.currentSemester = dto.currentSemester;
      if (dto.departmentId) studentUpdate.departmentId = dto.departmentId;
      if (dto.courseId) studentUpdate.courseId = dto.courseId;

      const updated = await tx.student.update({
        where: { id },
        data: studentUpdate,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          department: true,
          course: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'STUDENT_UPDATED',
          entityName: 'Student',
          entityId: id,
          oldValues: { rollNumber: student.rollNumber, semester: student.currentSemester },
          newValues: dto as any,
        },
      });

      return updated;
    });
  }
}
