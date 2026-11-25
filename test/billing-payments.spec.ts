import 'reflect-metadata';
import { createHmac } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BillingCycle,
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service.js';
import { BillingService } from '../src/modules/billing/billing.service.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';

describe('SaaS Subscription, Billing & Payment System', () => {
  let subscriptionsService: SubscriptionsService;
  let billingService: BillingService;
  let paymentsService: PaymentsService;
  let mockPrisma: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockPrisma = {
      plan: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      subscription: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      tenant: {
        update: vi.fn(),
      },
      invoice: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      paymentWebhookEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      student: { count: vi.fn() },
      faculty: { count: vi.fn() },
      employee: { count: vi.fn() },
      query: { count: vi.fn() },
      attachment: { aggregate: vi.fn() },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    mockEmailService = {
      sendInvoiceEmail: vi.fn().mockResolvedValue(undefined),
    };

    subscriptionsService = new SubscriptionsService(mockPrisma);
    billingService = new BillingService(mockPrisma, mockEmailService);
    paymentsService = new PaymentsService(mockPrisma, subscriptionsService);
  });

  // ---------------------------------------------------------------------------
  // 1. Plan Changes, Feature Access & Quotas
  // ---------------------------------------------------------------------------
  it('should create an OPEN invoice on paid upgrade without activating paid plan immediately', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-free',
      billingCycle: BillingCycle.MONTHLY,
      plan: { tier: 'FREE', priceMonthly: 0 },
    });
    mockPrisma.plan.findUnique.mockResolvedValue({
      id: 'plan-pro',
      name: 'Professional',
      tier: 'PROFESSIONAL',
      priceMonthly: 4999,
      priceYearly: 49990,
      isActive: true,
    });
    mockPrisma.subscription.update.mockResolvedValue({
      id: 'sub-1',
      planId: 'plan-free',
      pendingPlanId: 'plan-pro',
    });
    mockPrisma.invoice.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'inv-1', ...data }),
    );

    const res = await subscriptionsService.requestPlanChange(
      'tenant-1',
      { planId: 'plan-pro', billingCycle: BillingCycle.MONTHLY },
      'admin-1',
    );

    expect(res.requiresPayment).toBe(true);
    expect(res.subscription.planId).toBe('plan-free'); // Paid plan NOT activated yet!
    expect(res.invoice?.status).toBe(InvoiceStatus.OPEN);
    expect(res.invoice?.targetPlanId).toBe('plan-pro');
  });

  it('should enforce feature access during active/grace period and block when suspended', async () => {
    // Active with feature enabled
    mockPrisma.subscription.findFirst.mockResolvedValueOnce({
      status: SubscriptionStatus.ACTIVE,
      plan: { featuresJson: { analyticsExport: true } },
    });
    expect(await subscriptionsService.checkFeatureAccess('tenant-1', 'analyticsExport')).toBe(true);

    // Suspended blocks access even if plan has the feature
    mockPrisma.subscription.findFirst.mockResolvedValueOnce({
      status: SubscriptionStatus.SUSPENDED,
      plan: { featuresJson: { analyticsExport: true } },
    });
    expect(await subscriptionsService.checkFeatureAccess('tenant-1', 'analyticsExport')).toBe(false);

    // Quota check blocks exceeding student limit
    mockPrisma.subscription.findFirst.mockResolvedValueOnce({
      status: SubscriptionStatus.ACTIVE,
      plan: { studentLimit: 100 },
    });
    mockPrisma.student.count.mockResolvedValueOnce(100);
    await expect(subscriptionsService.assertQuota('tenant-1', 'students')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Successful Payment with Backend Signature Verification
  // ---------------------------------------------------------------------------
  it('should reject invalid signature and activate subscription only on valid backend signature', async () => {
    const paymentRecord = {
      id: 'pay-1',
      tenantId: 'tenant-1',
      invoiceId: 'inv-1',
      paymentGateway: 'SANDBOX',
      gatewayTxId: 'sbx_order_1',
      status: PaymentStatus.PENDING,
      amount: 4999,
      invoice: {
        id: 'inv-1',
        subscriptionId: 'sub-1',
        targetPlanId: 'plan-pro',
        billingCycle: BillingCycle.MONTHLY,
      },
    };

    mockPrisma.payment.findFirst.mockResolvedValue(paymentRecord);

    // Tampered signature must fail
    await expect(
      paymentsService.verifyPayment('tenant-1', 'admin-1', {
        paymentId: 'pay-1',
        gatewayOrderId: 'sbx_order_1',
        gatewayPaymentId: 'sbx_pay_999',
        signature: 'deadbeef'.repeat(8),
      }),
    ).rejects.toThrow(UnauthorizedException);

    // Valid HMAC-SHA256 signature
    const secret = process.env.SANDBOX_PAYMENT_SECRET || 'sandbox_webhook_secret_key';
    const validSig = createHmac('sha256', secret)
      .update('sbx_order_1|sbx_pay_999')
      .digest('hex');

    mockPrisma.payment.update.mockResolvedValue({
      ...paymentRecord,
      status: PaymentStatus.SUCCESSFUL,
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      planId: 'plan-free',
    });
    mockPrisma.subscription.update.mockResolvedValue({
      id: 'sub-1',
      planId: 'plan-pro',
      status: SubscriptionStatus.ACTIVE,
    });

    const verified = await paymentsService.verifyPayment('tenant-1', 'admin-1', {
      paymentId: 'pay-1',
      gatewayOrderId: 'sbx_order_1',
      gatewayPaymentId: 'sbx_pay_999',
      signature: validSig,
    });

    expect(verified.verified).toBe(true);
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ status: InvoiceStatus.PAID }),
      }),
    );
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({
          planId: 'plan-pro',
          status: SubscriptionStatus.ACTIVE,
        }),
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // 3. Failed Payment & Grace Period
  // ---------------------------------------------------------------------------
  it('should mark payment FAILED and move subscription to PAST_DUE grace period on failed webhook', async () => {
    const payload = {
      eventId: 'evt_fail_001',
      eventType: 'payment.failed',
      txId: 'sbx_order_fail',
      invoiceId: 'inv-fail',
      amount: 1999,
      failureReason: 'Insufficient funds',
    };
    const secret = process.env.SANDBOX_PAYMENT_SECRET || 'sandbox_webhook_secret_key';
    const sig = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    mockPrisma.payment.findFirst.mockResolvedValue({
      id: 'pay-fail',
      tenantId: 'tenant-1',
      invoiceId: 'inv-fail',
      amount: 1999,
      invoice: {
        id: 'inv-fail',
        tenantId: 'tenant-1',
        subscriptionId: 'sub-1',
      },
    });
    mockPrisma.payment.update.mockResolvedValue({
      id: 'pay-fail',
      status: PaymentStatus.FAILED,
      failureReason: 'Insufficient funds',
    });

    const result = await paymentsService.handleWebhook(
      'SANDBOX',
      { 'x-sandbox-signature': sig },
      payload,
    );

    expect(result).toEqual(expect.objectContaining({ processed: true, status: 'FAILED' }));
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'PAST_DUE' }),
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // 4. Duplicate Webhook Prevention (Idempotency)
  // ---------------------------------------------------------------------------
  it('should ignore duplicate webhook events with same providerEventId', async () => {
    const payload = {
      eventId: 'evt_dup_001',
      eventType: 'payment.succeeded',
      txId: 'sbx_order_1',
      invoiceId: 'inv-1',
      amount: 4999,
    };
    const secret = process.env.SANDBOX_PAYMENT_SECRET || 'sandbox_webhook_secret_key';
    const sig = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      id: 'wh-1',
      providerEventId: 'evt_dup_001',
    });

    const res = await paymentsService.handleWebhook(
      'SANDBOX',
      { 'x-sandbox-signature': sig },
      payload,
    );

    expect(res).toEqual({
      duplicate: true,
      ignored: true,
      providerEventId: 'evt_dup_001',
    });
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 5. Refund Processing
  // ---------------------------------------------------------------------------
  it('should process full refund, void invoice, and record audit log', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      tenantId: 'tenant-1',
      invoiceId: 'inv-1',
      paymentGateway: 'SANDBOX',
      gatewayTxId: 'sbx_order_1',
      amount: 4999,
      refundedAmount: 0,
      status: PaymentStatus.SUCCESSFUL,
      metadata: {},
    });
    mockPrisma.payment.update.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.REFUNDED,
      refundedAmount: 4999,
    });

    const refunded = await paymentsService.refundPayment('tenant-1', 'admin-1', 'pay-1', {
      reason: 'College requested cancellation',
    });

    expect(refunded.status).toBe(PaymentStatus.REFUNDED);
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: InvoiceStatus.VOID },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PAYMENT_REFUNDED' }),
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // 6. Subscription Renewal & Billing Usage / Email
  // ---------------------------------------------------------------------------
  it('should generate renewal invoice for paid subscription and send billing email', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-starter',
      billingCycle: BillingCycle.ANNUAL,
      cancelAtPeriodEnd: false,
      plan: { name: 'Starter', priceMonthly: 1999, priceYearly: 19990, gracePeriodDays: 7 },
    });
    mockPrisma.invoice.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'inv-renew-1', ...data }),
    );

    const renewal: any = await subscriptionsService.renewSubscription(
      'tenant-1',
      'sub-1',
      'admin-1',
    );
    expect(renewal.invoice.amount).toBe(19990);
    expect(renewal.invoice.status).toBe(InvoiceStatus.OPEN);

    // Billing email dispatch
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-renew-1',
      invoiceNumber: renewal.invoice.invoiceNumber,
      amount: 19990,
      dueDate: new Date('2026-12-01'),
    });
    const mailRes = await billingService.notifyInvoiceIssued(
      'tenant-1',
      'inv-renew-1',
      'admin@college.edu',
      'College Admin',
    );
    expect(mailRes.queued).toBe(true);
    expect(mockEmailService.sendInvoiceEmail).toHaveBeenCalled();
  });

  it('should reject initiating payment on non-OPEN invoice and honor idempotency key replay', async () => {
    mockPrisma.payment.findUnique.mockResolvedValueOnce({
      id: 'pay-existing',
      tenantId: 'tenant-1',
      status: PaymentStatus.PENDING,
      metadata: { checkoutUrl: 'https://sandbox/1' },
    });

    const replay = await paymentsService.initiatePayment('tenant-1', 'admin-1', {
      invoiceId: 'inv-1',
      gateway: 'SANDBOX',
      idempotencyKey: 'idem-key-1',
    });
    expect(replay.idempotentReplay).toBe(true);

    mockPrisma.payment.findUnique.mockResolvedValueOnce(null);
    mockPrisma.invoice.findFirst.mockResolvedValueOnce({
      id: 'inv-paid',
      status: InvoiceStatus.PAID,
    });

    await expect(
      paymentsService.initiatePayment('tenant-1', 'admin-1', {
        invoiceId: 'inv-paid',
        gateway: 'SANDBOX',
        idempotencyKey: 'idem-key-2',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
