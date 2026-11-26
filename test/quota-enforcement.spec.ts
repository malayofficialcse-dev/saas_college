import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { StudentsService } from '../src/modules/students/students.service.js';
import { FacultyService } from '../src/modules/faculty/faculty.service.js';
import { EmployeesService } from '../src/modules/employees/employees.service.js';
import { QueriesService } from '../src/modules/queries/queries.service.js';

describe('Quota Enforcement across Academic and Operations Services', () => {
  let mockPrisma: any;
  let mockSubscriptionsService: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockPrisma = {
      department: { findFirst: vi.fn() },
      course: { findFirst: vi.fn() },
      academicSession: { findFirst: vi.fn() },
      student: { findFirst: vi.fn() },
      faculty: { findFirst: vi.fn() },
      employee: { findFirst: vi.fn() },
      user: { findFirst: vi.fn(), create: vi.fn() },
      queryCategory: { findFirst: vi.fn() },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    mockSubscriptionsService = {
      assertQuota: vi.fn(),
    };

    mockEventEmitter = {
      emit: vi.fn(),
    };
  });

  it('1. StudentsService.admit enforces student quota before admission', async () => {
    mockSubscriptionsService.assertQuota.mockRejectedValueOnce(
      new ForbiddenException('Plan quota exceeded for students'),
    );

    const studentsService = new StudentsService(mockPrisma, mockSubscriptionsService);

    await expect(
      studentsService.admit('tenant-1', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@college.edu',
        password: 'Password123!',
        enrollmentNumber: 'ENR-001',
        rollNumber: 'ROLL-001',
        departmentId: 'dept-1',
        courseId: 'course-1',
        academicSessionId: 'session-1',
        currentSemester: 1,
        admissionYear: 2026,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockSubscriptionsService.assertQuota).toHaveBeenCalledWith(
      'tenant-1',
      'students',
    );
  });

  it('2. FacultyService.create enforces faculty quota before creating faculty', async () => {
    mockSubscriptionsService.assertQuota.mockRejectedValueOnce(
      new ForbiddenException('Plan quota exceeded for faculty'),
    );

    const facultyService = new FacultyService(mockPrisma, mockSubscriptionsService);

    await expect(
      facultyService.create('tenant-1', {
        firstName: 'Jane',
        lastName: 'Prof',
        email: 'jane@college.edu',
        password: 'Password123!',
        employeeCode: 'FAC-001',
        departmentId: 'dept-1',
        designation: 'Professor',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockSubscriptionsService.assertQuota).toHaveBeenCalledWith(
      'tenant-1',
      'faculty',
    );
  });

  it('3. EmployeesService.create enforces staff quota before creating employee', async () => {
    mockSubscriptionsService.assertQuota.mockRejectedValueOnce(
      new ForbiddenException('Plan quota exceeded for staff'),
    );

    const employeesService = new EmployeesService(mockPrisma, mockSubscriptionsService);

    await expect(
      employeesService.create('tenant-1', {
        firstName: 'Mark',
        lastName: 'Staff',
        email: 'mark@college.edu',
        password: 'Password123!',
        employeeCode: 'EMP-001',
        designation: 'Accountant',
        staffCategory: 'ADMINISTRATIVE' as any,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockSubscriptionsService.assertQuota).toHaveBeenCalledWith(
      'tenant-1',
      'staff',
    );
  });

  it('4. QueriesService.create enforces monthly query quota before ticket creation', async () => {
    mockSubscriptionsService.assertQuota.mockRejectedValueOnce(
      new ForbiddenException('Plan quota exceeded for queries'),
    );

    const queriesService = new QueriesService(
      mockPrisma,
      mockEventEmitter,
      mockSubscriptionsService,
    );

    await expect(
      queriesService.create('tenant-1', 'user-student-1', {
        title: 'Need duplicate ID card',
        description: 'Lost ID card in campus library',
        categoryId: 'cat-1',
        departmentId: 'dept-1',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockSubscriptionsService.assertQuota).toHaveBeenCalledWith(
      'tenant-1',
      'queries',
    );
  });
});
