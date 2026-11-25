import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';

@ApiTags('Tenants')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, DynamicPermissionGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Provision new tenant college (Super Admin only)' })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'List all registered tenants' })
  async findAll(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.tenantsService.findAll(parseInt(page, 10), parseInt(limit, 10));
  }

  @Get(':id')
  @RequirePermissions('tenant:settings:view')
  @ApiOperation({ summary: 'Get tenant details by ID' })
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }
}
