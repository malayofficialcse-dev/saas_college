import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingCycle } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service.js';
import {
  UpsertPlanDto,
  ChangePlanDto,
  CancelSubscriptionDto,
} from './dto/subscription.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all available SaaS subscription plans' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('plans/seed-defaults')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, DynamicPermissionGuard)
  @RequirePermissions('platform:manage')
  @ApiOperation({ summary: 'Seed Free, Starter, Professional, and Enterprise plans' })
  async seedDefaults() {
    return this.subscriptionsService.seedDefaultPlans();
  }

  @Post('plans')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, DynamicPermissionGuard)
  @RequirePermissions('platform:manage')
  @ApiOperation({ summary: 'Create or update a subscription plan' })
  async upsertPlan(@Body() dto: UpsertPlanDto) {
    return this.subscriptionsService.upsertPlan(dto);
  }

  @Get('current')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Get active college subscription and quota limits' })
  async getCurrent(@CurrentUser('tenantId') tenantId: string) {
    return this.subscriptionsService.getCurrentSubscription(tenantId);
  }

  @Post('trial')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Start a trial subscription for a plan tier' })
  async startTrial(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: { planTier: string; billingCycle?: BillingCycle },
  ) {
    return this.subscriptionsService.startTrial(
      tenantId,
      body.planTier,
      body.billingCycle,
      actorId,
    );
  }

  @Post('change-plan')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Request plan upgrade/downgrade (paid upgrades require verified payment)' })
  async changePlan(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionsService.requestPlanChange(tenantId, dto, actorId);
  }

  @Post(':id/renew')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Renew subscription for the next billing period' })
  async renew(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.renewSubscription(tenantId, id, actorId);
  }

  @Patch('cancel')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Cancel current subscription (immediately or at period end)' })
  async cancel(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(tenantId, dto, actorId);
  }
}
