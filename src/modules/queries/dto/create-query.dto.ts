import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QueryPriority } from '@prisma/client';

export class CreateQueryDto {
  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Department ID' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ example: 'Incorrect marks recorded on Semester 4 Grade Card' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'My grade for Cloud Computing was shown as B+ instead of A in the final sheet.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: QueryPriority, default: QueryPriority.MEDIUM })
  @IsOptional()
  @IsEnum(QueryPriority)
  priority?: QueryPriority;

  @ApiProperty({ required: false, type: [String], description: 'Optional uploaded attachment IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}
