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
import { QueryCategoriesService } from './query-categories.service.js';
import { CreateQueryCategoryDto, UpdateQueryCategoryDto } from './dto/create-category.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Query Categories')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('query-categories')
export class QueryCategoriesController {
  constructor(private readonly queryCategoriesService: QueryCategoriesService) {}

  @Post()
  @RequirePermissions('category:manage')
  @ApiOperation({ summary: 'Create custom query category' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateQueryCategoryDto,
  ) {
    return this.queryCategoriesService.create(tenantId, dto, actorId);
  }

  @Post('seed-defaults')
  @RequirePermissions('category:manage')
  @ApiOperation({ summary: 'Seed standard categories (Fees, Exam, Hostel, Attendance, Library, etc.)' })
  async seedDefaults(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.queryCategoriesService.seedDefaultCategories(tenantId, actorId);
  }

  @Get()
  @ApiOperation({ summary: 'List active query categories' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.queryCategoriesService.findAll(tenantId, {
      departmentId,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category details' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queryCategoriesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('category:manage')
  @ApiOperation({ summary: 'Update query category priority and SLA' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQueryCategoryDto,
  ) {
    return this.queryCategoriesService.update(tenantId, id, dto, actorId);
  }
}
