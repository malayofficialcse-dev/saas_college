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
import { CoursesService } from './courses.service.js';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Courses')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @RequirePermissions('department:manage')
  @ApiOperation({ summary: 'Create course program within a department' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coursesService.create(tenantId, dto, actorId);
  }

  @Get()
  @RequirePermissions('department:view')
  @ApiOperation({ summary: 'List all academic courses with filtering' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'degreeLevel', required: false, example: 'Undergraduate' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('departmentId') departmentId?: string,
    @Query('degreeLevel') degreeLevel?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.coursesService.findAll(tenantId, {
      departmentId,
      degreeLevel,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(':id')
  @RequirePermissions('department:view')
  @ApiOperation({ summary: 'Get course details and department mapping' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.coursesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('department:manage')
  @ApiOperation({ summary: 'Update course details and duration' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(tenantId, id, dto, actorId);
  }

  @Delete(':id')
  @RequirePermissions('department:manage')
  @ApiOperation({ summary: 'Delete course (if no students enrolled)' })
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.coursesService.delete(tenantId, id, actorId);
  }
}
