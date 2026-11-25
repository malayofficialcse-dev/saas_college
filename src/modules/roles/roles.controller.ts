import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Create custom tenant role' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(tenantId, dto, actorId);
  }

  @Get()
  @ApiOperation({ summary: 'List system and tenant roles' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role details and assigned permissions' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') roleId: string,
  ) {
    return this.rolesService.findOne(tenantId, roleId);
  }

  @Post(':id/permissions')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Assign permissions to a role (prevents privilege escalation)' })
  async assignPermissions(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser() actor: any,
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(tenantId, roleId, dto, actor);
  }
}
