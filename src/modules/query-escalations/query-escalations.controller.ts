import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QueryEscalationsService } from './query-escalations.service.js';
import { EscalateQueryDto } from './dto/escalate-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Query Escalations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('queries/:queryId/escalations')
export class QueryEscalationsController {
  constructor(private readonly escalationsService: QueryEscalationsService) {}

  @Post()
  @RequirePermissions('query:escalate')
  @ApiOperation({ summary: 'Escalate ticket to higher tier (HOD/Principal)' })
  async escalate(
    @CurrentUser('tenantId') tenantId: string,
    @Param('queryId') queryId: string,
    @Body() dto: EscalateQueryDto,
  ) {
    return this.escalationsService.escalate(tenantId, queryId, dto);
  }
}
