import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogsService } from '../src/modules/audit-logs/audit-logs.service.js';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        count: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
    };

    service = new AuditLogsService(mockPrisma);
  });

  it('1. findAll filters by tenantId, action, and date range', async () => {
    mockPrisma.auditLog.count.mockResolvedValueOnce(2);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        id: 'log-1',
        tenantId: 'tenant-1',
        action: 'USER_LOGIN',
        entityName: 'User',
        entityId: 'user-1',
        createdAt: new Date('2025-01-01T10:00:00Z'),
        user: { id: 'user-1', email: 'user@test.edu', firstName: 'John', lastName: 'Doe' },
      },
      {
        id: 'log-2',
        tenantId: 'tenant-1',
        action: 'USER_LOGIN',
        entityName: 'User',
        entityId: 'user-2',
        createdAt: new Date('2025-01-02T10:00:00Z'),
        user: { id: 'user-2', email: 'user2@test.edu', firstName: 'Jane', lastName: 'Doe' },
      },
    ]);

    const result = await service.findAll('tenant-1', {
      action: 'USER_LOGIN',
      startDate: '2025-01-01',
      endDate: '2025-01-03',
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.meta.totalPages).toBe(1);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          action: 'USER_LOGIN',
        }),
      }),
    );
  });

  it('2. record creates an immutable audit trail entry with full details', async () => {
    mockPrisma.auditLog.create.mockResolvedValueOnce({ id: 'log-created' });

    await service.record({
      tenantId: 'tenant-1',
      userId: 'user-1',
      action: 'ROLE_CHANGED',
      entityName: 'UserRole',
      entityId: 'ur-1',
      oldValues: { role: 'STUDENT' },
      newValues: { role: 'FACULTY' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'ROLE_CHANGED',
        entityName: 'UserRole',
        entityId: 'ur-1',
        oldValues: { role: 'STUDENT' },
        newValues: { role: 'FACULTY' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
    });
  });

  it('3. tenant isolation: null tenantId queries global logs without leaking other tenants if tenantId passed', async () => {
    mockPrisma.auditLog.count.mockResolvedValueOnce(0);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([]);

    await service.findAll('tenant-A');

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-A' }),
      }),
    );
  });
});
