// ==============================================================================
// CollegeQuery SaaS — Health Module
// Provides /api/v1/health and /api/v1/health/ready endpoints
// Uses @nestjs/terminus for structured health checks
// ==============================================================================

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { PrismaHealthIndicator } from './prisma.health.js';
import { RedisHealthIndicator } from './redis.health.js';
import { MongoHealthIndicator } from './mongo.health.js';

@Module({
  imports: [TerminusModule, DatabaseModule, RedisModule, MongooseModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, MongoHealthIndicator],
})
export class HealthModule {}
