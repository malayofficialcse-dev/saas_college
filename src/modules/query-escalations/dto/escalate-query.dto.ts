import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EscalationTrigger } from '@prisma/client';

export class EscalateQueryDto {
  @ApiProperty({ description: 'User ID of higher authority (e.g. HOD / Principal)' })
  @IsUUID()
  @IsNotEmpty()
  escalatedToUserId: string;

  @ApiProperty({ enum: EscalationTrigger, example: EscalationTrigger.MANUAL_STAFF })
  @IsEnum(EscalationTrigger)
  triggerReason: EscalationTrigger;

  @ApiProperty({ required: false, example: 'Query unresolved after 48 hours and requires principal approval' })
  @IsOptional()
  @IsString()
  notes?: string;
}
