import { createHmac, timingSafeEqual } from 'node:crypto';

export type SupportedGateway = 'SANDBOX' | 'RAZORPAY' | 'STRIPE';

export interface InitiatePaymentInput {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  tenantId: string;
  idempotencyKey: string;
}

export interface InitiatePaymentResult {
  gatewayOrderId: string;
  checkoutUrl: string;
  gatewayPayload: Record<string, any>;
}

export interface VerifySignatureInput {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

export interface ParsedWebhookEvent {
  providerEventId: string;
  eventType: 'PAYMENT_SUCCEEDED' | 'PAYMENT_FAILED' | 'REFUND_PROCESSED' | 'UNKNOWN';
  gatewayTxId: string;
  invoiceId?: string;
  amount: number;
  failureReason?: string;
  raw: Record<string, any>;
}

export interface RefundPaymentInput {
  gatewayTxId: string;
  amount: number;
  reason?: string;
}

export interface RefundPaymentResult {
  refundId: string;
  status: 'REFUNDED';
}

export interface PaymentProvider {
  readonly name: SupportedGateway;
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verifySignature(input: VerifySignatureInput): boolean;
  verifyAndParseWebhook(
    headers: Record<string, string | string[] | undefined>,
    payload: any,
  ): ParsedWebhookEvent;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}

function safeCompareHex(expectedHex: string, actualHex: string): boolean {
  if (!expectedHex || !actualHex || expectedHex.length !== actualHex.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expectedHex, 'utf8'), Buffer.from(actualHex, 'utf8'));
}

// -----------------------------------------------------------------------------
// 1. Sandbox / Test Provider (HMAC-SHA256 verified)
// -----------------------------------------------------------------------------
export class SandboxPaymentProvider implements PaymentProvider {
  readonly name = 'SANDBOX' as const;
  private readonly secret: string;

  constructor(secret = process.env.SANDBOX_PAYMENT_SECRET || 'sandbox_webhook_secret_key') {
    this.secret = secret;
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const gatewayOrderId = `sbx_order_${input.invoiceNumber}_${Date.now()}`;
    return {
      gatewayOrderId,
      checkoutUrl: `https://sandbox.collegequery.local/checkout/${gatewayOrderId}`,
      gatewayPayload: {
        orderId: gatewayOrderId,
        amount: input.amount,
        currency: input.currency,
      },
    };
  }

  verifySignature(input: VerifySignatureInput): boolean {
    const expected = createHmac('sha256', this.secret)
      .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
      .digest('hex');
    return safeCompareHex(expected, input.signature);
  }

