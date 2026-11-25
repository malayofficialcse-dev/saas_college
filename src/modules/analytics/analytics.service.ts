// ==============================================================================
// CollegeQuery SaaS – Analytics Service
// Tenant-scoped metrics: query volume, resolution rates, SLA compliance,
// category breakdowns, faculty workload, student engagement, and time-series.
// ==============================================================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { QueryStatus } from '@prisma/client';

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Overview Dashboard
  // ---------------------------------------------------------------------------

  async getOverview(tenantId: string) {
    const [
      totalQueries,
      openQueries,
      resolvedQueries,
      escalatedQueries,
      avgFeedback,
      totalStudents,
      totalFaculty,
    ] = await Promise.all([
      this.prisma.query.count({ where: { tenantId } }),
      this.prisma.query.count({
        where: {
          tenantId,
          status: {
            in: [QueryStatus.OPEN, QueryStatus.ASSIGNED, QueryStatus.IN_PROGRESS],
          },
        },
      }),
      this.prisma.query.count({
        where: {
          tenantId,
          status: { in: [QueryStatus.RESOLVED, QueryStatus.CLOSED] },
        },
      }),
      this.prisma.query.count({ where: { tenantId, isEscalated: true } }),
      this.prisma.queryFeedback.aggregate({
        where: { tenantId },
        _avg: { rating: true },
      }),
      this.prisma.student.count({ where: { tenantId } }),
      this.prisma.faculty.count({ where: { tenantId } }),
    ]);

    const resolutionRate =
      totalQueries > 0 ? (resolvedQueries / totalQueries) * 100 : 0;

    return {
      totalQueries,
      openQueries,
      resolvedQueries,
      escalatedQueries,
      resolutionRate: parseFloat(resolutionRate.toFixed(1)),
      averageRating: parseFloat((avgFeedback._avg.rating ?? 0).toFixed(1)),
      totalStudents,
      totalFaculty,
    };
  }

  // ---------------------------------------------------------------------------
  // Query Volume Over Time (time-series bucketed by day/week/month)
  // ---------------------------------------------------------------------------

  async getQueryVolume(
    tenantId: string,
    filter: DateRangeFilter & { bucket?: 'day' | 'week' | 'month' },
  ) {
    const { startDate, endDate, bucket = 'day' } = filter;
    const start = startDate ? new Date(startDate) : this.daysAgo(30);
    const end = endDate ? new Date(endDate) : new Date();

    if (start > end) {
      throw new BadRequestException('startDate must be before endDate.');
    }

    const buckets = this.buildTimeBuckets(start, end, bucket);

    const queries = await this.prisma.query.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, status: true },
    });

    return buckets.map((b) => {
      const inRange = queries.filter(
        (q) => q.createdAt >= b.from && q.createdAt < b.to,
      );
      return {
        period: b.label,
        total: inRange.length,
        resolved: inRange.filter(
          (q) =>
            q.status === QueryStatus.RESOLVED || q.status === QueryStatus.CLOSED,
        ).length,
        open: inRange.filter(
          (q) =>
            q.status === QueryStatus.OPEN ||
            q.status === QueryStatus.ASSIGNED ||
            q.status === QueryStatus.IN_PROGRESS,
        ).length,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Category Breakdown
  // ---------------------------------------------------------------------------

  async getCategoryBreakdown(tenantId: string, filter: DateRangeFilter = {}) {
    const start = filter.startDate ? new Date(filter.startDate) : this.daysAgo(30);
    const end = filter.endDate ? new Date(filter.endDate) : new Date();
    const now = new Date();

    const categories = await this.prisma.queryCategory.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        queries: {
          where: { createdAt: { gte: start, lte: end } },
          select: {
            status: true,
            slaDeadline: true,
            resolvedAt: true,
            isEscalated: true,
          },
        },
      },
    });

    return categories.map((cat) => {
      const total = cat.queries.length;
      const resolved = cat.queries.filter(
        (q) =>
          q.status === QueryStatus.RESOLVED || q.status === QueryStatus.CLOSED,
      ).length;
      const breached = cat.queries.filter(
        (q) =>
          q.isEscalated ||
          (q.slaDeadline &&
            ((q.resolvedAt && q.resolvedAt > q.slaDeadline) ||
              (!q.resolvedAt && now > q.slaDeadline))),
      ).length;

      return {
        categoryId: cat.id,
        name: cat.name,
        total,
        resolved,
        open: total - resolved,
        slaBreached: breached,
        resolutionRate:
          total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0,
        breachRate:
          total > 0 ? parseFloat(((breached / total) * 100).toFixed(1)) : 0,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // SLA Compliance Metrics
  // ---------------------------------------------------------------------------

  async getSlaCompliance(tenantId: string, filter: DateRangeFilter = {}) {
    const start = filter.startDate ? new Date(filter.startDate) : this.daysAgo(30);
    const end = filter.endDate ? new Date(filter.endDate) : new Date();
    const now = new Date();

    const queries = await this.prisma.query.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      select: {
        createdAt: true,
        slaDeadline: true,
        firstRespondedAt: true,
        resolvedAt: true,
        isEscalated: true,
      },
    });

    const total = queries.length;
    const breachedQueries = queries.filter(
      (q) =>
        q.isEscalated ||
        (q.slaDeadline &&
          ((q.resolvedAt && q.resolvedAt > q.slaDeadline) ||
            (!q.resolvedAt && now > q.slaDeadline))),
    );
    const breached = breachedQueries.length;
    const compliant = total - breached;
    const complianceRate =
      total > 0 ? parseFloat((((total - breached) / total) * 100).toFixed(1)) : 100;

    const firstResponseBreached = queries.filter(
      (q) => q.slaDeadline && !q.firstRespondedAt && now > q.slaDeadline,
    ).length;

    const firstResponseMinutesList = queries
      .filter((q) => q.firstRespondedAt != null)
      .map((q) =>
        Math.round(
          (q.firstRespondedAt!.getTime() - q.createdAt.getTime()) / 60000,
        ),
      );
    const avgFirstResponseMinutes =
      firstResponseMinutesList.length > 0
        ? Math.round(
            firstResponseMinutesList.reduce((a, b) => a + b, 0) /
              firstResponseMinutesList.length,
          )
        : 0;

    const resolutionMinutesList = queries
      .filter((q) => q.resolvedAt != null)
      .map((q) =>
        Math.round((q.resolvedAt!.getTime() - q.createdAt.getTime()) / 60000),
      );
    const avgResolutionMinutes =
      resolutionMinutesList.length > 0
        ? Math.round(
            resolutionMinutesList.reduce((a, b) => a + b, 0) /
              resolutionMinutesList.length,
          )
        : 0;

    return {
      total,
      breached,
      compliant,
      complianceRate,
      firstResponseBreached,
      avgFirstResponseMinutes,
      avgResolutionMinutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Faculty Workload
  // ---------------------------------------------------------------------------

  async getFacultyWorkload(tenantId: string) {
    return this.prisma.faculty.findMany({
      where: { tenantId },
      select: {
        id: true,
        employeeCode: true,
        designation: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        department: { select: { name: true, code: true } },
        _count: {
          select: {
            queryAssignments: {
              where: {
                unassignedAt: null,
                query: {
                  status: {
                    notIn: [QueryStatus.RESOLVED, QueryStatus.CLOSED],
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Student Engagement
  // ---------------------------------------------------------------------------

  async getStudentEngagement(tenantId: string, filter: DateRangeFilter = {}) {
    const start = filter.startDate ? new Date(filter.startDate) : this.daysAgo(30);
    const end = filter.endDate ? new Date(filter.endDate) : new Date();

    const queries = await this.prisma.query.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      select: { studentId: true, status: true },
    });

    const byStudent = new Map<string, number>();
    for (const q of queries) {
      byStudent.set(q.studentId, (byStudent.get(q.studentId) ?? 0) + 1);
    }

    const counts = Array.from(byStudent.values());
    const avgQueriesPerStudent =
      counts.length > 0
        ? parseFloat(
            (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2),
          )
        : 0;

    return {
      uniqueStudentsSubmitted: byStudent.size,
      totalQueriesInPeriod: queries.length,
      avgQueriesPerStudent,
      repeatSubmitters: counts.filter((c) => c > 1).length,
      singleQueryStudents: counts.filter((c) => c === 1).length,
    };
  }

  // ---------------------------------------------------------------------------
  // Priority Distribution
  // ---------------------------------------------------------------------------

  async getPriorityDistribution(tenantId: string, filter: DateRangeFilter = {}) {
    const start = filter.startDate ? new Date(filter.startDate) : this.daysAgo(30);
    const end = filter.endDate ? new Date(filter.endDate) : new Date();

    const queries = await this.prisma.query.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      select: { priority: true },
    });

    const dist = new Map<string, number>();
    for (const q of queries) {
      dist.set(q.priority, (dist.get(q.priority) ?? 0) + 1);
    }

    return Array.from(dist.entries()).map(([priority, count]) => ({
      priority,
      count,
      percentage:
        queries.length > 0
          ? parseFloat(((count / queries.length) * 100).toFixed(1))
          : 0,
    }));
  }

  // ---------------------------------------------------------------------------
  // Department Performance
  // ---------------------------------------------------------------------------

  async getDepartmentPerformance(tenantId: string, filter: DateRangeFilter = {}) {
    const start = filter.startDate ? new Date(filter.startDate) : this.daysAgo(30);
    const end = filter.endDate ? new Date(filter.endDate) : new Date();
    const now = new Date();

    const departments = await this.prisma.department.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        queries: {
          where: { createdAt: { gte: start, lte: end } },
          select: {
            createdAt: true,
            status: true,
            slaDeadline: true,
            resolvedAt: true,
            isEscalated: true,
          },
        },
      },
    });

    return departments.map((dept) => {
      const total = dept.queries.length;
      const resolved = dept.queries.filter(
        (q) =>
          q.status === QueryStatus.RESOLVED || q.status === QueryStatus.CLOSED,
      ).length;
      const breached = dept.queries.filter(
        (q) =>
          q.isEscalated ||
          (q.slaDeadline &&
            ((q.resolvedAt && q.resolvedAt > q.slaDeadline) ||
              (!q.resolvedAt && now > q.slaDeadline))),
      ).length;
      const resolutionTimes = dept.queries
        .filter((q) => q.resolvedAt != null)
        .map((q) =>
          Math.round(
            (q.resolvedAt!.getTime() - q.createdAt.getTime()) / 60000,
          ),
        );
      const avgResolution =
        resolutionTimes.length > 0
          ? Math.round(
              resolutionTimes.reduce((a, b) => a + b, 0) /
                resolutionTimes.length,
            )
          : null;

      return {
        departmentId: dept.id,
        name: dept.name,
        code: dept.code,
        total,
        resolved,
        breached,
        resolutionRate:
          total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0,
        avgResolutionMinutes: avgResolution,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private buildTimeBuckets(
    start: Date,
    end: Date,
    bucket: 'day' | 'week' | 'month',
  ): Array<{ label: string; from: Date; to: Date }> {
    const result: Array<{ label: string; from: Date; to: Date }> = [];
    let current = new Date(start);

    while (current < end) {
      const from = new Date(current);
      let to: Date;

      if (bucket === 'day') {
        to = new Date(from);
        to.setDate(to.getDate() + 1);
      } else if (bucket === 'week') {
        to = new Date(from);
        to.setDate(to.getDate() + 7);
      } else {
        to = new Date(from);
        to.setMonth(to.getMonth() + 1);
      }

      if (to > end) to = new Date(end);

      result.push({ label: from.toISOString().split('T')[0], from, to });
      current = to;
    }

    return result;
  }
}
