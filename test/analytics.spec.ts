import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../src/modules/analytics/analytics.service.js';
import { QueryStatus } from '@prisma/client';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      query: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      queryFeedback: {
        aggregate: vi.fn(),
      },
      student: {
        count: vi.fn(),
      },
      faculty: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      queryCategory: {
        findMany: vi.fn(),
      },
      department: {
        findMany: vi.fn(),
      },
    };

    service = new AnalyticsService(mockPrisma);
  });

  it('1. getOverview calculates volume, resolution rate, and CSAT correctly', async () => {
    mockPrisma.query.count
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(20)  // open
      .mockResolvedValueOnce(80)  // resolved
      .mockResolvedValueOnce(5);  // escalated
    mockPrisma.queryFeedback.aggregate.mockResolvedValueOnce({
      _avg: { rating: 4.65 },
    });
    mockPrisma.student.count.mockResolvedValueOnce(500);
    mockPrisma.faculty.count.mockResolvedValueOnce(45);

    const result = await service.getOverview('tenant-1');

    expect(result.totalQueries).toBe(100);
    expect(result.openQueries).toBe(20);
    expect(result.resolvedQueries).toBe(80);
    expect(result.escalatedQueries).toBe(5);
    expect(result.resolutionRate).toBe(80);
    expect(result.averageRating).toBe(4.7);
    expect(result.totalStudents).toBe(500);
    expect(result.totalFaculty).toBe(45);
  });

  it('2. getQueryVolume buckets time-series by day', async () => {
    const d1 = new Date('2025-01-01T10:00:00Z');
    const d2 = new Date('2025-01-02T10:00:00Z');

    mockPrisma.query.findMany.mockResolvedValueOnce([
      { createdAt: d1, status: QueryStatus.RESOLVED },
      { createdAt: d1, status: QueryStatus.OPEN },
      { createdAt: d2, status: QueryStatus.OPEN },
    ]);

    const result = await service.getQueryVolume('tenant-1', {
      startDate: '2025-01-01',
      endDate: '2025-01-03',
      bucket: 'day',
    });

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].total).toBe(2);
    expect(result[0].resolved).toBe(1);
    expect(result[0].open).toBe(1);
  });

  it('3. getCategoryBreakdown calculates per-category metrics and SLA breaches', async () => {
    const now = new Date();
    const pastDeadline = new Date(Date.now() - 3600000);

    mockPrisma.queryCategory.findMany.mockResolvedValueOnce([
      {
        id: 'cat-1',
        name: 'Fees',
        queries: [
          { status: QueryStatus.RESOLVED, slaDeadline: new Date(Date.now() + 3600000), resolvedAt: now, isEscalated: false },
          { status: QueryStatus.OPEN, slaDeadline: pastDeadline, resolvedAt: null, isEscalated: false },
        ],
      },
    ]);

    const result = await service.getCategoryBreakdown('tenant-1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Fees');
    expect(result[0].total).toBe(2);
    expect(result[0].resolved).toBe(1);
    expect(result[0].slaBreached).toBe(1);
    expect(result[0].resolutionRate).toBe(50);
    expect(result[0].breachRate).toBe(50);
  });

  it('4. getSlaCompliance returns compliance rate and average response times', async () => {
    const t0 = new Date('2025-01-01T10:00:00Z');
    const t1 = new Date('2025-01-01T10:30:00Z'); // 30 min response
    const t2 = new Date('2025-01-01T12:00:00Z'); // 120 min resolution
    const futureDeadline = new Date('2025-01-01T15:00:00Z');
    const pastDeadline = new Date('2025-01-01T11:00:00Z');

    mockPrisma.query.findMany.mockResolvedValueOnce([
      {
        createdAt: t0,
        firstRespondedAt: t1,
        resolvedAt: t2,
        slaDeadline: futureDeadline,
        isEscalated: false,
      },
      {
        createdAt: t0,
        firstRespondedAt: null,
        resolvedAt: null,
        slaDeadline: pastDeadline,
        isEscalated: true,
      },
    ]);

    const result = await service.getSlaCompliance('tenant-1');

    expect(result.total).toBe(2);
    expect(result.breached).toBe(1);
    expect(result.compliant).toBe(1);
    expect(result.complianceRate).toBe(50);
    expect(result.avgFirstResponseMinutes).toBe(30);
    expect(result.avgResolutionMinutes).toBe(120);
  });

  it('5. getStudentEngagement computes unique submitters and repeat patterns', async () => {
    mockPrisma.query.findMany.mockResolvedValueOnce([
      { studentId: 'student-1', status: QueryStatus.OPEN },
      { studentId: 'student-1', status: QueryStatus.RESOLVED },
      { studentId: 'student-2', status: QueryStatus.RESOLVED },
    ]);

    const result = await service.getStudentEngagement('tenant-1');

    expect(result.uniqueStudentsSubmitted).toBe(2);
    expect(result.totalQueriesInPeriod).toBe(3);
    expect(result.repeatSubmitters).toBe(1);
    expect(result.singleQueryStudents).toBe(1);
  });

  it('6. getPriorityDistribution computes percentages correctly', async () => {
    mockPrisma.query.findMany.mockResolvedValueOnce([
      { priority: 'HIGH' },
      { priority: 'HIGH' },
      { priority: 'LOW' },
      { priority: 'MEDIUM' },
    ]);

    const result = await service.getPriorityDistribution('tenant-1');

    const high = result.find((r) => r.priority === 'HIGH');
    expect(high).toBeDefined();
    expect(high?.count).toBe(2);
    expect(high?.percentage).toBe(50);
  });

  it('7. getDepartmentPerformance aggregates resolution and resolution times', async () => {
    const t0 = new Date('2025-01-01T10:00:00Z');
    const t1 = new Date('2025-01-01T11:00:00Z'); // 60 min
    const t2 = new Date('2025-01-01T12:00:00Z'); // 120 min

    mockPrisma.department.findMany.mockResolvedValueOnce([
      {
        id: 'dept-1',
        name: 'Computer Science',
        code: 'CS',
        queries: [
          { createdAt: t0, resolvedAt: t1, status: QueryStatus.RESOLVED, slaDeadline: new Date(Date.now() + 100000), isEscalated: false },
          { createdAt: t0, resolvedAt: t2, status: QueryStatus.RESOLVED, slaDeadline: new Date(Date.now() + 100000), isEscalated: false },
        ],
      },
    ]);

    const result = await service.getDepartmentPerformance('tenant-1');

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('CS');
    expect(result[0].total).toBe(2);
    expect(result[0].resolutionRate).toBe(100);
    expect(result[0].avgResolutionMinutes).toBe(90);
  });
});
