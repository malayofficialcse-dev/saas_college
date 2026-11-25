// ==============================================================================
// CollegeQuery SaaS — Global Exception Filter
// ==============================================================================

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errorCode =
      typeof exceptionResponse === 'object' && exceptionResponse?.error
        ? exceptionResponse.error
        : 'INTERNAL_ERROR';

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse?.message
        ? exceptionResponse.message
        : exception instanceof Error
          ? exception.message
          : 'An unexpected server error occurred';

    this.logger.error(
      `[${request.method}] ${request.url} >> Status: ${status} | Error: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const correlationId =
      (request as any)?.correlationId ||
      (request.headers['x-correlation-id'] as string) ||
      undefined;

    response.status(status).json({
      success: false,
      statusCode: status,
      errorCode,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        correlationId,
      },
    });
  }
}
