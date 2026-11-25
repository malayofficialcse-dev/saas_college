// ==============================================================================
// CollegeQuery SaaS – System Admin Service
// Multi-tenant platform administration: global metrics, tenant management,
// subscription overview, cross-tenant audit logging, and impersonation.
// ==============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service.js';
import { TenantStatus, SubscriptionStatus } from '@prisma/client';

export interface TenantListOptions {
  search?: string;
  status?: TenantStatus;
  page?: number;
  limit?: number;
}

export interface PlatformAuditLogOptions {
  tenantId?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SystemAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 1. Global Platform Metrics
   */
  async getPlatformMetrics() {
    const [totalTenants, activeTenants, totalUsers, totalQueries, totalStudents, totalFaculty] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
        this.prisma.user.count(),
        this.prisma.query.count(),
        this.prisma.student.count(),
        this.prisma.faculty.count(),
      ]);

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalQueries,
      totalStudents,
      totalFaculty,
    };
  }

  /**
   * 2. Paginated & Filterable Tenant Directory
   */
  async getTenants(options: TenantListOptions = {}) {
    const { search, status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        include: {
          subscriptions: {
            where: {
              status: {
                in: [
                  SubscriptionStatus.ACTIVE,
                  SubscriptionStatus.TRIALING,
                  SubscriptionStatus.PAST_DUE,
                ],
              },
            },
            include: { plan: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              students: true,
              faculty: true,
              employees: true,
              queries: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        createdAt: t.createdAt,
        activePlan: t.subscriptions[0]?.plan.name || 'None',
        subscriptionStatus: t.subscriptions[0]?.status || 'NONE',
        studentsCount: t._count.students,
        facultyCount: t._count.faculty,
        staffCount: t._count.employees,
        queriesCount: t._count.queries,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 3. Tenant Deep-Dive Detail
   */
  async getTenantDetail(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            students: true,
            faculty: true,
            employees: true,
            departments: true,
            courses: true,
            queries: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant '${id}' not found.`);
    }

    return tenant;
  }

  /**
   * 4. Platform Subscription & Revenue Overview
   */
  async getSubscriptionOverview() {
    const [subscriptions, plans] = await Promise.all([
      this.prisma.subscription.findMany({
        include: { plan: true },
      }),
      this.prisma.plan.findMany(),
    ]);

    const activeSubs = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE,
    );
    const trialingSubs = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.TRIALING,
    );
    const pastDueSubs = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.PAST_DUE,
    );
    const suspendedSubs = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.SUSPENDED,
    );

    // Calculate approximate MRR
    let mrr = 0;
    for (const sub of activeSubs) {
      if (sub.billingCycle === 'ANNUAL') {
        mrr += Number(sub.plan.priceYearly) / 12;
      } else {
        mrr += Number(sub.plan.priceMonthly);
      }
    }

    // Breakdown by plan tier
    const tierBreakdown: Record<string, number> = {};
    for (const p of plans) {
      tierBreakdown[p.name] = subscriptions.filter(
        (s) => s.planId === p.id && s.status === SubscriptionStatus.ACTIVE,
      ).length;
    }

    const estimatedMrr = Math.round(mrr);
    const estimatedArr = estimatedMrr * 12;

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubs.length,
      trialingSubscriptions: trialingSubs.length,
      pastDueSubscriptions: pastDueSubs.length,
      suspendedSubscriptions: suspendedSubs.length,
      estimatedMrr,
      estimatedArr,
      tierBreakdown,
    };
  }

  /**
   * 5. Platform-Wide Cross-Tenant Audit Logs
   */
  async getPlatformAuditLogs(options: PlatformAuditLogOptions = {}) {
    const { tenantId, action, userId, startDate, endDate, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 6. Update Tenant Status (ACTIVE, SUSPENDED, DEACTIVATED)
   */
  async updateTenantStatus(
    id: string,
    status: TenantStatus,
    actorId?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant '${id}' not found.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id },
        data: { status },
      });

      if (status === TenantStatus.SUSPENDED || status === TenantStatus.DEACTIVATED) {
        // Invalidate active sessions
        const users = await tx.user.findMany({
          where: { tenantId: id },
          select: { id: true },
        });
        const userIds = users.map((u) => u.id);
        if (userIds.length > 0) {
          await tx.refreshToken.updateMany({
            where: { userId: { in: userIds } },
            data: { isRevoked: true },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId: id,
          userId: actorId || null,
          action: 'TENANT_STATUS_CHANGED',
          entityName: 'Tenant',
          entityId: id,
          oldValues: { status: tenant.status },
          newValues: { status },
        },
      });

      return t;
    });

    return updated;
  }

  /**
   * 7. Create Time-Limited, Reason-Based Impersonation Token
   */
  async createImpersonationToken(
    superAdmin: any,
    targetTenantId: string,
    reason: string,
    durationMinutes = 30,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!superAdmin.isSuperAdmin) {
      throw new ForbiddenException('Only SaaS Super Admins can generate impersonation tokens.');
    }

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException(
        'A valid reason (minimum 5 characters) is required for tenant impersonation.',
      );
    }

    const effectiveMinutes = Math.min(Math.max(durationMinutes, 5), 60);

    const targetTenant = await this.prisma.tenant.findUnique({
      where: { id: targetTenantId },
    });

    if (!targetTenant) {
      throw new NotFoundException(`Target tenant '${targetTenantId}' not found.`);
    }

    if (targetTenant.status === TenantStatus.DEACTIVATED) {
      throw new ForbiddenException('Cannot impersonate an archived/deactivated tenant.');
    }

    const accessSecret = this.configService.get<string>(
      'jwt.accessSecret',
      'dev_jwt_access_secret',
    );

    const impersonationToken = this.jwtService.sign(
      {
        sub: superAdmin.id,
        email: superAdmin.email,
        tenantId: targetTenantId,
        userType: 'SAAS_SUPER_ADMIN',
        isSuperAdmin: true,
        isImpersonating: true,
        originalSuperAdminId: superAdmin.id,
        impersonationReason: reason,
        permissions: superAdmin.permissions || ['*'],
      },
      {
        secret: accessSecret,
        expiresIn: `${effectiveMinutes}m` as any,
      },
    );

    await this.prisma.auditLog.create({
      data: {
        tenantId: targetTenantId,
        userId: superAdmin.id,
        action: 'SUPER_ADMIN_IMPERSONATION_TOKEN_ISSUED',
        entityName: 'Tenant',
        entityId: targetTenantId,
        newValues: {
          targetTenantId,
          targetSlug: targetTenant.slug,
          reason,
          durationMinutes: effectiveMinutes,
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      success: true,
      impersonationToken,
      targetTenant: {
        id: targetTenant.id,
        name: targetTenant.name,
        slug: targetTenant.slug,
      },
      expiresInMinutes: effectiveMinutes,
    };
  }

  /**
   * 8. Revoke Impersonation Session
   */
  async revokeImpersonation(
    superAdminId: string,
    targetTenantId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: targetTenantId,
        userId: superAdminId,
        action: 'SUPER_ADMIN_IMPERSONATION_REVOKED',
        entityName: 'Tenant',
        entityId: targetTenantId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      success: true,
      message: `Impersonation session for tenant '${targetTenantId}' revoked.`,
    };
  }
}
