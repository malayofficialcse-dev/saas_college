import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QueryPriority } from '@prisma/client';

export class CreateSlaPolicyDto {
  @ApiProperty({ example: 'Urgent Exam Issue Policy' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: QueryPriority, example: QueryPriority.URGENT })
  @IsEnum(QueryPriority)
  priority: QueryPriority;

  @ApiProperty({ example: 4, description: 'Max hours before first response required' })
  @IsInt()
  @Min(1)
  firstResponseHours: number;

  @ApiProperty({ example: 24, description: 'Max hours for complete resolution' })
  @IsInt()
  @Min(1)
  resolutionHours: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  escalateOnBreach?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
