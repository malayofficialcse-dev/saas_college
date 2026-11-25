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
import { StudentsService } from './students.service.js';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Students')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post('admit')
  @RequirePermissions('student:manage')
  @ApiOperation({ summary: 'Admit student and create user profile' })
  async admit(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateStudentDto,
  ) {
    return this.studentsService.admit(tenantId, dto, actorId);
  }

  @Get()
  @RequirePermissions('student:view')
  @ApiOperation({ summary: 'List and search students with filters' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'academicSessionId', required: false })
  @ApiQuery({ name: 'currentSemester', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('departmentId') departmentId?: string,
    @Query('courseId') courseId?: string,
    @Query('academicSessionId') academicSessionId?: string,
    @Query('currentSemester') currentSemester?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.studentsService.findAll(tenantId, {
      departmentId,
      courseId,
      academicSessionId,
      currentSemester: currentSemester ? parseInt(currentSemester, 10) : undefined,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(':id')
  @RequirePermissions('student:view')
  @ApiOperation({ summary: 'Get student academic profile and recent tickets' })
  async findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.studentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('student:manage')
  @ApiOperation({ summary: 'Update student academic details and profile' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(tenantId, id, dto, actorId);
  }
}
