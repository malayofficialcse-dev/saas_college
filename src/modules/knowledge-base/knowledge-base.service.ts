// ==============================================================================
// CollegeQuery SaaS — Knowledge Base Service
// Articles, categories, draft/publish/archive workflow, version history,
// tags, search, query deflection, and helpful/not-helpful feedback.
// ==============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ArticleStatus, FaqStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  CreateArticleDto,
  UpdateArticleDto,
  ArticleFeedbackDto,
} from './dto/knowledge-article.dto.js';

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, authorUserId: string, dto: CreateArticleDto) {
    const existingSlug = await this.prisma.knowledgeArticle.findFirst({
      where: { tenantId, slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Article slug '${dto.slug}' already exists in this college.`);
    }

    if (dto.categoryId) {
      const category = await this.prisma.queryCategory.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new NotFoundException(`Query category '${dto.categoryId}' not found.`);
      }
    }

    if (dto.relatedFaqId) {
      const faq = await this.prisma.faq.findFirst({
        where: { id: dto.relatedFaqId, tenantId },
      });
      if (!faq) {
        throw new NotFoundException(`FAQ '${dto.relatedFaqId}' not found.`);
      }
    }

    const status = dto.status ?? ArticleStatus.DRAFT;

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.knowledgeArticle.create({
        data: {
          tenantId,
          categoryId: dto.categoryId ?? null,
          relatedFaqId: dto.relatedFaqId ?? null,
          slug: dto.slug,
          title: dto.title,
          summary: dto.summary ?? null,
          content: dto.content,
          tags: dto.tags ?? [],
          status,
          version: 1,
          authorUserId,
          publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          relatedFaq: { select: { id: true, question: true } },
        },
      });

      await tx.knowledgeArticleVersion.create({
        data: {
          tenantId,
          articleId: article.id,
          version: 1,
          title: article.title,
          summary: article.summary,
          content: article.content,
          tags: article.tags,
          changeNote: 'Initial version',
          editedByUserId: authorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: authorUserId,
          action: 'KB_ARTICLE_CREATED',
          entityName: 'KnowledgeArticle',
          entityId: article.id,
          newValues: { slug: article.slug, title: article.title, status: article.status },
        },
      });

      return article;
    });
  }

  async findAll(
    tenantId: string,
    userType: string,
    options: {
      categoryId?: string;
      status?: ArticleStatus;
      tag?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { categoryId, status, tag, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const isStudent = userType === 'STUDENT';

    const where: any = { tenantId };
    if (isStudent) {
      where.status = ArticleStatus.PUBLISHED;
    } else if (status) {
      where.status = status;
    }

    if (categoryId) where.categoryId = categoryId;
    if (tag) where.tags = { has: tag };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.knowledgeArticle.count({ where }),
      this.prisma.knowledgeArticle.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          relatedFaq: { select: { id: true, question: true } },
        },
        orderBy: [{ helpfulCount: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, idOrSlug: string, userType: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: isUuid ? { id: idOrSlug, tenantId } : { slug: idOrSlug, tenantId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        relatedFaq: { select: { id: true, question: true, answer: true } },
        versions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });

    if (!article) {
      throw new NotFoundException(`Knowledge article '${idOrSlug}' not found.`);
    }

    if (userType === 'STUDENT' && article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException(`Knowledge article '${idOrSlug}' not found.`);
    }

    if (article.status === ArticleStatus.PUBLISHED) {
      await this.prisma.knowledgeArticle.update({
        where: { id: article.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return article;
  }

  async update(
    tenantId: string,
    id: string,
    actorUserId: string,
    dto: UpdateArticleDto,
  ) {
    const existing = await this.prisma.knowledgeArticle.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Knowledge article '${id}' not found.`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.prisma.knowledgeArticle.findFirst({
        where: { tenantId, slug: dto.slug, id: { not: id } },
      });
      if (slugConflict) {
        throw new ConflictException(`Article slug '${dto.slug}' already exists.`);
      }
    }

    const { changeNote, ...updateFields } = dto;
    const nextVersion = existing.version + 1;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.knowledgeArticle.update({
        where: { id },
        data: {
          ...updateFields,
          version: nextVersion,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          relatedFaq: { select: { id: true, question: true } },
        },
      });

      await tx.knowledgeArticleVersion.create({
        data: {
          tenantId,
          articleId: id,
          version: nextVersion,
          title: updated.title,
          summary: updated.summary,
          content: updated.content,
          tags: updated.tags,
          changeNote: changeNote ?? `Updated to version ${nextVersion}`,
          editedByUserId: actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'KB_ARTICLE_UPDATED',
          entityName: 'KnowledgeArticle',
          entityId: id,
          newValues: { version: nextVersion, changeNote },
        },
      });

      return updated;
    });
  }

  async publish(tenantId: string, id: string, actorUserId: string) {
    const existing = await this.prisma.knowledgeArticle.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Knowledge article '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.knowledgeArticle.update({
        where: { id },
        data: {
          status: ArticleStatus.PUBLISHED,
          publishedAt: new Date(),
          archivedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'KB_ARTICLE_PUBLISHED',
          entityName: 'KnowledgeArticle',
          entityId: id,
          oldValues: { status: existing.status },
          newValues: { status: ArticleStatus.PUBLISHED },
        },
      });

      return updated;
    });
  }

  async archive(tenantId: string, id: string, actorUserId: string) {
    const existing = await this.prisma.knowledgeArticle.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Knowledge article '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.knowledgeArticle.update({
        where: { id },
        data: {
          status: ArticleStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'KB_ARTICLE_ARCHIVED',
          entityName: 'KnowledgeArticle',
          entityId: id,
          oldValues: { status: existing.status },
          newValues: { status: ArticleStatus.ARCHIVED },
        },
      });

      return updated;
    });
  }

  async getVersionHistory(tenantId: string, articleId: string) {
    const existing = await this.prisma.knowledgeArticle.findFirst({
      where: { id: articleId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Knowledge article '${articleId}' not found.`);
    }

    return this.prisma.knowledgeArticleVersion.findMany({
      where: { tenantId, articleId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Helpful / Not-Helpful feedback per user (idempotent upsert + counter sync).
   */
  async submitFeedback(
    tenantId: string,
    articleId: string,
    userId: string,
    dto: ArticleFeedbackDto,
  ) {
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: { id: articleId, tenantId, status: ArticleStatus.PUBLISHED },
    });
    if (!article) {
      throw new NotFoundException(`Published knowledge article '${articleId}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const feedback = await tx.knowledgeArticleFeedback.upsert({
        where: { articleId_userId: { articleId, userId } },
        create: {
          tenantId,
          articleId,
          userId,
          isHelpful: dto.isHelpful,
          comment: dto.comment ?? null,
        },
        update: {
          isHelpful: dto.isHelpful,
          comment: dto.comment ?? null,
        },
      });

      const [helpfulCount, notHelpfulCount] = await Promise.all([
        tx.knowledgeArticleFeedback.count({ where: { articleId, isHelpful: true } }),
        tx.knowledgeArticleFeedback.count({ where: { articleId, isHelpful: false } }),
      ]);

      await tx.knowledgeArticle.update({
        where: { id: articleId },
        data: { helpfulCount, notHelpfulCount },
      });

      return { feedback, helpfulCount, notHelpfulCount };
    });
  }

  /**
   * Pre-query deflection search: searches published Knowledge Articles,
   * published FAQs, and active Query Categories.
   */
  async search(tenantId: string, query: string, categoryId?: string) {
    const trimmed = query.trim();

    const articleWhere: any = {
      tenantId,
      status: ArticleStatus.PUBLISHED,
    };
    if (categoryId) articleWhere.categoryId = categoryId;
    if (trimmed) {
      articleWhere.OR = [
        { title: { contains: trimmed, mode: 'insensitive' } },
        { summary: { contains: trimmed, mode: 'insensitive' } },
        { content: { contains: trimmed, mode: 'insensitive' } },
        { tags: { has: trimmed.toLowerCase() } },
      ];
    }

    const faqWhere: any = {
      tenantId,
      status: FaqStatus.PUBLISHED,
    };
    if (categoryId) faqWhere.categoryId = categoryId;
    if (trimmed) {
      faqWhere.OR = [
        { question: { contains: trimmed, mode: 'insensitive' } },
        { answer: { contains: trimmed, mode: 'insensitive' } },
        { tags: { has: trimmed.toLowerCase() } },
      ];
    }

    const [articles, faqs, categories] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({
        where: articleWhere,
        take: 10,
        orderBy: [{ helpfulCount: 'desc' }, { viewCount: 'desc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          tags: true,
          helpfulCount: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.faq.findMany({
        where: faqWhere,
        take: 5,
        orderBy: [{ helpfulCount: 'desc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          question: true,
          answer: true,
          categoryId: true,
          helpfulCount: true,
        },
      }),
      this.prisma.queryCategory.findMany({
        where: {
          tenantId,
          isActive: true,
          ...(trimmed
            ? {
                OR: [
                  { name: { contains: trimmed, mode: 'insensitive' } },
                  { description: { contains: trimmed, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        take: 5,
      }),
    ]);

    return {
      articles,
      suggestedFaqs: faqs,
      deflectionArticles: categories.map((c) => ({
        id: c.id,
        title: c.name,
        summary: c.description || `Frequently asked procedures for ${c.name}`,
        categorySlug: c.slug,
      })),
    };
  }
}
