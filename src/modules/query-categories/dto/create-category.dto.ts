import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueryPriority } from '@prisma/client';

export class CreateQueryCategoryDto {
  @ApiPropertyOptional({ description: 'Optional mapped Department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ example: 'Hostel Maintenance' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'hostel-maintenance' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: 'Inquiries regarding hostel facilities, electricity, and water' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: QueryPriority, default: QueryPriority.MEDIUM })
  @IsOptional()
  @IsEnum(QueryPriority)
  defaultPriority?: QueryPriority;

  @ApiPropertyOptional({ example: 48, default: 48, description: 'Default SLA resolution time in hours' })
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSlaHours?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateQueryCategoryDto {
  @ApiPropertyOptional({ example: 'Hostel & Residential Facilities' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: QueryPriority })
  @IsOptional()
  @IsEnum(QueryPriority)
  defaultPriority?: QueryPriority;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSlaHours?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
