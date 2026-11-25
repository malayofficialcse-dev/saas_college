import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { QueryStatus } from '@prisma/client';
import { QueriesService } from './queries.service.js';
import { CreateQueryDto } from './dto/create-query.dto.js';
import { UpdateQueryStatusDto } from './dto/update-query-status.dto.js';
import { ResolveQueryDto } from './dto/resolve-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Queries')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('queries')
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  @Post()
  @RequirePermissions('query:create')
  @ApiOperation({ summary: 'Create new query ticket (Student only)' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQueryDto,
  ) {
    return this.queriesService.create(tenantId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter queries with role-based scoping' })
  @ApiQuery({ name: 'status', enum: QueryStatus, required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('userType') userType: string,
    @Query('status') status?: QueryStatus,
    @Query('priority') priority?: string,
    @Query('departmentId') departmentId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.queriesService.findAll(tenantId, userId, userType, {
      status,
      priority,
      departmentId,
      categoryId,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get query details, status history, assignments, and escalations' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queriesService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @RequirePermissions('query:reply')
  @ApiOperation({ summary: 'Transition ticket status (enforces state machine)' })
  async updateStatus(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQueryStatusDto,
  ) {
    return this.queriesService.updateStatus(tenantId, userId, id, dto);
  }

  @Post(':id/resolve')
  @RequirePermissions('query:resolve')
  @ApiOperation({ summary: 'Resolve query ticket with resolution summary' })
  async resolve(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ResolveQueryDto,
  ) {
    return this.queriesService.resolve(tenantId, userId, id, dto);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Student submits feedback on resolved query (closes ticket)' })
  async submitFeedback(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('rating') rating: number,
    @Body('feedbackText') feedbackText?: string,
  ) {
    return this.queriesService.submitFeedback(tenantId, userId, id, rating, feedbackText);
  }
}
