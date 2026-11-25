import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SlaService } from './sla.service.js';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('SLA Management')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('sla')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Post('policies')
  @RequirePermissions('sla:policies:manage')
  @ApiOperation({ summary: 'Create SLA policy for a priority level' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateSlaPolicyDto,
  ) {
    return this.slaService.create(tenantId, dto, actorId);
  }

  @Post('policies/seed-defaults')
  @RequirePermissions('sla:policies:manage')
  @ApiOperation({ summary: 'Seed standard SLA policies (URGENT 8h, HIGH 24h, MEDIUM 48h, LOW 72h)' })
  async seedDefaults(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.slaService.seedDefaultPolicies(tenantId, actorId);
  }

  @Get('policies')
  @RequirePermissions('sla:policies:view')
  @ApiOperation({ summary: 'List all active SLA policies' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.slaService.findAll(tenantId);
  }

  @Get('policies/:id')
  @RequirePermissions('sla:policies:view')
  @ApiOperation({ summary: 'Get SLA policy details' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.slaService.findOne(tenantId, id);
  }

  @Get('metrics')
  @RequirePermissions('sla:policies:view')
  @ApiOperation({ summary: 'Get college-wide SLA compliance rates and average resolution times' })
  async getMetrics(@CurrentUser('tenantId') tenantId: string) {
    return this.slaService.getMetrics(tenantId);
  }
}
