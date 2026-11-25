// ==============================================================================
// CollegeQuery SaaS — FAQs Service
// Tenant-specific FAQs, category mapping, publishing/archiving workflow,
// visibility control, search, and relevance-scored suggestions.
// ==============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FaqStatus, FaqVisibility } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto.js';

@Injectable()
export class FaqsService {
  constructor(private readonly prisma: PrismaService) {}

  private getAllowedVisibilities(userType?: string): FaqVisibility[] {
    if (!userType) {
      return [FaqVisibility.PUBLIC];
    }
    if (userType === 'STUDENT') {
      return [FaqVisibility.PUBLIC, FaqVisibility.STUDENTS_ONLY];
    }
    return [FaqVisibility.PUBLIC, FaqVisibility.STUDENTS_ONLY, FaqVisibility.STAFF_ONLY];
  }

  async create(tenantId: string, actorUserId: string, dto: CreateFaqDto) {
    if (dto.categoryId) {
      const category = await this.prisma.queryCategory.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new NotFoundException(`Query category '${dto.categoryId}' not found.`);
      }
    }

    const status = dto.status ?? FaqStatus.DRAFT;

    return this.prisma.$transaction(async (tx) => {
      const faq = await tx.faq.create({
        data: {
          tenantId,
          categoryId: dto.categoryId ?? null,
          question: dto.question,
          answer: dto.answer,
          tags: dto.tags ?? [],
          visibility: dto.visibility ?? FaqVisibility.PUBLIC,
          status,
          sortOrder: dto.sortOrder ?? 0,
          createdByUserId: actorUserId,
          publishedAt: status === FaqStatus.PUBLISHED ? new Date() : null,
        },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'FAQ_CREATED',
          entityName: 'Faq',
          entityId: faq.id,
          newValues: { question: faq.question, status: faq.status, visibility: faq.visibility },
        },
      });

      return faq;
    });
  }

  async findAll(
    tenantId: string,
    userType: string,
    options: {
      categoryId?: string;
      status?: FaqStatus;
      visibility?: FaqVisibility;
      search?: string;
      tag?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { categoryId, status, visibility, search, tag, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const isStudent = userType === 'STUDENT';
    const allowedVisibilities = this.getAllowedVisibilities(userType);

    const where: any = {
      tenantId,
      visibility: visibility && allowedVisibilities.includes(visibility)
        ? visibility
        : { in: allowedVisibilities },
    };

    // Students can only view PUBLISHED FAQs
    if (isStudent) {
      where.status = FaqStatus.PUBLISHED;
    } else if (status) {
      where.status = status;
    }

    if (categoryId) where.categoryId = categoryId;
    if (tag) where.tags = { has: tag };

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.faq.count({ where }),
      this.prisma.faq.findMany({
        where,
        skip,
        take: limit,
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: [{ sortOrder: 'asc' }, { helpfulCount: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string, userType: string) {
    const faq = await this.prisma.faq.findFirst({
      where: { id, tenantId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        knowledgeArticles: {
          where: { status: 'PUBLISHED' },
          select: { id: true, slug: true, title: true, summary: true },
        },
      },
    });

    if (!faq) {
      throw new NotFoundException(`FAQ '${id}' not found.`);
    }

    const allowedVisibilities = this.getAllowedVisibilities(userType);
    if (!allowedVisibilities.includes(faq.visibility)) {
      throw new ForbiddenException('You do not have permission to view this FAQ.');
    }

    if (userType === 'STUDENT' && faq.status !== FaqStatus.PUBLISHED) {
      throw new NotFoundException(`FAQ '${id}' not found.`);
    }

    if (faq.status === FaqStatus.PUBLISHED) {
      await this.prisma.faq.update({
        where: { id: faq.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return faq;
  }

  async update(tenantId: string, id: string, dto: UpdateFaqDto, actorUserId: string) {
    const existing = await this.prisma.faq.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException(`FAQ '${id}' not found.`);
    }

    if (dto.categoryId) {
      const category = await this.prisma.queryCategory.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new NotFoundException(`Query category '${dto.categoryId}' not found.`);
      }
    }

    return this.prisma.faq.update({
      where: { id },
      data: {
        ...dto,
        publishedAt:
          dto.status === FaqStatus.PUBLISHED && !existing.publishedAt
            ? new Date()
            : existing.publishedAt,
        archivedAt:
          dto.status === FaqStatus.ARCHIVED
            ? new Date()
            : dto.status === FaqStatus.PUBLISHED
              ? null
              : existing.archivedAt,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async publish(tenantId: string, id: string, actorUserId: string) {
    const existing = await this.prisma.faq.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException(`FAQ '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.faq.update({
        where: { id },
        data: {
          status: FaqStatus.PUBLISHED,
          publishedAt: new Date(),
          archivedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'FAQ_PUBLISHED',
          entityName: 'Faq',
          entityId: id,
          oldValues: { status: existing.status },
          newValues: { status: FaqStatus.PUBLISHED },
        },
      });

      return updated;
    });
  }

  async archive(tenantId: string, id: string, actorUserId: string) {
    const existing = await this.prisma.faq.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException(`FAQ '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.faq.update({
        where: { id },
        data: {
          status: FaqStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'FAQ_ARCHIVED',
          entityName: 'Faq',
          entityId: id,
          oldValues: { status: existing.status },
          newValues: { status: FaqStatus.ARCHIVED },
        },
      });

      return updated;
    });
  }

  async markHelpful(tenantId: string, id: string) {
    const existing = await this.prisma.faq.findFirst({
      where: { id, tenantId, status: FaqStatus.PUBLISHED },
    });
    if (!existing) {
      throw new NotFoundException(`Published FAQ '${id}' not found.`);
    }

    return this.prisma.faq.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    });
  }

  /**
   * Relevant FAQ suggestions ranked by category match and search keyword relevance.
   */
  async suggest(
    tenantId: string,
    userType: string,
    options: { categoryId?: string; query?: string; limit?: number } = {},
  ) {
    const { categoryId, query = '', limit = 5 } = options;
    const allowedVisibilities = this.getAllowedVisibilities(userType);

    const candidates = await this.prisma.faq.findMany({
      where: {
        tenantId,
        status: FaqStatus.PUBLISHED,
        visibility: { in: allowedVisibilities },
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2);

    const scored = candidates.map((faq) => {
      let matchScore = 0;
      if (categoryId && faq.categoryId === categoryId) {
        matchScore += 10;
      }

      const qLower = faq.question.toLowerCase();
      const aLower = faq.answer.toLowerCase();
      const tagsLower = (faq.tags || []).map((t) => t.toLowerCase());

      for (const token of tokens) {
        if (qLower.includes(token)) matchScore += 5;
        if (tagsLower.some((t) => t.includes(token))) matchScore += 4;
        if (aLower.includes(token)) matchScore += 2;
      }

      const hasFilter = tokens.length > 0 || Boolean(categoryId);
      const score =
        hasFilter && matchScore === 0
          ? 0
          : matchScore + Math.min(faq.helpfulCount, 10) * 0.1;

      return { faq, score };
    });

    return scored
      .filter((item) => (tokens.length > 0 || categoryId ? item.score > 0 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.faq,
        relevanceScore: Number(item.score.toFixed(2)),
      }));
  }
}
