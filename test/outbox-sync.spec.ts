import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutboxRelayerService } from '../src/modules/queries/outbox-relayer.service.js';

describe('Transactional Outbox Pattern & MongoDB Sync Suite', () => {
  let outboxRelayer: OutboxRelayerService;
  let mockPrisma: any;
  let mockConversationModel: any;
  let mockActivityModel: any;

  beforeEach(() => {
    mockPrisma = {
      outboxEvent: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    mockConversationModel = {
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };

    mockActivityModel = {
      create: vi.fn().mockResolvedValue({ _id: 'activity-id' }),
    };

    outboxRelayer = new OutboxRelayerService(
      mockPrisma as any,
      mockConversationModel as any,
      mockActivityModel as any,
    );
  });

  it('should poll unhandled outbox events and synchronize them idempotently to MongoDB', async () => {
    mockPrisma.outboxEvent.findMany.mockResolvedValue([
      {
        id: 'event-uuid-1',
        tenantId: 'tenant-acme',
        eventType: 'QUERY_CREATED',
        aggregateId: 'query-101',
        payload: {
          queryId: 'query-101',
          ticketNumber: 'CQ-2026-00015',
          studentUserId: 'student-1',
          assignedToUserId: 'faculty-1',
          title: 'Grade card discrepancy',
        },
      },
    ]);

    const processedCount = await outboxRelayer.processOutboxBatch();

    expect(processedCount).toBe(1);
    // Idempotent upsert in MongoDB
    expect(mockConversationModel.updateOne).toHaveBeenCalledWith(
      { tenantId: 'tenant-acme', queryId: 'query-101' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          ticketNumber: 'CQ-2026-00015',
          status: 'OPEN',
        }),
      }),
      { upsert: true },
    );
    // Activity timeline entry
    expect(mockActivityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-acme',
        queryId: 'query-101',
        eventType: 'QUERY_CREATED',
      }),
    );
    // PostgreSQL outbox marked as processed
    expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-uuid-1' },
      data: expect.objectContaining({ isProcessed: true }),
    });
  });
});
