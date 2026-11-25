// ==============================================================================
// CollegeQuery SaaS — Current User & Current Tenant Decorators
// ==============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  return data ? user?.[data] : user;
});

export const CurrentTenant = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const tenant = {
    id: request.user?.tenantId || request.resolvedTenantId,
    slug: request.resolvedTenantSlug,
  };
  return data ? tenant?.[data as keyof typeof tenant] : tenant;
});
