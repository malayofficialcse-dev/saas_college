// ==============================================================================
// CollegeQuery SaaS — Standardized Response Transform Interceptor
// ==============================================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta: {
    timestamp: string;
  };
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>> {
    const httpCtx = context.switchToHttp();
    const res = httpCtx.getResponse();
    const statusCode = res.statusCode || 200;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        data,
        meta: {
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