  verifyAndParseWebhook(
    headers: Record<string, string | string[] | undefined>,
    payload: any,
  ): ParsedWebhookEvent {
    const sig = String(headers['x-sandbox-signature'] || '');
    const expected = createHmac('sha256', this.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (!safeCompareHex(expected, sig)) {
      throw new Error('Invalid sandbox webhook signature.');
    }

    return {
      providerEventId: payload.eventId,
      eventType:
        payload.eventType === 'payment.succeeded'
          ? 'PAYMENT_SUCCEEDED'
          : payload.eventType === 'payment.failed'
            ? 'PAYMENT_FAILED'
            : payload.eventType === 'refund.processed'
              ? 'REFUND_PROCESSED'
              : 'UNKNOWN',
      gatewayTxId: payload.txId,
      invoiceId: payload.invoiceId,
      amount: Number(payload.amount || 0),
      failureReason: payload.failureReason,
      raw: payload,
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      refundId: `sbx_refund_${input.gatewayTxId}_${Date.now()}`,
      status: 'REFUNDED',
    };
  }
}

// -----------------------------------------------------------------------------
// 2. Razorpay Provider
// -----------------------------------------------------------------------------
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'RAZORPAY' as const;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    keySecret = process.env.RAZORPAY_KEY_SECRET || 'razorpay_test_secret',
    webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'razorpay_webhook_secret',
  ) {
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const gatewayOrderId = `order_rzp_${input.invoiceNumber}_${Date.now()}`;
    return {
      gatewayOrderId,
      checkoutUrl: `https://api.razorpay.com/v1/checkout/${gatewayOrderId}`,
      gatewayPayload: {
        orderId: gatewayOrderId,
        amountSubunits: Math.round(input.amount * 100),
        currency: input.currency,
      },
    };
  }

  verifySignature(input: VerifySignatureInput): boolean {
    const expected = createHmac('sha256', this.keySecret)
      .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
      .digest('hex');
    return safeCompareHex(expected, input.signature);
  }

  verifyAndParseWebhook(
    headers: Record<string, string | string[] | undefined>,
    payload: any,
  ): ParsedWebhookEvent {
    const sig = String(headers['x-razorpay-signature'] || '');
    const expected = createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (!safeCompareHex(expected, sig)) {
      throw new Error('Invalid Razorpay webhook signature.');
    }

    const paymentEntity = payload?.payload?.payment?.entity || {};
    const event = payload?.event;

    return {
      providerEventId: payload.event_id || `${event}_${paymentEntity.id}`,
      eventType:
        event === 'payment.captured'
          ? 'PAYMENT_SUCCEEDED'
          : event === 'payment.failed'
            ? 'PAYMENT_FAILED'
            : event === 'refund.processed'
              ? 'REFUND_PROCESSED'
              : 'UNKNOWN',
      gatewayTxId: paymentEntity.order_id || paymentEntity.id,
      invoiceId: paymentEntity.notes?.invoiceId,
      amount: Number(paymentEntity.amount || 0) / 100,
      failureReason: paymentEntity.error_description,
      raw: payload,
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      refundId: `rfnd_rzp_${input.gatewayTxId}_${Date.now()}`,
      status: 'REFUNDED',
    };
  }
}

// -----------------------------------------------------------------------------
// 3. Stripe Provider
// -----------------------------------------------------------------------------
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'STRIPE' as const;
  private readonly webhookSecret: string;

  constructor(webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret') {
    this.webhookSecret = webhookSecret;
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const gatewayOrderId = `pi_stripe_${input.invoiceNumber}_${Date.now()}`;
    return {
      gatewayOrderId,
      checkoutUrl: `https://checkout.stripe.com/pay/${gatewayOrderId}`,
      gatewayPayload: {
        paymentIntentId: gatewayOrderId,
        amountCents: Math.round(input.amount * 100),
        currency: input.currency.toLowerCase(),
      },
    };
  }

  verifySignature(input: VerifySignatureInput): boolean {
    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
      .digest('hex');
    return safeCompareHex(expected, input.signature);
  }

  verifyAndParseWebhook(
    headers: Record<string, string | string[] | undefined>,
    payload: any,
  ): ParsedWebhookEvent {
    const sigHeader = String(headers['stripe-signature'] || '');
    const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=')));
    const timestamp = parts.t || '';
    const v1 = parts.v1 || '';

    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest('hex');

    if (!safeCompareHex(expected, v1)) {
      throw new Error('Invalid Stripe webhook signature.');
    }

    const obj = payload?.data?.object || {};
    return {
      providerEventId: payload.id,
      eventType:
        payload.type === 'payment_intent.succeeded'
          ? 'PAYMENT_SUCCEEDED'
          : payload.type === 'payment_intent.payment_failed'
            ? 'PAYMENT_FAILED'
            : payload.type === 'charge.refunded'
              ? 'REFUND_PROCESSED'
              : 'UNKNOWN',
      gatewayTxId: obj.id,
      invoiceId: obj.metadata?.invoiceId,
      amount: Number(obj.amount || 0) / 100,
      failureReason: obj.last_payment_error?.message,
      raw: payload,
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      refundId: `re_stripe_${input.gatewayTxId}_${Date.now()}`,
      status: 'REFUNDED',
    };
  }
}
