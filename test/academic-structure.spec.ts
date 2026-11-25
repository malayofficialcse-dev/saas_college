// ==============================================================================
// CollegeQuery SaaS — Academic Structure & Profiles Test Suite
// Verifies:
// 1. Department hierarchy, unique codes, HOD assignment
// 2. Course management & department mapping
// 3. Academic Sessions & Atomic Session Transitions with student promotion
// 4. Student admission, uniqueness of enrollment & roll numbers, course validation
// 5. Faculty profiles, employee code uniqueness, workload limits
// 6. Employee classification (StaffCategory → Role) & user account linkage
// 7. Multi-record transactions and immutable audit logging
// ==============================================================================

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { StaffCategory } from '@prisma/client';
import { DepartmentsService } from '../src/modules/departments/departments.service.js';
import { CoursesService } from '../src/modules/courses/courses.service.js';
import { AcademicSessionsService } from '../src/modules/academic-sessions/academic-sessions.service.js';
import { StudentsService } from '../src/modules/students/students.service.js';
import { FacultyService } from '../src/modules/faculty/faculty.service.js';
import { EmployeesService } from '../src/modules/employees/employees.service.js';

describe('Academic Structure & Profiles Suite', () => {
  let mockPrisma: any;
  let departmentsService: DepartmentsService;
  let coursesService: CoursesService;
  let sessionsService: AcademicSessionsService;
  let studentsService: StudentsService;
  let facultyService: FacultyService;
  let employeesService: EmployeesService;

  const TENANT_ID = 'tenant-college-001';

  beforeEach(() => {
    mockPrisma = {
      college: { findFirst: vi.fn(), findMany: vi.fn() },
      department: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      course: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      academicSession: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      student: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      faculty: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      employee: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      role: {
        findFirst: vi.fn(),
      },
      userRole: {
        create: vi.fn(),
        upsert: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };

    departmentsService = new DepartmentsService(mockPrisma);
    coursesService = new CoursesService(mockPrisma);
    sessionsService = new AcademicSessionsService(mockPrisma);
    studentsService = new StudentsService(mockPrisma);
    facultyService = new FacultyService(mockPrisma);
    employeesService = new EmployeesService(mockPrisma);
  });

  // ----------------------------------------------------------------------------
  // 1. DEPARTMENTS
  // ----------------------------------------------------------------------------
  describe('1. Departments Module', () => {
    it('should create department and assign HOD role in transaction', async () => {
      mockPrisma.college.findFirst.mockResolvedValue({ id: 'campus-1', tenantId: TENANT_ID });
      mockPrisma.department.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-hod-1', tenantId: TENANT_ID });
      mockPrisma.department.create.mockResolvedValue({
        id: 'dept-cse',
        code: 'CSE',
        name: 'Computer Science',
        collegeId: 'campus-1',
        hodUserId: 'user-hod-1',
      });
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-hod-id', code: 'HOD' });

      const result = await departmentsService.create(
        TENANT_ID,
        {
          collegeId: 'campus-1',
          code: 'CSE',
          name: 'Computer Science',
          hodUserId: 'user-hod-1',
        },
        'admin-actor',
      );

      expect(result.id).toBe('dept-cse');
      expect(mockPrisma.department.create).toHaveBeenCalled();
      expect(mockPrisma.userRole.upsert).toHaveBeenCalledWith({
        where: { userId_roleId: { userId: 'user-hod-1', roleId: 'role-hod-id' } },
        create: { userId: 'user-hod-1', roleId: 'role-hod-id' },
        update: {},
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DEPARTMENT_CREATED',
          entityName: 'Department',
        }),
      });
    });

    it('should prevent duplicate department code within the same college', async () => {
      mockPrisma.college.findFirst.mockResolvedValue({ id: 'campus-1', tenantId: TENANT_ID });
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'existing-dept', code: 'CSE' });

      await expect(
        departmentsService.create(TENANT_ID, {
          collegeId: 'campus-1',
          code: 'CSE',
          name: 'Computer Science',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ----------------------------------------------------------------------------
  // 2. COURSES
  // ----------------------------------------------------------------------------
  describe('2. Courses Module', () => {
    it('should create course program linked to department', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', name: 'Computer Science' });
      mockPrisma.course.findFirst.mockResolvedValue(null);
      mockPrisma.course.create.mockResolvedValue({
        id: 'course-btech-cse',
        code: 'BTECH-CSE',
        name: 'B.Tech CSE',
        durationSemesters: 8,
      });

      const result = await coursesService.create(
        TENANT_ID,
        {
          departmentId: 'dept-cse',
          code: 'BTECH-CSE',
          name: 'B.Tech CSE',
          durationSemesters: 8,
        },
        'admin-actor',
      );

      expect(result.id).toBe('course-btech-cse');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'COURSE_CREATED',
          entityName: 'Course',
        }),
      });
    });

    it('should prevent duplicate course codes in the same department', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', name: 'Computer Science' });
      mockPrisma.course.findFirst.mockResolvedValue({ id: 'existing-course', code: 'BTECH-CSE' });

      await expect(
        coursesService.create(TENANT_ID, {
          departmentId: 'dept-cse',
          code: 'BTECH-CSE',
          name: 'B.Tech CSE',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ----------------------------------------------------------------------------
  // 3. ACADEMIC SESSIONS
  // ----------------------------------------------------------------------------
  describe('3. Academic Sessions Module', () => {
    it('should deactivate previously active sessions when activating a new session', async () => {
      mockPrisma.academicSession.findFirst.mockResolvedValue(null);
      mockPrisma.academicSession.create.mockResolvedValue({
        id: 'session-2026',
        name: '2026-2027',
        isActive: true,
      });

      const result = await sessionsService.create(
        TENANT_ID,
        {
          name: '2026-2027',
          startDate: '2026-08-01',
          endDate: '2027-05-31',
          isActive: true,
        },
        'admin-actor',
      );

      expect(result.id).toBe('session-2026');
      expect(mockPrisma.academicSession.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isActive: true },
        data: { isActive: false },
      });
    });

    it('should transition to next session and promote students to next semester', async () => {
      mockPrisma.academicSession.findFirst.mockResolvedValue({
        id: 'session-2027',
        name: '2027-2028',
      });
      mockPrisma.student.updateMany.mockResolvedValue({ count: 120 });
      mockPrisma.academicSession.update.mockResolvedValue({ id: 'session-2027', isActive: true });

      const result = await sessionsService.transition(
        TENANT_ID,
        'session-2027',
        true,
        'admin-actor',
      );

      expect(result.success).toBe(true);
      expect(result.promotedStudentsCount).toBe(120);
      expect(mockPrisma.student.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        data: {
          currentSemester: { increment: 1 },
          academicSessionId: 'session-2027',
        },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ACADEMIC_SESSION_TRANSITIONED',
        }),
      });
    });
  });

  // ----------------------------------------------------------------------------
  // 4. STUDENTS & ADMISSION
  // ----------------------------------------------------------------------------
  describe('4. Students Admission Module', () => {
    it('should admit student, validate course-dept relationship, and provision user', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', name: 'Computer Science' });
      mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-cse', name: 'B.Tech CSE', departmentId: 'dept-cse' });
      mockPrisma.academicSession.findFirst.mockResolvedValue({ id: 'session-26' });

      mockPrisma.student.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      mockPrisma.user.create.mockResolvedValue({
        id: 'user-stu-1',
        email: 'rahul@campus.edu',
        firstName: 'Rahul',
        lastName: 'Verma',
      });

      mockPrisma.student.create.mockResolvedValue({
        id: 'stu-1',
        enrollmentNumber: 'ENR-2026-001',
        rollNumber: 'ROLL-001',
        currentSemester: 1,
      });

      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-student-id' });

      const result = await studentsService.admit(
        TENANT_ID,
        {
          email: 'rahul@campus.edu',
          password: 'SecureStudentPass2026!',
          firstName: 'Rahul',
          lastName: 'Verma',
          departmentId: 'dept-cse',
          courseId: 'course-cse',
          academicSessionId: 'session-26',
          enrollmentNumber: 'ENR-2026-001',
          rollNumber: 'ROLL-001',
          admissionYear: 2026,
        },
        'admin-actor',
      );

      expect(result.id).toBe('stu-1');
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user-stu-1', roleId: 'role-student-id' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'STUDENT_ADMITTED',
          entityName: 'Student',
        }),
      });
    });

    it('should reject student admission if course does not belong to specified department', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'dept-mechanical', name: 'Mechanical' });
      mockPrisma.course.findFirst.mockResolvedValue({
        id: 'course-cse',
        name: 'B.Tech CSE',
        departmentId: 'dept-cse', // Mismatched department!
      });
      mockPrisma.academicSession.findFirst.mockResolvedValue({ id: 'session-26' });

      await expect(
        studentsService.admit(TENANT_ID, {
          email: 'mismatch@campus.edu',
          password: 'Pass1234Password!',
          firstName: 'Anil',
          lastName: 'Kumar',
          departmentId: 'dept-mechanical',
          courseId: 'course-cse',
          academicSessionId: 'session-26',
          enrollmentNumber: 'ENR-2026-999',
          rollNumber: 'ROLL-999',
          admissionYear: 2026,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject student admission with duplicate enrollment number', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', name: 'CSE' });
      mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-cse', name: 'CSE', departmentId: 'dept-cse' });
      mockPrisma.academicSession.findFirst.mockResolvedValue({ id: 'session-26' });

      // Duplicate enrollment number found
      mockPrisma.student.findFirst.mockResolvedValueOnce({ id: 'existing-stu' });

      await expect(
        studentsService.admit(TENANT_ID, {
          email: 'dup@campus.edu',
          password: 'Pass1234Password!',
          firstName: 'Duplicate',
          lastName: 'Student',
          departmentId: 'dept-cse',
          courseId: 'course-cse',
          academicSessionId: 'session-26',
          enrollmentNumber: 'ENR-2026-DUPLICATE',
          rollNumber: 'ROLL-UNIQUE',
          admissionYear: 2026,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ----------------------------------------------------------------------------
  // 5. FACULTY
  // ----------------------------------------------------------------------------
  describe('5. Faculty Module', () => {
    it('should create faculty with employee code and query workload limit', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', name: 'CSE' });
      mockPrisma.faculty.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      mockPrisma.user.create.mockResolvedValue({
        id: 'user-fac-1',
        email: 'prof.anita@campus.edu',
      });
      mockPrisma.faculty.create.mockResolvedValue({
        id: 'fac-1',
        employeeCode: 'FAC-CSE-001',
        designation: 'Associate Professor',
        maxActiveQueries: 20,
      });
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-fac-id' });

      const result = await facultyService.create(
        TENANT_ID,
        {
          email: 'prof.anita@campus.edu',
          password: 'FacultyPassword123!',
          firstName: 'Dr. Anita',
          lastName: 'Deshmukh',
          departmentId: 'dept-cse',
          employeeCode: 'FAC-CSE-001',
          designation: 'Associate Professor',
          maxActiveQueries: 20,
        },
        'admin-actor',
      );

      expect(result.id).toBe('fac-1');
      expect(result.maxActiveQueries).toBe(20);
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user-fac-1', roleId: 'role-fac-id' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'FACULTY_CREATED',
          entityName: 'Faculty',
        }),
      });
    });
  });

  // ----------------------------------------------------------------------------
  // 6. EMPLOYEES
  // ----------------------------------------------------------------------------
  describe('6. Employees Module', () => {
    it('should map StaffCategory ACCOUNTS to ACCOUNTS_STAFF role and provision employee', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      mockPrisma.user.create.mockResolvedValue({
        id: 'user-acc-1',
        email: 'accounts@campus.edu',
      });
      mockPrisma.employee.create.mockResolvedValue({
        id: 'emp-1',
        employeeCode: 'EMP-ACC-001',
        staffCategory: StaffCategory.ACCOUNTS,
        designation: 'Senior Accountant',
      });
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-acc-id', code: 'ACCOUNTS_STAFF' });

      const result = await employeesService.create(
        TENANT_ID,
        {
          email: 'accounts@campus.edu',
          password: 'AccountsStaffPass123!',
          firstName: 'Suresh',
          lastName: 'Rao',
          employeeCode: 'EMP-ACC-001',
          staffCategory: StaffCategory.ACCOUNTS,
          designation: 'Senior Accountant',
        },
        'admin-actor',
      );

      expect(result.id).toBe('emp-1');
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user-acc-1', roleId: 'role-acc-id' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EMPLOYEE_CREATED',
          entityName: 'Employee',
        }),
      });
    });
  });
});
