import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsService } from '../src/modules/reports/reports.service.js';
import { QueryStatus } from '@prisma/client';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      query: { findMany: vi.fn() },
      faculty: { findMany: vi.fn() },
      student: { findMany: vi.fn() },
      invoice: { findMany: vi.fn() },
    };

    service = new ReportsService(mockPrisma);
  });

  it('1. generateTicketSummaryCsv outputs CSV headers and rows with escaped text', async () => {
    mockPrisma.query.findMany.mockResolvedValueOnce([
      {
        ticketNumber: 'TICK-1001',
        title: 'Fee "Receipt" Delay',
        status: QueryStatus.RESOLVED,
        priority: 'HIGH',
        category: { name: 'Accounts' },
        department: { code: 'ACC' },
        student: {
          user: { firstName: 'Alice', lastName: 'Smith', email: 'alice@college.edu' },
        },
        createdAt: new Date('2025-01-01T10:00:00Z'),
        resolvedAt: new Date('2025-01-01T12:00:00Z'),
      },
    ]);

    const report = await service.generateTicketSummaryCsv('tenant-1');

    expect(report.contentType).toBe('text/csv');
    expect(report.fileName).toContain('tickets-summary-');
    expect(report.data).toContain('Ticket Number,Title,Status');
    expect(report.data).toContain('"TICK-1001"');
    expect(report.data).toContain('"Fee ""Receipt"" Delay"');
    expect(report.data).toContain('"Alice Smith"');
  });

  it('2. generateSlaComplianceCsv exports SLA metrics and breach indicators', async () => {
    const t0 = new Date('2025-01-01T10:00:00Z');
    const t1 = new Date('2025-01-01T10:45:00Z'); // 45m
    const t2 = new Date('2025-01-01T15:00:00Z'); // 300m
    const deadline = new Date('2025-01-01T14:00:00Z'); // 240m deadline (breached)

    mockPrisma.query.findMany.mockResolvedValueOnce([
      {
        ticketNumber: 'TICK-2001',
        category: { name: 'Exam' },
        department: { code: 'COE' },
        createdAt: t0,
        firstRespondedAt: t1,
        resolvedAt: t2,
        slaDeadline: deadline,
        isEscalated: true,
      },
    ]);

    const report = await service.generateSlaComplianceCsv('tenant-1');

    expect(report.contentType).toBe('text/csv');
    expect(report.data).toContain('Ticket Number,Category,Department');
    expect(report.data).toContain('"TICK-2001","Exam","COE",60,45');
    expect(report.data).toContain('"YES"');
  });

  it('3. generateFacultyWorkloadCsv exports active assigned counts and total handled', async () => {
    mockPrisma.faculty.findMany.mockResolvedValueOnce([
      {
        employeeCode: 'FAC-001',
        designation: 'Professor',
        user: { firstName: 'John', lastName: 'Doe', email: 'john@college.edu' },
        department: { code: 'CSE' },
        queryAssignments: [
          { unassignedAt: null, query: { status: QueryStatus.IN_PROGRESS } },
          { unassignedAt: null, query: { status: QueryStatus.RESOLVED } },
        ],
      },
    ]);

    const report = await service.generateFacultyWorkloadCsv('tenant-1');

    expect(report.contentType).toBe('text/csv');
    expect(report.data).toContain('Employee Code,Name,Email,Department');
    expect(report.data).toContain('"FAC-001","John Doe","john@college.edu","CSE","Professor",1,2');
  });

  it('4. generateStudentActivityCsv exports student submission and resolution counts', async () => {
    mockPrisma.student.findMany.mockResolvedValueOnce([
      {
        enrollmentNumber: 'ENR-2025-001',
        user: { firstName: 'Bob', lastName: 'Jones', email: 'bob@college.edu' },
        department: { code: 'MECH' },
        course: { code: 'BTECH' },
        queries: [
          { status: QueryStatus.RESOLVED },
          { status: QueryStatus.OPEN },
        ],
      },
    ]);

    const report = await service.generateStudentActivityCsv('tenant-1');

    expect(report.contentType).toBe('text/csv');
    expect(report.data).toContain('Enrollment Number,Student Name');
    expect(report.data).toContain('"ENR-2025-001","Bob Jones","bob@college.edu","MECH","BTECH",2,1');
  });

  it('5. generateBillingHistoryCsv exports invoice details correctly', async () => {
    mockPrisma.invoice.findMany.mockResolvedValueOnce([
      {
        invoiceNumber: 'INV-2025-001',
        description: 'Starter Plan Renewal',
        amount: 1999,
        currency: 'INR',
        status: 'PAID',
        dueDate: new Date('2025-02-01T00:00:00Z'),
        paidAt: new Date('2025-01-25T15:30:00Z'),
        createdAt: new Date('2025-01-20T00:00:00Z'),
      },
    ]);

    const report = await service.generateBillingHistoryCsv('tenant-1');

    expect(report.contentType).toBe('text/csv');
    expect(report.data).toContain('Invoice Number,Description,Amount,Currency,Status');
    expect(report.data).toContain('"INV-2025-001","Starter Plan Renewal",1999,"INR","PAID"');
  });
});
