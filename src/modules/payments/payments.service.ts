// ==============================================================================
// CollegeQuery SaaS — Payments Service
// Provider abstraction, initiation with idempotency keys, backend signature
// verification, webhook idempotency, reconciliation, refunds, and failure handling.
// ==============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import {
  PaymentProvider,
  SupportedGateway,
  SandboxPaymentProvider,
  RazorpayPaymentProvider,
  StripePaymentProvider,
} from './providers/payment-provider.interface.js';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
  RefundPaymentDto,
} from './dto/payment.dto.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Record<SupportedGateway, PaymentProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {
    this.providers = {
      SANDBOX: new SandboxPaymentProvider(),
      RAZORPAY: new RazorpayPaymentProvider(),
      STRIPE: new StripePaymentProvider(),
    };
  }

  getProvider(gateway: SupportedGateway): PaymentProvider {
    const provider = this.providers[gateway];
    if (!provider) {
      throw new BadRequestException(`Unsupported payment gateway: ${gateway}`);
    }
    return provider;
  }

  // ---------------------------------------------------------------------------
  // 1. Initiate Payment (Idempotent)
  // ---------------------------------------------------------------------------

  async initiatePayment(tenantId: string, actorUserId: string, dto: InitiatePaymentDto) {
    // Idempotency check
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (existing.tenantId !== tenantId) {
        throw new BadRequestException('Idempotency key belongs to another tenant.');
      }
      return {
        payment: existing,
        idempotentReplay: true,
        checkoutUrl: (existing.metadata as any)?.checkoutUrl ?? null,
      };
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice '${dto.invoiceId}' not found.`);
    }
    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new BadRequestException(`Invoice is '${invoice.status}' and cannot be paid.`);
    }

    const provider = this.getProvider(dto.gateway);
    const initiated = await provider.initiatePayment({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      tenantId,
      idempotencyKey: dto.idempotencyKey,
    });

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          paymentGateway: dto.gateway,
          gatewayTxId: initiated.gatewayOrderId,
          idempotencyKey: dto.idempotencyKey,
          amount: invoice.amount,
          status: PaymentStatus.PENDING,
          metadata: {
            checkoutUrl: initiated.checkoutUrl,
            gatewayPayload: initiated.gatewayPayload,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'PAYMENT_INITIATED',
          entityName: 'Payment',
          entityId: payment.id,
          newValues: {
            invoiceId: invoice.id,
            gateway: dto.gateway,
            amount: Number(invoice.amount),
          },
        },
      });

      return {
        payment,
        idempotentReplay: false,
        checkoutUrl: initiated.checkoutUrl,
        gatewayPayload: initiated.gatewayPayload,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Backend Signature Verification (Never trust frontend confirmation alone)
  // ---------------------------------------------------------------------------

  async verifyPayment(tenantId: string, actorUserId: string, dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, tenantId },
      include: { invoice: true },
    });
    if (!payment) {
      throw new NotFoundException(`Payment '${dto.paymentId}' not found.`);
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      return { verified: true, payment, idempotentReplay: true };
    }

    const provider = this.getProvider(payment.paymentGateway as SupportedGateway);
    const isValid = provider.verifySignature({
      gatewayOrderId: dto.gatewayOrderId,
      gatewayPaymentId: dto.gatewayPaymentId,
      signature: dto.signature,
    });

    if (!isValid) {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'PAYMENT_SIGNATURE_FAILED',
          entityName: 'Payment',
          entityId: payment.id,
          newValues: { gatewayOrderId: dto.gatewayOrderId },
        },
      });
      throw new UnauthorizedException('Invalid payment signature. Subscription will not be activated.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESSFUL,
          paidAt: new Date(),
          metadata: {
            ...((payment.metadata as Record<string, any>) || {}),
            gatewayPaymentId: dto.gatewayPaymentId,
            verifiedVia: 'SIGNATURE',
          },
        },
      });

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: InvoiceStatus.PAID, paidAt: new Date() },
      });

      const subscription = await this.subscriptionsService.activateSubscriptionFromPayment(
        tx,
        payment.invoice.subscriptionId,
        payment.invoice.targetPlanId,
        payment.invoice.billingCycle,
      );

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'PAYMENT_VERIFIED_AND_CAPTURED',
          entityName: 'Payment',
          entityId: payment.id,
          newValues: {
            invoiceId: payment.invoiceId,
            subscriptionId: payment.invoice.subscriptionId,
            gatewayPaymentId: dto.gatewayPaymentId,
          },
        },
      });

      return { verified: true, payment: updatedPayment, subscription };
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Webhook Processing (Signature Verified + Unique Event Idempotency)
  // ---------------------------------------------------------------------------

  async handleWebhook(
    gateway: SupportedGateway,
    headers: Record<string, string | string[] | undefined>,
    payload: any,
  ) {
    const provider = this.getProvider(gateway);

    let parsed;
    try {
      parsed = provider.verifyAndParseWebhook(headers, payload);
    } catch (err: any) {
      this.logger.warn(`Webhook signature verification failed for ${gateway}: ${err.message}`);
      throw new UnauthorizedException(err.message);
    }

    // Strict webhook idempotency using unique providerEventId
    const existingEvent = await this.prisma.paymentWebhookEvent.findUnique({
      where: { providerEventId: parsed.providerEventId },
    });
    if (existingEvent) {
      return { duplicate: true, ignored: true, providerEventId: parsed.providerEventId };
    }

    // Find payment by gatewayTxId or invoiceId
    const payment = await this.prisma.payment.findFirst({
      where: parsed.gatewayTxId
        ? { gatewayTxId: parsed.gatewayTxId }
        : { invoiceId: parsed.invoiceId },
      include: { invoice: true },
    });

    const invoice = payment?.invoice
      ?? (parsed.invoiceId
        ? await this.prisma.invoice.findUnique({ where: { id: parsed.invoiceId } })
        : null);

    if (!invoice) {
      // Record event to avoid replay even if unknown invoice
      await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: gateway,
          providerEventId: parsed.providerEventId,
          eventType: parsed.eventType,
          payload: parsed.raw,
        },
      });
      return { ignored: true, reason: 'Invoice not found' };
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.create({
        data: {
          provider: gateway,
          providerEventId: parsed.providerEventId,
          eventType: parsed.eventType,
          payload: parsed.raw,
        },
      });

      if (parsed.eventType === 'PAYMENT_SUCCEEDED') {
        const savedPayment = payment
          ? await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.SUCCESSFUL,
                providerEventId: parsed.providerEventId,
                paidAt: new Date(),
              },
            })
          : await tx.payment.create({
              data: {
                tenantId: invoice.tenantId,
                invoiceId: invoice.id,
                paymentGateway: gateway,
                gatewayTxId: parsed.gatewayTxId,
                providerEventId: parsed.providerEventId,
                amount: parsed.amount || invoice.amount,
                status: PaymentStatus.SUCCESSFUL,
                paidAt: new Date(),
              },
            });

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.PAID, paidAt: new Date() },
        });

        await this.subscriptionsService.activateSubscriptionFromPayment(
          tx,
          invoice.subscriptionId,
          invoice.targetPlanId,
          invoice.billingCycle,
        );

        await tx.auditLog.create({
          data: {
            tenantId: invoice.tenantId,
            action: 'WEBHOOK_PAYMENT_SUCCEEDED',
            entityName: 'Payment',
            entityId: savedPayment.id,
            newValues: { providerEventId: parsed.providerEventId, amount: Number(savedPayment.amount) },
          },
        });

        return { processed: true, status: 'SUCCESSFUL', payment: savedPayment };
      }

      if (parsed.eventType === 'PAYMENT_FAILED') {
        const savedPayment = payment
          ? await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.FAILED,
                providerEventId: parsed.providerEventId,
                failureReason: parsed.failureReason || 'Payment declined by gateway',
              },
            })
          : await tx.payment.create({
              data: {
                tenantId: invoice.tenantId,
                invoiceId: invoice.id,
                paymentGateway: gateway,
                gatewayTxId: parsed.gatewayTxId,
                providerEventId: parsed.providerEventId,
                amount: parsed.amount || invoice.amount,
                status: PaymentStatus.FAILED,
                failureReason: parsed.failureReason || 'Payment declined by gateway',
              },
            });

        // Move subscription into PAST_DUE grace period instead of immediate suspension
        await tx.subscription.update({
          where: { id: invoice.subscriptionId },
          data: {
            status: 'PAST_DUE',
            gracePeriodEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: invoice.tenantId,
            action: 'WEBHOOK_PAYMENT_FAILED',
            entityName: 'Payment',
            entityId: savedPayment.id,
            newValues: {
              providerEventId: parsed.providerEventId,
              failureReason: savedPayment.failureReason,
            },
          },
        });

        return { processed: true, status: 'FAILED', payment: savedPayment };
      }

      if (parsed.eventType === 'REFUND_PROCESSED' && payment) {
        const refundedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAmount: parsed.amount || payment.amount,
            refundedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: invoice.tenantId,
            action: 'WEBHOOK_PAYMENT_REFUNDED',
            entityName: 'Payment',
            entityId: refundedPayment.id,
            newValues: { providerEventId: parsed.providerEventId, refundedAmount: Number(refundedPayment.refundedAmount) },
          },
        });

        return { processed: true, status: 'REFUNDED', payment: refundedPayment };
      }

      return { processed: false, eventType: parsed.eventType };
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Refunds
  // ---------------------------------------------------------------------------

  async refundPayment(
    tenantId: string,
    actorUserId: string,
    paymentId: string,
    dto: RefundPaymentDto,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException(`Payment '${paymentId}' not found.`);
    }
    if (payment.status !== PaymentStatus.SUCCESSFUL) {
      throw new BadRequestException(`Only SUCCESSFUL payments can be refunded (current: ${payment.status}).`);
    }

    const refundable = Number(payment.amount) - Number(payment.refundedAmount || 0);
    const refundAmount = dto.amount ?? refundable;

    if (refundAmount <= 0 || refundAmount > refundable) {
      throw new BadRequestException(`Invalid refund amount (${refundAmount}). Maximum refundable: ${refundable}.`);
    }

    const provider = this.getProvider(payment.paymentGateway as SupportedGateway);
    const providerRefund = await provider.refundPayment({
      gatewayTxId: payment.gatewayTxId,
      amount: refundAmount,
      reason: dto.reason,
    });

    const newRefundedTotal = Number(payment.refundedAmount || 0) + refundAmount;
    const fullyRefunded = newRefundedTotal >= Number(payment.amount);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: newRefundedTotal,
          refundedAt: new Date(),
          status: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.SUCCESSFUL,
          metadata: {
            ...((payment.metadata as Record<string, any>) || {}),
            lastRefundId: providerRefund.refundId,
            refundReason: dto.reason,
          },
        },
      });

      if (fullyRefunded) {
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: InvoiceStatus.VOID },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'PAYMENT_REFUNDED',
          entityName: 'Payment',
          entityId: payment.id,
          newValues: {
            refundAmount,
            refundId: providerRefund.refundId,
            reason: dto.reason,
          },
        },
      });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Reconciliation & Transaction History
  // ---------------------------------------------------------------------------

  async reconcilePayment(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { invoice: true },
    });
    if (!payment) {
      throw new NotFoundException(`Payment '${paymentId}' not found.`);
    }

    if (
      payment.status === PaymentStatus.SUCCESSFUL &&
      payment.invoice.status !== InvoiceStatus.PAID
    ) {
      return this.prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: InvoiceStatus.PAID, paidAt: payment.paidAt ?? new Date() },
        });
        await this.subscriptionsService.activateSubscriptionFromPayment(
          tx,
          payment.invoice.subscriptionId,
          payment.invoice.targetPlanId,
          payment.invoice.billingCycle,
        );
        return { reconciled: true, paymentId: payment.id, invoiceStatus: 'PAID' };
      });
    }

    return { reconciled: false, paymentId: payment.id, status: payment.status };
  }

  async getTransactionHistory(
    tenantId: string,
    options: { status?: PaymentStatus; page?: number; limit?: number } = {},
  ) {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: { invoice: { select: { invoiceNumber: true, description: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
