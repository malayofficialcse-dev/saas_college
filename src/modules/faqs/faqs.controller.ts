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
import { FaqStatus, FaqVisibility } from '@prisma/client';
import { FaqsService } from './faqs.service.js';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('FAQs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Post()
  @RequirePermissions('faq:manage')
  @ApiOperation({ summary: 'Create a tenant-specific FAQ' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: CreateFaqDto,
  ) {
    return this.faqsService.create(tenantId, actorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and search tenant FAQs with visibility filtering' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', enum: FaqStatus, required: false })
  @ApiQuery({ name: 'visibility', enum: FaqVisibility, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userType') userType: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: FaqStatus,
    @Query('visibility') visibility?: FaqVisibility,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.faqsService.findAll(tenantId, userType, {
      categoryId,
      status,
      visibility,
      search,
      tag,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Get relevant FAQ suggestions based on category and query text' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  async suggest(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userType') userType: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') query = '',
    @Query('limit') limit = '5',
  ) {
    return this.faqsService.suggest(tenantId, userType, {
      categoryId,
      query,
      limit: parseInt(limit, 10),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get FAQ detail by ID' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userType') userType: string,
    @Param('id') id: string,
  ) {
    return this.faqsService.findOne(tenantId, id, userType);
  }

  @Patch(':id')
  @RequirePermissions('faq:manage')
  @ApiOperation({ summary: 'Update FAQ question, answer, category, or visibility' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.faqsService.update(tenantId, id, dto, actorId);
  }

  @Patch(':id/publish')
  @RequirePermissions('faq:manage')
  @ApiOperation({ summary: 'Publish a draft or archived FAQ' })
  async publish(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.faqsService.publish(tenantId, id, actorId);
  }

  @Patch(':id/archive')
  @RequirePermissions('faq:manage')
  @ApiOperation({ summary: 'Archive an FAQ' })
  async archive(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.faqsService.archive(tenantId, id, actorId);
  }

  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark an FAQ as helpful' })
  async markHelpful(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.faqsService.markHelpful(tenantId, id);
  }
}
