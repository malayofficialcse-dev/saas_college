import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '@prisma/client';

export class UpsertPlanDto {
  @ApiProperty({ example: 'Professional' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'PROFESSIONAL', enum: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] })
  @IsString()
  @IsNotEmpty()
  tier: string;

  @ApiProperty({ example: 4999 })
  @IsNumber()
  @Min(0)
  priceMonthly: number;

  @ApiProperty({ example: 49990 })
  @IsNumber()
  @Min(0)
  priceYearly: number;

  @ApiProperty({ example: 5000 })
  @IsInt()
  studentLimit: number;

  @ApiProperty({ example: 250 })
  @IsInt()
  facultyLimit: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsInt()
  staffLimit?: number;

  @ApiProperty({ example: 10000, required: false, description: '-1 for unlimited' })
  @IsOptional()
  @IsInt()
  queryLimitMonthly?: number;

  @ApiProperty({ example: 51200, required: false })
  @IsOptional()
  @IsInt()
  storageLimitMb?: number;

  @ApiProperty({ example: 14, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiProperty({ example: 7, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @ApiProperty({
    example: {
      slaAutomation: true,
      knowledgeBase: true,
      customBranding: true,
      apiAccess: true,
      analyticsExport: true,
    },
  })
  @IsObject()
  featuresJson: Record<string, boolean>;
}

export class ChangePlanDto {
  @ApiProperty({ description: 'Target Plan UUID' })
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: BillingCycle, default: BillingCycle.MONTHLY })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}

export class CancelSubscriptionDto {
  @ApiProperty({ default: true, description: 'If true, cancels at end of current billing period' })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiProperty({ required: false, example: 'Switching to annual billing later' })
  @IsOptional()
  @IsString()
  reason?: string;
}
