import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { BillingService } from './billing.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @ApiOperation({ summary: 'List tenant invoices and payment history' })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getInvoices(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: InvoiceStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.billingService.getInvoices(tenantId, {
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get single invoice detail with payments' })
  async getInvoice(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.billingService.getInvoiceById(tenantId, id);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get current subscription usage, quotas, and renewal dates' })
  async getUsage(@CurrentUser('tenantId') tenantId: string) {
    return this.billingService.getUsageSummary(tenantId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get complete billing history (subscription, invoices, payments)' })
  async getHistory(@CurrentUser('tenantId') tenantId: string) {
    return this.billingService.getBillingHistory(tenantId);
  }
}
