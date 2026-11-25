import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryPriority } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateQueryCategoryDto, UpdateQueryCategoryDto } from './dto/create-category.dto.js';

export const DEFAULT_QUERY_CATEGORIES = [
  { name: 'Fees & Accounts', slug: 'fees', priority: QueryPriority.HIGH, slaHours: 24, description: 'Tuition fees, receipts, payment installments, and scholarship disbursements' },
  { name: 'Examination & Results', slug: 'examination', priority: QueryPriority.HIGH, slaHours: 24, description: 'Hall tickets, grade card corrections, revaluation, and exam timetables' },
  { name: 'Attendance & Leave', slug: 'attendance', priority: QueryPriority.MEDIUM, slaHours: 48, description: 'Attendance shortage inquiries, medical leave submissions, and duty leaves' },
  { name: 'Admission & Enrollment', slug: 'admission', priority: QueryPriority.MEDIUM, slaHours: 48, description: 'Course enrollment, branch transfer, document verification, and ID cards' },
  { name: 'Technical Support', slug: 'technical-support', priority: QueryPriority.MEDIUM, slaHours: 24, description: 'Campus portal login issues, Wi-Fi access, LMS, and institutional email' },
  { name: 'Certificates & Transcripts', slug: 'certificates', priority: QueryPriority.LOW, slaHours: 72, description: 'Bonafide certificates, official transcripts, migration, and character certificates' },
  { name: 'Hostel & Accommodation', slug: 'hostel', priority: QueryPriority.MEDIUM, slaHours: 24, description: 'Room allocation, maintenance, mess food feedback, and curfew permissions' },
  { name: 'Library Services', slug: 'library', priority: QueryPriority.LOW, slaHours: 48, description: 'Book renewals, overdue fines, digital library access, and journal requests' },
  { name: 'General Queries', slug: 'general', priority: QueryPriority.LOW, slaHours: 48, description: 'Campus navigation, event permissions, sports facilities, and lost & found' },
];

@Injectable()
export class QueryCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateQueryCategoryDto, actorId?: string) {
    const existing = await this.prisma.queryCategory.findFirst({
      where: { tenantId, slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Category with slug '${dto.slug}' already exists.`);
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      });
      if (!dept) {
        throw new NotFoundException(`Department '${dto.departmentId}' not found.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.queryCategory.create({
        data: {
          tenantId,
          departmentId: dto.departmentId || null,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          defaultPriority: dto.defaultPriority ?? QueryPriority.MEDIUM,
          defaultSlaHours: dto.defaultSlaHours ?? 48,
          isActive: dto.isActive ?? true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'QUERY_CATEGORY_CREATED',
          entityName: 'QueryCategory',
          entityId: category.id,
          newValues: { name: category.name, slug: category.slug, defaultPriority: category.defaultPriority },
        },
      });

      return category;
    });
  }

  async findAll(
    tenantId: string,
    options: { departmentId?: string; search?: string; isActive?: boolean } = {},
  ) {
    const where: any = { tenantId };
    if (options.departmentId) where.departmentId = options.departmentId;
    if (typeof options.isActive === 'boolean') where.isActive = options.isActive;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { slug: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.queryCategory.findMany({
      where,
      include: {
        department: { select: { id: true, code: true, name: true } },
        _count: { select: { queries: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.queryCategory.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        _count: { select: { queries: true } },
      },
    });
    if (!category) {
      throw new NotFoundException(`Query category '${id}' not found.`);
    }
    return category;
  }

  async update(tenantId: string, id: string, dto: UpdateQueryCategoryDto, actorId?: string) {
    const category = await this.prisma.queryCategory.findFirst({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException(`Query category '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.queryCategory.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'QUERY_CATEGORY_UPDATED',
          entityName: 'QueryCategory',
          entityId: id,
          oldValues: { name: category.name, defaultPriority: category.defaultPriority, isActive: category.isActive },
          newValues: dto as any,
        },
      });

      return updated;
    });
  }

  /**
   * Seed standard college categories (Fees, Exam, Hostel, Admission, Attendance, etc.)
   */
  async seedDefaultCategories(tenantId: string, actorId?: string) {
    const created: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const cat of DEFAULT_QUERY_CATEGORIES) {
        const existing = await tx.queryCategory.findFirst({
          where: { tenantId, slug: cat.slug },
        });

        if (!existing) {
          const newCat = await tx.queryCategory.create({
            data: {
              tenantId,
              name: cat.name,
              slug: cat.slug,
              defaultPriority: cat.priority,
              defaultSlaHours: cat.slaHours,
              description: cat.description,
              isActive: true,
            },
          });
          created.push(newCat);
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'DEFAULT_QUERY_CATEGORIES_SEEDED',
          entityName: 'QueryCategory',
          entityId: tenantId,
          newValues: { categoriesCount: created.length },
        },
      });
    });

    return {
      success: true,
      message: `Seeded ${created.length} default categories.`,
      categories: created,
    };
  }
}
