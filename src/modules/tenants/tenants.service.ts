import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Tenant slug '${dto.slug}' is already taken.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          customDomain: dto.customDomain,
        },
      });

      // Automatically initialize default tenant config
      await tx.tenantConfig.create({
        data: {
          tenantId: tenant.id,
        },
      });

      return tenant;
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        include: { config: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { config: true, colleges: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant '${id}' not found.`);
    }
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: { config: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant slug '${slug}' not found.`);
    }
    return tenant;
  }
}
