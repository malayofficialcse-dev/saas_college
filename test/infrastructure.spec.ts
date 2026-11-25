// ==============================================================================
// CollegeQuery SaaS — Foundational Infrastructure Test Suite
// Covers: Configuration validation, Database lifecycle, Health endpoints,
// Correlation ID middleware, and Request/Response envelope conventions.
// ==============================================================================

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateEnvironment } from '../src/core/config/env.validation.js';
import { PrismaHealthIndicator } from '../src/core/health/prisma.health.js';
import { RedisHealthIndicator } from '../src/core/health/redis.health.js';
import { MongoHealthIndicator } from '../src/core/health/mongo.health.js';
import { HealthController } from '../src/core/health/health.controller.js';
import { CorrelationIdMiddleware } from '../src/common/middleware/correlation-id.middleware.js';

describe('Foundational Infrastructure Suite', () => {
  describe('1. Global Configuration & Environment Validation', () => {
    it('should validate default environment configuration successfully', () => {
      const config = {
        NODE_ENV: 'development',
        PORT: '4000',
        API_PREFIX: 'api/v1',
      };

      const validated = validateEnvironment(config);
      expect(validated.NODE_ENV).toBe('development');
      expect(validated.PORT).toBe(4000);
      expect(validated.DATABASE_URL).toBeDefined();
      expect(validated.REDIS_HOST).toBe('localhost');
      expect(validated.REDIS_PORT).toBe(6379);
    });

    it('should throw an error when invalid configuration values are provided', () => {
      const invalidConfig = {
        NODE_ENV: 'unsupported_environment',
        PORT: 'not_a_number',
      };

      expect(() => validateEnvironment(invalidConfig)).toThrowError(
        /Environment validation error/,
      );
    });
  });

  describe('2. Health Indicators & Probes', () => {
    it('should report PostgreSQL healthy when queryRaw succeeds', async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      };

      const indicator = new PrismaHealthIndicator(mockPrisma as any);
      const result = await indicator.isHealthy('postgres');

      expect(result).toEqual({ postgres: { status: 'up' } });
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should throw HealthCheckError when PostgreSQL query fails', async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused')),
      };

      const indicator = new PrismaHealthIndicator(mockPrisma as any);
      await expect(indicator.isHealthy('postgres')).rejects.toThrow();
    });

    it('should report Redis healthy when ping returns PONG', async () => {
      const mockRedisService = {
        getClient: vi.fn().mockReturnValue({
          ping: vi.fn().mockResolvedValue('PONG'),
        }),
      };

      const indicator = new RedisHealthIndicator(mockRedisService as any);
      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({ redis: { status: 'up' } });
    });

    it('should report MongoDB healthy when connection readyState is 1', async () => {
      const mockConnection = {
        readyState: 1,
      };

      const indicator = new MongoHealthIndicator(mockConnection as any);
      const result = await indicator.isHealthy('mongodb');

      expect(result).toEqual({ mongodb: { status: 'up' } });
    });

    it('should throw HealthCheckError when MongoDB is disconnected', async () => {
      const mockConnection = {
        readyState: 0,
      };

      const indicator = new MongoHealthIndicator(mockConnection as any);
      await expect(indicator.isHealthy('mongodb')).rejects.toThrow();
    });
  });

  describe('3. Health Controller Liveness and Readiness Probes', () => {
    let healthController: HealthController;
    let mockHealthService: any;
    let mockPrismaHealth: any;
    let mockRedisHealth: any;
    let mockMongoHealth: any;
    let mockMemory: any;
    let mockDisk: any;

    beforeEach(() => {
      mockHealthService = {
        check: vi.fn(async (checks: Array<() => Promise<any>>) => {
          const results: Record<string, any> = {};
          for (const check of checks) {
            const res = await check();
            Object.assign(results, res);
          }
          return { status: 'ok', info: results, error: {}, details: results };
        }),
      };

      mockPrismaHealth = {
        isHealthy: vi.fn().mockResolvedValue({ postgres: { status: 'up' } }),
      };
      mockRedisHealth = {
        isHealthy: vi.fn().mockResolvedValue({ redis: { status: 'up' } }),
      };
      mockMongoHealth = {
        isHealthy: vi.fn().mockResolvedValue({ mongodb: { status: 'up' } }),
      };
      mockMemory = {
        checkHeap: vi.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
      };
      mockDisk = {
        checkStorage: vi.fn().mockResolvedValue({ disk: { status: 'up' } }),
      };

      healthController = new HealthController(
        mockHealthService,
        mockPrismaHealth,
        mockRedisHealth,
        mockMongoHealth,
        mockMemory,
        mockDisk,
      );
    });

    it('should execute liveness check with memory indicator', async () => {
      const res = await healthController.liveness();
      expect(res.status).toBe('ok');
      expect(mockHealthService.check).toHaveBeenCalled();
    });

    it('should execute readiness check with all database and subsystem indicators', async () => {
      const res = await healthController.readiness();
      expect(res.status).toBe('ok');
      expect(mockPrismaHealth.isHealthy).toHaveBeenCalledWith('postgres');
      expect(mockRedisHealth.isHealthy).toHaveBeenCalledWith('redis');
      expect(mockMongoHealth.isHealthy).toHaveBeenCalledWith('mongodb');
    });
  });

  describe('4. Request Tracing & Correlation ID Middleware', () => {
    it('should propagate existing x-correlation-id header', () => {
      const middleware = new CorrelationIdMiddleware();
      const existingId = 'corr-existing-12345';
      const req: any = {
        headers: { 'x-correlation-id': existingId },
      };
      const res: any = {
        setHeader: vi.fn(),
      };
      const next = vi.fn();

      middleware.use(req, res, next);

      expect(req.correlationId).toBe(existingId);
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', existingId);
      expect(next).toHaveBeenCalled();
    });

    it('should generate a new UUID correlation ID if header is missing', () => {
      const middleware = new CorrelationIdMiddleware();
      const req: any = {
        headers: {},
      };
      const res: any = {
        setHeader: vi.fn(),
      };
      const next = vi.fn();

      middleware.use(req, res, next);

      expect(req.correlationId).toBeDefined();
      expect(typeof req.correlationId).toBe('string');
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', req.correlationId);
      expect(next).toHaveBeenCalled();
    });
  });
});
