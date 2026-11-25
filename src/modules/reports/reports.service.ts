// ==============================================================================
// CollegeQuery SaaS – Reports Service
// Generates CSV exports for ticket history, SLA compliance, faculty workload,
// student activity, and tenant billing.
// ==============================================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { QueryStatus } from '@prisma/client';

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  status?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Export Ticket Summary CSV
   */
  async generateTicketSummaryCsv(tenantId: string, filter: ReportFilterOptions = {}) {
    const where: any = { tenantId };
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.departmentId) {
      where.departmentId = filter.departmentId;
    }
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const queries = await this.prisma.query.findMany({
      where,
      include: {
        category: true,
        department: true,
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const headers =
      'Ticket Number,Title,Status,Priority,Category,Department,Student Name,Student Email,Created At,Resolved At\n';
    const rows = queries
      .map((q) => {
        const studentName = q.student
          ? `${q.student.user.firstName} ${q.student.user.lastName}`
          : 'N/A';
        const studentEmail = q.student?.user.email || 'N/A';
        const resolvedAt = q.resolvedAt ? q.resolvedAt.toISOString() : '';

        return `"${q.ticketNumber}","${this.escapeCsv(q.title)}","${q.status}","${q.priority}","${this.escapeCsv(q.category.name)}","${q.department.code}","${this.escapeCsv(studentName)}","${studentEmail}","${q.createdAt.toISOString()}","${resolvedAt}"`;
      })
      .join('\n');

    return {
      fileName: `tickets-summary-${Date.now()}.csv`,
      contentType: 'text/csv',
      data: headers + rows,
    };
  }

  /**
   * 2. Export SLA Compliance CSV
   */
  async generateSlaComplianceCsv(tenantId: string, filter: ReportFilterOptions = {}) {
    const where: any = { tenantId };
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const queries = await this.prisma.query.findMany({
      where,
      include: {
        category: true,
        department: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const now = new Date();
    const headers =
      'Ticket Number,Category,Department,First Response Target (min),Actual First Response (min),Resolution Deadline,Actual Resolution (min),Breached,Created At\n';
    const rows = queries
      .map((q) => {
        const firstResponseMinutes = q.firstRespondedAt
          ? Math.round(
              (q.firstRespondedAt.getTime() - q.createdAt.getTime()) / 60000,
            )
          : '';
        const resolutionMinutes = q.resolvedAt
          ? Math.round(
              (q.resolvedAt.getTime() - q.createdAt.getTime()) / 60000,
            )
          : '';
        const isBreached =
          q.isEscalated ||
          (q.slaDeadline &&
            ((q.resolvedAt && q.resolvedAt > q.slaDeadline) ||
              (!q.resolvedAt && now > q.slaDeadline)));

        const deadlineStr = q.slaDeadline ? q.slaDeadline.toISOString() : 'N/A';

        return `"${q.ticketNumber}","${this.escapeCsv(q.category.name)}","${q.department.code}",60,${firstResponseMinutes},"${deadlineStr}",${resolutionMinutes},"${isBreached ? 'YES' : 'NO'}","${q.createdAt.toISOString()}"`;
      })
      .join('\n');

    return {
      fileName: `sla-compliance-${Date.now()}.csv`,
      contentType: 'text/csv',
      data: headers + rows,
    };
  }

  /**
   * 3. Export Faculty Workload CSV
   */
  async generateFacultyWorkloadCsv(tenantId: string) {
    const facultyList = await this.prisma.faculty.findMany({
      where: { tenantId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        department: { select: { name: true, code: true } },
        queryAssignments: {
          include: { query: { select: { status: true } } },
        },
      },
      orderBy: { employeeCode: 'asc' },
    });

    const headers =
      'Employee Code,Name,Email,Department,Designation,Active Assigned Queries,Total Queries Handled\n';
    const rows = facultyList
      .map((f) => {
        const name = `${f.user.firstName} ${f.user.lastName}`;
        const activeCount = f.queryAssignments.filter(
          (qa) =>
            qa.unassignedAt === null &&
            qa.query.status !== QueryStatus.RESOLVED &&
            qa.query.status !== QueryStatus.CLOSED,
        ).length;
        const totalCount = f.queryAssignments.length;

        return `"${f.employeeCode}","${this.escapeCsv(name)}","${f.user.email}","${f.department.code}","${f.designation}",${activeCount},${totalCount}`;
      })
      .join('\n');

    return {
      fileName: `faculty-workload-${Date.now()}.csv`,
      contentType: 'text/csv',
      data: headers + rows,
    };
  }

  /**
   * 4. Export Student Activity CSV
   */
  async generateStudentActivityCsv(tenantId: string, filter: ReportFilterOptions = {}) {
    const where: any = { tenantId };
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const students = await this.prisma.student.findMany({
      where: { tenantId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        department: { select: { name: true, code: true } },
        course: { select: { name: true, code: true } },
        queries: { where },
      },
      orderBy: { enrollmentNumber: 'asc' },
      take: 1000,
    });

    const headers =
      'Enrollment Number,Student Name,Email,Department,Course,Total Queries Submitted,Resolved Queries\n';
    const rows = students
      .map((s) => {
        const name = `${s.user.firstName} ${s.user.lastName}`;
        const total = s.queries.length;
        const resolved = s.queries.filter(
          (q) =>
            q.status === QueryStatus.RESOLVED || q.status === QueryStatus.CLOSED,
        ).length;

        return `"${s.enrollmentNumber}","${this.escapeCsv(name)}","${s.user.email}","${s.department.code}","${s.course.code}",${total},${resolved}`;
      })
      .join('\n');

    return {
      fileName: `student-activity-${Date.now()}.csv`,
      contentType: 'text/csv',
      data: headers + rows,
    };
  }

  /**
   * 5. Export Invoices / Billing History CSV
   */
  async generateBillingHistoryCsv(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const headers =
      'Invoice Number,Description,Amount,Currency,Status,Due Date,Paid At,Created At\n';
    const rows = invoices
      .map((inv) => {
        const paidAt = inv.paidAt ? inv.paidAt.toISOString() : '';
        const dueDate = inv.dueDate ? inv.dueDate.toISOString() : '';
        return `"${inv.invoiceNumber}","${this.escapeCsv(inv.description || '')}",${inv.amount},"${inv.currency}","${inv.status}","${dueDate}","${paidAt}","${inv.createdAt.toISOString()}"`;
      })
      .join('\n');

    return {
      fileName: `billing-history-${Date.now()}.csv`,
      contentType: 'text/csv',
      data: headers + rows,
    };
  }

  private escapeCsv(val: string): string {
    if (!val) return '';
    return val.replace(/"/g, '""');
  }
}
