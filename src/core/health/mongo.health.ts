// ==============================================================================
// CollegeQuery SaaS — MongoDB Health Indicator
// ==============================================================================

import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Injectable()
export class MongoHealthIndicator extends HealthIndicator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // readyState: 1 = connected
      if (this.connection.readyState === 1) {
        return this.getStatus(key, true);
      }
      throw new Error(
        `MongoDB connection state: ${this.connection.readyState}`,
      );
    } catch (error) {
      throw new HealthCheckError(
        'MongoDB health check failed',
        this.getStatus(key, false, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
