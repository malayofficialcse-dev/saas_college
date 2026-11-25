// ==============================================================================
// CollegeQuery SaaS — Structured Application Logger
// Wraps NestJS built-in Logger with correlation ID and tenant context
// ==============================================================================

import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { TenantContext } from '../context/tenant.context.js';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private formatMessage(
    level: LogLevel,
    message: unknown,
    context?: string,
    correlationId?: string,
  ): string {
    const tenantId = TenantContext.getTenantId();
    const parts: string[] = [
      new Date().toISOString(),
      `[${level.toUpperCase()}]`,
    ];
    if (context) parts.push(`[${context}]`);
    if (correlationId) parts.push(`[req:${correlationId}]`);
    if (tenantId) parts.push(`[tenant:${tenantId}]`);
    parts.push(typeof message === 'string' ? message : JSON.stringify(message));
    return parts.join(' ');
  }

  log(message: unknown, context?: string): void {
    console.log(this.formatMessage('log', message, context));
  }

  error(message: unknown, stack?: string, context?: string): void {
    console.error(this.formatMessage('error', message, context));
    if (stack) console.error(stack);
  }

  warn(message: unknown, context?: string): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: unknown, context?: string): void {
    if (process.env['NODE_ENV'] !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  verbose(message: unknown, context?: string): void {
    if (process.env['NODE_ENV'] === 'development') {
      console.log(this.formatMessage('verbose', message, context));
    }
  }
}
