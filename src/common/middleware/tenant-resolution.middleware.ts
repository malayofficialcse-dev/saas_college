import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../context/tenant.context.js';

declare global {
  namespace Express {
    interface Request {
      resolvedTenantId?: string;
      resolvedTenantSlug?: string;
    }
  }
}

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Check explicit impersonation header (for Super Admin)
    const impersonateTenantId = req.headers['x-act-as-tenant-id'] as string;

    // 2. Check x-tenant-id header
    const headerTenantId = req.headers['x-tenant-id'] as string;

    // 3. Check x-tenant-slug header
    const headerTenantSlug = req.headers['x-tenant-slug'] as string;

    // 4. Extract Subdomain from Host
    let subdomainSlug = '';
    const host = req.headers.host || '';
    const hostParts = host.split('.');
    if (hostParts.length >= 3 && !host.startsWith('localhost')) {
      subdomainSlug = hostParts[0].toLowerCase();
    }

    const tenantSlug = headerTenantSlug || subdomainSlug || 'default';
    const tenantId = impersonateTenantId || headerTenantId || '';

    req.resolvedTenantId = tenantId;
    req.resolvedTenantSlug = tenantSlug;

    // Run execution inside AsyncLocalStorage context
    TenantContext.run(
      {
        tenantId,
        tenantSlug,
      },
      () => next(),
    );
  }
}
