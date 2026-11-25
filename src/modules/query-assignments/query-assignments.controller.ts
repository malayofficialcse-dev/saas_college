import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QueryAssignmentsService } from './query-assignments.service.js';
import { AssignQueryDto } from './dto/assign-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Query Assignments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('queries/:queryId/assignments')
export class QueryAssignmentsController {
  constructor(private readonly queryAssignmentsService: QueryAssignmentsService) {}

  @Post()
  @RequirePermissions('query:assign')
  @ApiOperation({ summary: 'Assign or reassign query ticket to staff member' })
  async assign(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') assignedByUserId: string,
    @Param('queryId') queryId: string,
    @Body() dto: AssignQueryDto,
  ) {
    return this.queryAssignmentsService.assign(tenantId, assignedByUserId, queryId, dto);
  }

  @Post('auto')
  @RequirePermissions('query:assign')
  @ApiOperation({ summary: 'Auto-assign ticket to least loaded department staff member' })
  async autoAssign(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('queryId') queryId: string,
  ) {
    return this.queryAssignmentsService.autoAssign(tenantId, queryId, actorId);
  }

  @Post('escalate')
  @RequirePermissions('query:escalate')
  @ApiOperation({ summary: 'Manually escalate query ticket to HOD or Administrator' })
  async escalate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('queryId') queryId: string,
    @Body('reason') reason: string,
    @Body('targetUserId') targetUserId?: string,
  ) {
    return this.queryAssignmentsService.escalate(tenantId, userId, queryId, reason, targetUserId);
  }

  @Get()
  @RequirePermissions('query:view')
  @ApiOperation({ summary: 'Get full assignment history of a ticket' })
  async getHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Param('queryId') queryId: string,
  ) {
    return this.queryAssignmentsService.getHistory(tenantId, queryId);
  }
}
