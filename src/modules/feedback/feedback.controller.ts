import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Feedback')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('queries/:queryId/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Submit student CSAT feedback and close query ticket' })
  async submit(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('queryId') queryId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.submit(tenantId, userId, queryId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get feedback submitted for a query' })
  async getForQuery(
    @CurrentUser('tenantId') tenantId: string,
    @Param('queryId') queryId: string,
  ) {
    return this.feedbackService.getForQuery(tenantId, queryId);
  }
}

@ApiTags('Feedback')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('feedback')
export class FeedbackSummaryController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get('my-history')
  @ApiOperation({ summary: 'Get authenticated student feedback history' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getMyHistory(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.feedbackService.getStudentHistory(
      tenantId,
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('analytics')
  @RequirePermissions('analytics:view')
  @ApiOperation({ summary: 'Get CSAT, resolution, and response quality feedback analytics' })
  @ApiQuery({ name: 'departmentId', required: false })
  async getAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.feedbackService.getAnalytics(tenantId, departmentId);
  }
}
