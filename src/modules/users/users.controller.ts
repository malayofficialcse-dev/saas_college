import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('student:manage')
  @ApiOperation({ summary: 'Create user within current tenant' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, dto, actorId);
  }

  @Get()
  @RequirePermissions('student:view')
  @ApiOperation({ summary: 'List users with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.usersService.findAll(tenantId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get(':id')
  @RequirePermissions('student:view')
  @ApiOperation({ summary: 'Get user details by ID' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('student:manage')
  @ApiOperation({ summary: 'Update user profile' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, id, dto, actorId);
  }

  @Patch(':id/activate')
  @RequirePermissions('student:manage')
  @ApiOperation({ summary: 'Activate user account' })
  async activate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.activate(tenantId, id, actorId);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('student:manage')
  @ApiOperation({ summary: 'Deactivate user account and terminate sessions' })
  async deactivate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.deactivate(tenantId, id, actorId);
  }

  @Post(':id/roles')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Assign a role to a user (prevents privilege escalation)' })
  async assignRole(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser() actor: any,
    @Param('id') userId: string,
    @Body('roleId') roleId: string,
  ) {
    return this.usersService.assignRole(tenantId, userId, roleId, actor);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Remove a role from a user' })
  async removeRole(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.usersService.removeRole(tenantId, userId, roleId, actorId);
  }

  @Delete(':id/sessions')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Terminate all active sessions for a user' })
  async terminateSessions(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') userId: string,
  ) {
    return this.usersService.terminateSessions(tenantId, userId, actorId);
  }
}
