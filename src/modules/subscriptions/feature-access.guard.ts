import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from './subscriptions.service.js';

export const PLAN_FEATURE_KEY = 'required_plan_feature';
export const RequirePlanFeature = (feature: string) => SetMetadata(PLAN_FEATURE_KEY, feature);

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(PLAN_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredFeature) return true;

    const req = context.switchToHttp().getRequest();
    const tenantId = req.user?.tenantId || req.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for feature access check.');
    }

    const allowed = await this.subscriptionsService.checkFeatureAccess(tenantId, requiredFeature);
    if (!allowed) {
      throw new ForbiddenException(
        `Your current subscription plan does not include '${requiredFeature}' or the subscription is suspended.`,
      );
    }

    return true;
  }
}
