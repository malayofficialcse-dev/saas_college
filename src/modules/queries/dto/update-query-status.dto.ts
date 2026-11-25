import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QueryStatus } from '@prisma/client';

export class UpdateQueryStatusDto {
  @ApiProperty({ enum: QueryStatus, example: QueryStatus.IN_PROGRESS })
  @IsEnum(QueryStatus)
  @IsNotEmpty()
  status: QueryStatus;

  @ApiProperty({ required: false, example: 'Investigating examination records with controller office' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
