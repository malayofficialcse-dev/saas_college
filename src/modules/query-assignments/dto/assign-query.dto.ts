import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignQueryDto {
  @ApiProperty({ description: 'Faculty / Staff User ID to assign' })
  @IsUUID()
  @IsNotEmpty()
  assignedToUserId: string;

  @ApiProperty({ required: false, example: 'Reassigned for subject specialization' })
  @IsOptional()
  @IsString()
  reason?: string;
}
