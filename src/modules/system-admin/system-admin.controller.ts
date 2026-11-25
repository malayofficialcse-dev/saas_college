import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SystemAdminService } from './system-admin.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { TenantStatus } from '@prisma/client';

@ApiTags('System Administration')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, DynamicPermissionGuard)
@Controller('system-admin')
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  @Get('metrics')
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Get global platform metrics across all colleges (Super Admin only)' })
  async getMetrics() {
    return this.systemAdminService.getPlatformMetrics();
  }

  @Get('tenants')
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Get paginated directory of all colleges on the platform' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TenantStatus })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getTenants(
    @Query('search') search?: string,
    @Query('status') status?: TenantStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.systemAdminService.getTenants({
      search,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('tenants/:id')
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Get detailed information, subscriptions, and metrics for a specific college' })
  async getTenantDetail(@Param('id') id: string) {
    return this.systemAdminService.getTenantDetail(id);
  }

  @Get('subscriptions/overview')
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Get platform subscription MRR/ARR and tier breakdown' })
  async getSubscriptionOverview() {
    return this.systemAdminService.getSubscriptionOverview();
  }

  @Get('audit-logs')
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Global cross-tenant audit log stream for compliance' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async getPlatformAuditLogs(
    @Query('tenantId') tenantId?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.systemAdminService.getPlatformAuditLogs({
      tenantId,
      action,
      userId,
      startDate,
      endDate,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Patch('tenants/:id/status')
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Activate, suspend, or deactivate a college tenant' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: TenantStatus,
    @CurrentUser('id') actorId: string,
  ) {
    return this.systemAdminService.updateTenantStatus(id, status, actorId);
  }

  @Post('impersonate')
  @RequirePermissions('platform:tenant:impersonate')
  @ApiOperation({ summary: 'Generate secure, time-limited impersonation token for a college tenant' })
  async impersonate(
    @CurrentUser() superAdmin: any,
    @Body('targetTenantId') targetTenantId: string,
    @Body('reason') reason: string,
    @Body('durationMinutes') durationMinutes?: number,
    @Req() req?: Request,
  ) {
    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    const userAgent = req?.headers['user-agent'];
    return this.systemAdminService.createImpersonationToken(
      superAdmin,
      targetTenantId,
      reason,
      durationMinutes,
      ipAddress,
      userAgent,
    );
  }

  @Post('impersonate/revoke')
  @RequirePermissions('platform:tenant:impersonate')
  @ApiOperation({ summary: 'Revoke active tenant impersonation session' })
  async revokeImpersonation(
    @CurrentUser('id') superAdminId: string,
    @Body('targetTenantId') targetTenantId: string,
    @Req() req?: Request,
  ) {
    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    const userAgent = req?.headers['user-agent'];
    return this.systemAdminService.revokeImpersonation(
      superAdminId,
      targetTenantId,
      ipAddress,
      userAgent,
    );
  }
}
