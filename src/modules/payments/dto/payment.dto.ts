import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Open Invoice UUID to pay' })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({ enum: ['SANDBOX', 'RAZORPAY', 'STRIPE'], default: 'SANDBOX' })
  @IsEnum(['SANDBOX', 'RAZORPAY', 'STRIPE'])
  gateway: 'SANDBOX' | 'RAZORPAY' | 'STRIPE';

  @ApiProperty({ example: 'idem_inv_001_attempt_1', description: 'Unique client idempotency key' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Payment record UUID' })
  @IsUUID()
  paymentId: string;

  @ApiProperty({ example: 'sbx_order_INV-2026-0001' })
  @IsString()
  @IsNotEmpty()
  gatewayOrderId: string;

  @ApiProperty({ example: 'sbx_pay_123456' })
  @IsString()
  @IsNotEmpty()
  gatewayPaymentId: string;

  @ApiProperty({ description: 'HMAC signature from payment gateway' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class RefundPaymentDto {
  @ApiProperty({ required: false, example: 1999, description: 'Partial or full refund amount; defaults to full' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({ required: false, example: 'Duplicate charge / college request' })
  @IsOptional()
  @IsString()
  reason?: string;
}
