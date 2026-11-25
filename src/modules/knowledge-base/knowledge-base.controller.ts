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
import { ArticleStatus } from '@prisma/client';
import { KnowledgeBaseService } from './knowledge-base.service.js';
import {
  CreateArticleDto,
  UpdateArticleDto,
  ArticleFeedbackDto,
} from './dto/knowledge-article.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Knowledge Base')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search knowledge base articles & FAQs before submitting a query' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  async search(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') query = '',
    @Query('categoryId') categoryId?: string,
  ) {
    return this.kbService.search(tenantId, query, categoryId);
  }

  @Post('articles')
  @RequirePermissions('kb:manage')
  @ApiOperation({ summary: 'Create a knowledge base article (draft or published)' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') authorId: string,
    @Body() dto: CreateArticleDto,
  ) {
    return this.kbService.create(tenantId, authorId, dto);
  }

  @Get('articles')
  @ApiOperation({ summary: 'List knowledge base articles with filtering and pagination' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', enum: ArticleStatus, required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userType') userType: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: ArticleStatus,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.kbService.findAll(tenantId, userType, {
      categoryId,
      status,
      tag,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('articles/:idOrSlug')
  @ApiOperation({ summary: 'Get knowledge article detail by UUID or slug' })
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userType') userType: string,
    @Param('idOrSlug') idOrSlug: string,
  ) {
    return this.kbService.findOne(tenantId, idOrSlug, userType);
  }

  @Patch('articles/:id')
  @RequirePermissions('kb:manage')
  @ApiOperation({ summary: 'Update knowledge article and create a new version snapshot' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.kbService.update(tenantId, id, actorId, dto);
  }

  @Patch('articles/:id/publish')
  @RequirePermissions('kb:manage')
  @ApiOperation({ summary: 'Publish a knowledge article' })
  async publish(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.kbService.publish(tenantId, id, actorId);
  }

  @Patch('articles/:id/archive')
  @RequirePermissions('kb:manage')
  @ApiOperation({ summary: 'Archive a knowledge article' })
  async archive(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.kbService.archive(tenantId, id, actorId);
  }

  @Get('articles/:id/versions')
  @ApiOperation({ summary: 'Get version history for a knowledge article' })
  async getVersions(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.kbService.getVersionHistory(tenantId, id);
  }

  @Post('articles/:id/feedback')
  @ApiOperation({ summary: 'Submit helpful or not-helpful feedback on an article' })
  async submitFeedback(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ArticleFeedbackDto,
  ) {
    return this.kbService.submitFeedback(tenantId, id, userId, dto);
  }
}
