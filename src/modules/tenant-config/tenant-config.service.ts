import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { UpdateTenantConfigDto } from './dto/update-tenant-config.dto.js';

@Injectable()
export class TenantConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string) {
    const config = await this.prisma.tenantConfig.findUnique({
      where: { tenantId },
    });
    if (!config) {
      throw new NotFoundException(`Config for tenant '${tenantId}' not found.`);
    }
    return config;
  }

  async update(tenantId: string, dto: UpdateTenantConfigDto) {
    return this.prisma.tenantConfig.upsert({
      where: { tenantId },
      update: dto,
      create: {
        tenantId,
        ...dto,
      },
    });
  }
}
