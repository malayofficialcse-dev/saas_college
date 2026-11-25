import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlaMonitorService } from '../src/modules/sla/sla-monitor.service.js';
import { QueryStatus, EscalationTrigger } from '@prisma/client';

describe('SLA Monitor & Automated Escalation Suite', () => {
  let slaMonitorService: SlaMonitorService;
  let mockPrisma: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockEventEmitter = {
      emit: vi.fn(),
    };

    mockPrisma = {
      query: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      queryEscalation: {
        create: vi.fn(),
      },
      queryStatusHistory: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    slaMonitorService = new SlaMonitorService(mockPrisma as any, mockEventEmitter as any);
  });

  it('should detect breached queries and escalate to Department HOD', async () => {
    const expiredDeadline = new Date();
    expiredDeadline.setHours(expiredDeadline.getHours() - 5); // 5 hours past deadline

    mockPrisma.query.findMany.mockResolvedValue([
      {
        id: 'breached-query-1',
        tenantId: 'tenant-acme',
        ticketNumber: 'CQ-2026-00010',
        title: 'Hall ticket not issued',
        status: QueryStatus.ASSIGNED,
        isEscalated: false,
        escalationLevel: 0,
        slaDeadline: expiredDeadline,
        department: {
          id: 'dept-cse',
          hodUserId: 'user-hod-cse',
        },
      },
    ]);

    const escalatedCount = await slaMonitorService.checkBreachesAndEscalate();

    expect(escalatedCount).toBe(1);
    expect(mockPrisma.queryEscalation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        queryId: 'breached-query-1',
        fromLevel: 0,
        toLevel: 1,
        triggerReason: EscalationTrigger.SLA_BREACH,
        escalatedToUserId: 'user-hod-cse',
      }),
    });
    expect(mockPrisma.query.update).toHaveBeenCalledWith({
      where: { id: 'breached-query-1' },
      data: expect.objectContaining({
        isEscalated: true,
        escalationLevel: 1,
        status: QueryStatus.ESCALATED,
      }),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-hod-cse',
        title: expect.stringContaining('SLA Breach Alert'),
      }),
    });
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('query.escalated', expect.any(Object));
  });

  it('should fall back to College Admin if Department HOD is not assigned', async () => {
    const expiredDeadline = new Date();
    expiredDeadline.setHours(expiredDeadline.getHours() - 2);

    mockPrisma.query.findMany.mockResolvedValue([
      {
        id: 'breached-query-2',
        tenantId: 'tenant-acme',
        ticketNumber: 'CQ-2026-00012',
        title: 'Hostel WiFi broken',
        status: QueryStatus.OPEN,
        isEscalated: false,
        escalationLevel: 0,
        slaDeadline: expiredDeadline,
        department: { id: 'dept-hostel', hodUserId: null }, // No HOD
      },
    ]);

    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'college-admin-uuid',
      userType: 'COLLEGE_ADMIN',
    });

    const escalatedCount = await slaMonitorService.checkBreachesAndEscalate();

    expect(escalatedCount).toBe(1);
    expect(mockPrisma.queryEscalation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        escalatedToUserId: 'college-admin-uuid',
        triggerReason: EscalationTrigger.SLA_BREACH,
      }),
    });
  });
});
