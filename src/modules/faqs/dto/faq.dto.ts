import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { FaqStatus, FaqVisibility } from '@prisma/client';

export class CreateFaqDto {
  @ApiProperty({ required: false, description: 'Linked Query Category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: 'How do I download my semester fee receipt?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ApiProperty({ example: 'Navigate to Accounts → Fee Receipts after payment confirmation to download PDF.' })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({ required: false, type: [String], example: ['fees', 'receipt', 'accounts'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: FaqVisibility, default: FaqVisibility.PUBLIC, required: false })
  @IsOptional()
  @IsEnum(FaqVisibility)
  visibility?: FaqVisibility;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ enum: FaqStatus, default: FaqStatus.DRAFT, required: false })
  @IsOptional()
  @IsEnum(FaqStatus)
  status?: FaqStatus;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}
