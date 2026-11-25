import { Module, Global } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionSchedulerService } from './subscription-scheduler.service.js';
import { PlanFeatureGuard } from './feature-access.guard.js';

@Global()
@Module({
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionSchedulerService,
    PlanFeatureGuard,
  ],
  exports: [
    SubscriptionsService,
    SubscriptionSchedulerService,
    PlanFeatureGuard,
  ],
})
export class SubscriptionsModule {}
