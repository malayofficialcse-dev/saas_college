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
import { AcademicSessionsService } from './academic-sessions.service.js';
import {
  CreateAcademicSessionDto,
  UpdateAcademicSessionDto,
} from './dto/create-academic-session.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Academic Sessions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('academic-sessions')
export class AcademicSessionsController {
  constructor(private readonly academicSessionsService: AcademicSessionsService) {}

  @Post()
  @RequirePermissions('academic:sessions:manage')
  @ApiOperation({ summary: 'Create academic session year' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateAcademicSessionDto,
  ) {
    return this.academicSessionsService.create(tenantId, dto, actorId);
  }

  @Get()
  @RequirePermissions('academic:sessions:view')
  @ApiOperation({ summary: 'List all academic sessions' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.academicSessionsService.findAll(tenantId);
  }

  @Get('active')
  @RequirePermissions('academic:sessions:view')
  @ApiOperation({ summary: 'Get current active academic session' })
  async findActiveSession(@CurrentUser('tenantId') tenantId: string) {
    return this.academicSessionsService.findActiveSession(tenantId);
  }

  @Get(':id')
  @RequirePermissions('academic:sessions:view')
  @ApiOperation({ summary: 'Get academic session details' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.academicSessionsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('academic:sessions:manage')
  @ApiOperation({ summary: 'Update academic session details' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAcademicSessionDto,
  ) {
    return this.academicSessionsService.update(tenantId, id, dto, actorId);
  }

  @Post(':id/transition')
  @RequirePermissions('academic:sessions:manage')
  @ApiOperation({ summary: 'Transition college to next academic session (promotes students)' })
  async transition(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') targetSessionId: string,
    @Body('promoteStudents') promoteStudents = true,
  ) {
    return this.academicSessionsService.transition(tenantId, targetSessionId, promoteStudents, actorId);
  }
}
