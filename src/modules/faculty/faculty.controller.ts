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
import { FacultyService } from './faculty.service.js';
import { CreateFacultyDto, UpdateFacultyDto } from './dto/create-faculty.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Faculty')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('faculty')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Post()
  @RequirePermissions('faculty:manage')
  @ApiOperation({ summary: 'Create faculty member and user profile' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateFacultyDto,
  ) {
    return this.facultyService.create(tenantId, dto, actorId);
  }

  @Get()
  @RequirePermissions('faculty:view')
  @ApiOperation({ summary: 'List all faculty members with department filter' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.facultyService.findAll(tenantId, {
      departmentId,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(':id')
  @RequirePermissions('faculty:view')
  @ApiOperation({ summary: 'Get faculty member details and workload' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.facultyService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('faculty:manage')
  @ApiOperation({ summary: 'Update faculty details and maximum query quota' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFacultyDto,
  ) {
    return this.facultyService.update(tenantId, id, dto, actorId);
  }
}
