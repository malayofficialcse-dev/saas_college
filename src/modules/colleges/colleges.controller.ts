import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CollegesService } from './colleges.service.js';
import { CreateCollegeDto } from './dto/create-college.dto.js';
import { OnboardCollegeDto } from './dto/onboard-college.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Colleges')
@Controller('colleges')
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  @Post('onboard')
  @ApiOperation({ summary: 'Onboard and register new college (Public onboarding endpoint)' })
  async onboard(@Body() dto: OnboardCollegeDto) {
    return this.collegesService.onboard(dto);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('tenant:settings:edit')
  @ApiOperation({ summary: 'Register a college or campus within the tenant' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateCollegeDto,
  ) {
    return this.collegesService.create(tenantId, dto, actorId);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'List all college campuses' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.collegesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Get college details by ID' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.collegesService.findOne(tenantId, id);
  }

  @Patch(':id/approve')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, DynamicPermissionGuard)
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Approve provisioned college tenant (Super Admin only)' })
  async approve(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.collegesService.approve(id, actorId);
  }

  @Patch(':id/suspend')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, DynamicPermissionGuard)
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Suspend college tenant (Super Admin only)' })
  async suspend(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.collegesService.suspend(id, reason || 'Administrative suspension', actorId);
  }

  @Patch(':id/activate')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, DynamicPermissionGuard)
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Activate or reactivate college tenant (Super Admin only)' })
  async activate(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.collegesService.activate(id, actorId);
  }

  @Patch(':id/archive')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, DynamicPermissionGuard)
  @RequirePermissions('platform:tenants:manage')
  @ApiOperation({ summary: 'Archive college tenant (Super Admin only)' })
  async archive(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.collegesService.archive(id, actorId);
  }
}
