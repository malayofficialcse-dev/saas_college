import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RequirePermissions('analytics:view')
  @ApiOperation({ summary: 'Overall dashboard KPIs: volumes, resolution rate, CSAT, headcount' })
  async getOverview(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getOverview(tenantId);
  }

  @Get('query-volume')
  @RequirePermissions('analytics:view')
  @ApiOperation({ summary: 'Query volume time-series bucketed by day / week / month' })
  @ApiQuery({ name: 'startDate', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2025-01-31' })
  @ApiQuery({ name: 'bucket', required: false, enum: ['day', 'week', 'month'] })
  async getQueryVolume(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('bucket') bucket?: 'day' | 'week' | 'month',
  ) {
    return this.analyticsService.getQueryVolume(tenantId, {
      startDate,
      endDate,
      bucket,
    });
  }

  @Get('categories')
  @RequirePermissions('analytics:view')
  @ApiOperation({ summary: 'Query breakdown and resolution rates per category' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getCategoryBreakdown(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCategoryBreakdown(tenantId, { startDate, endDate });
  }

  @Get('sla-compliance')
  @RequirePermissions('analytics:view')
  @ApiOperation({ summary: 'SLA compliance rate, breach counts and average response/resolution times' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSlaCompliance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getSlaCompliance(tenantId, { startDate, endDate });
  }

  @Get('faculty-workload')
  @RequirePermissions('department:manage')
  @ApiOperation({ summary: 'Active query load per faculty member with department info' })
  async getFacultyWorkload(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getFacultyWorkload(tenantId);
  }

  @Get('student-engagement')
  @RequirePermissions('analytics:view')
  @ApiOperation({ summary: 'Student query submission rates and repeat submitter patterns' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getStudentEngagement(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getStudentEngagement(tenantId, { startDate, endDate });
  }

  @Get('priority-distribution')
  @RequirePermissions('analytics:view')
  @ApiOperation({ summary: 'Query count and percentage breakdown by priority level' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getPriorityDistribution(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getPriorityDistribution(tenantId, { startDate, endDate });
  }

  @Get('departments')
  @RequirePermissions('analytics:view')
  @ApiOperation({ summary: 'Per-department resolution rates, breach counts and avg resolution time' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getDepartmentPerformance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDepartmentPerformance(tenantId, { startDate, endDate });
  }
}
