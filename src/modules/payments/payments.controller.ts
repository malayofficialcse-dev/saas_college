import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service.js';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
  RefundPaymentDto,
} from './dto/payment.dto.js';
import { SupportedGateway } from './providers/payment-provider.interface.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Initiate an idempotent payment for an open invoice' })
  async initiate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(tenantId, actorId, dto);
  }

  @Post('verify')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Verify gateway payment signature on backend and activate subscription' })
  async verify(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(tenantId, actorId, dto);
  }

  @Post('webhook/:gateway')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signature-verified webhook endpoint for SANDBOX, RAZORPAY, or STRIPE' })
  async handleWebhook(
    @Param('gateway') gateway: SupportedGateway,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: any,
  ) {
    return this.paymentsService.handleWebhook(
      gateway.toUpperCase() as SupportedGateway,
      headers,
      payload,
    );
  }

  @Post(':id/refund')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Refund a successful payment (full or partial)' })
  async refund(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(tenantId, actorId, id, dto);
  }

  @Post(':id/reconcile')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Reconcile payment status with invoice & subscription state' })
  async reconcile(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.reconcilePayment(tenantId, id);
  }

  @Get('transactions')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Get paginated payment transaction history' })
  @ApiQuery({ name: 'status', enum: PaymentStatus, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getTransactions(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: PaymentStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.paymentsService.getTransactionHistory(tenantId, {
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }
}
