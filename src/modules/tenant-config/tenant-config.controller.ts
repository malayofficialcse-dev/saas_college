import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantConfigService } from './tenant-config.service.js';
import { UpdateTenantConfigDto } from './dto/update-tenant-config.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Tenant Configuration')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('tenant-config')
export class TenantConfigController {
  constructor(private readonly configService: TenantConfigService) {}

  @Get()
  @RequirePermissions('tenant:settings:view')
  @ApiOperation({ summary: 'Get current college theme, branding, and SLA settings' })
  async getConfig(@CurrentUser('tenantId') tenantId: string) {
    return this.configService.findByTenant(tenantId);
  }

  @Patch()
  @RequirePermissions('tenant:settings:edit')
  @ApiOperation({ summary: 'Update college theme, branding, and working hours' })
  async updateConfig(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateTenantConfigDto,
  ) {
    return this.configService.update(tenantId, dto);
  }
}
