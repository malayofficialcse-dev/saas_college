import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';

export class CreateArticleDto {
  @ApiProperty({ required: false, description: 'Linked Query Category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ required: false, description: 'Linked FAQ UUID' })
  @IsOptional()
  @IsUUID()
  relatedFaqId?: string;

  @ApiProperty({ example: 'how-to-apply-for-bonafide-certificate' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  slug: string;

  @ApiProperty({ example: 'How to Apply for a Bonafide Certificate' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ required: false, example: 'Step-by-step guide to requesting and downloading your bonafide certificate.' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ example: '## Prerequisites\n1. Active enrollment...\n## Steps\n1. Open Student Portal...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false, type: [String], example: ['certificates', 'bonafide', 'documents'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: ArticleStatus, default: ArticleStatus.DRAFT, required: false })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @ApiProperty({ required: false, example: 'Updated processing turnaround time to 2 business days' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  changeNote?: string;
}

export class ArticleFeedbackDto {
  @ApiProperty({ example: true, description: 'Whether the article was helpful' })
  @IsBoolean()
  isHelpful: boolean;

  @ApiProperty({ required: false, example: 'Clear instructions, solved my issue without opening a ticket!' })
  @IsOptional()
  @IsString()
  comment?: string;
}
